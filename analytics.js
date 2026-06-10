/**
 * TwinFarm AIware — ML Analytics Orchestrator
 */

(function (global) {
    'use strict';

    let lastSnapshot = null;
    let refreshTimer = null;

    const BASELINE_ROWS = [
        { metric: 'Soil Moisture (%)', current: 75, optimal: 70 },
        { metric: 'Temperature (°C)', current: 23, optimal: 25 },
        { metric: 'Humidity (%)', current: 65, optimal: 65 },
        { metric: 'Light (lux)', current: 946, optimal: 1000 },
        { metric: 'Biomass (g)', current: 634, optimal: 850 }
    ];

    function getSensorSnapshot() {
        const ml = global.TwinFarmML;
        if (ml && typeof ml.getDefaultSensors === 'function') {
            return ml.getDefaultSensors();
        }
        return { soilMoisture: 75, temperature: 23, humidity: 65, light: 946, dayNumber: 30 };
    }

    function calcDeltaPct(current, optimal) {
        if (optimal === 0) return 0;
        return Math.round(((current - optimal) / optimal) * 1000) / 10;
    }

    function formatDelta(deltaPct) {
        const sign = deltaPct >= 0 ? '+' : '';
        return `${sign}${deltaPct}%`;
    }

    function deltaClass(deltaPct) {
        const abs = Math.abs(deltaPct);
        if (abs <= 10) return 'delta-good';
        if (abs <= 25) return 'delta-warn';
        return 'delta-bad';
    }

    function populateBaselineTable() {
        const tbody = document.getElementById('baseline-comparison-body');
        if (!tbody) return;

        tbody.innerHTML = BASELINE_ROWS.map((row) => {
            const deltaPct = calcDeltaPct(row.current, row.optimal);
            const delta = formatDelta(deltaPct);
            const cls = deltaClass(deltaPct);
            const currentDisplay = Number.isInteger(row.current) ? row.current : row.current.toFixed(1);
            const optimalDisplay = Number.isInteger(row.optimal) ? row.optimal : row.optimal.toFixed(1);

            return `
                <tr>
                    <td>${row.metric}</td>
                    <td>${currentDisplay}</td>
                    <td>${optimalDisplay}</td>
                    <td class="${cls}">${delta}</td>
                </tr>
            `;
        }).join('');
    }

    function updateAnalyticsCards(health, growth, biomass) {
        const healthStatusEl = document.getElementById('analytics-health-status');
        const healthConfEl = document.getElementById('analytics-health-confidence');
        const growthStageEl = document.getElementById('analytics-growth-stage');
        const growthConfEl = document.getElementById('analytics-growth-confidence');
        const biomassValueEl = document.getElementById('analytics-biomass-value');
        const biomassPctEl = document.getElementById('analytics-biomass-pct');
        const apiBadge = document.getElementById('ml-api-badge');

        if (healthStatusEl) {
            healthStatusEl.textContent = health.status;
            healthStatusEl.className = `analytics-badge status-${health.status.toLowerCase().replace(/\s+/g, '-')}`;
        }
        if (healthConfEl) {
            healthConfEl.textContent = `${Math.round(health.confidence * 100)}% confidence`;
        }
        if (growthStageEl) {
            growthStageEl.textContent = growth.stageLabel || growth.stage;
        }
        if (growthConfEl) {
            growthConfEl.textContent = `${Math.round(growth.confidence * 100)}% confidence`;
        }
        if (biomassValueEl) {
            biomassValueEl.textContent = `${biomass.biomass_g} g`;
        }
        if (biomassPctEl) {
            const pct = biomass.percentOfOptimal ?? biomass.percent_optimal ?? 74.6;
            biomassPctEl.textContent = `${pct}% of optimal (${biomass.baseline_g || 850}g target)`;
        }
        if (apiBadge) {
            const online = health.reachable !== false && growth.reachable !== false;
            apiBadge.textContent = online ? 'ML API Connected' : 'Offline Rule Engine';
            apiBadge.classList.toggle('offline', !online);
        }

        const sensorReadout = document.getElementById('analytics-sensor-readout');
        if (sensorReadout) {
            const sensors = getSensorSnapshot();
            sensorReadout.innerHTML = `
                <span><i class="fas fa-tint"></i> ${sensors.soilMoisture}% moisture</span>
                <span><i class="fas fa-thermometer-half"></i> ${sensors.temperature}°C</span>
                <span><i class="fas fa-water"></i> ${sensors.humidity}% humidity</span>
                <span><i class="fas fa-sun"></i> ${sensors.light} lux</span>
                <span><i class="fas fa-calendar-day"></i> Day 30 of 30</span>
            `;
        }
    }

    function renderAllCharts(health, growth, biomass) {
        const charts = global.TwinFarmCharts;
        if (!charts) return;

        charts.renderShapChart('shap-chart-container', health.shap || {});
        charts.renderBiomassGauge(
            'biomass-gauge-container',
            biomass.biomass_g,
            biomass.baseline_g || 850
        );
        charts.renderGrowthConfidence(
            'growth-confidence-container',
            ['Seed', 'Germinating', 'Seedling', 'Vegetative'],
            growth.allStages || {}
        );
    }

    async function refreshAnalytics() {
        const ml = global.TwinFarmML;
        if (!ml) {
            console.warn('[Analytics] TwinFarmML bridge not loaded');
            populateBaselineTable();
            return null;
        }

        const sensors = getSensorSnapshot();

        const [health, growth] = await Promise.all([
            ml.predictHealth({
                soilMoisture: sensors.soilMoisture,
                temperature: sensors.temperature,
                humidity: sensors.humidity,
                light: sensors.light
            }),
            ml.predictGrowth({
                soilMoisture: sensors.soilMoisture,
                temperature: sensors.temperature,
                humidity: sensors.humidity,
                dayNumber: 30
            })
        ]);

        const biomassWithStage = await ml.getBiomass({
            moisture: sensors.soilMoisture,
            light: sensors.light,
            stage: growth.stage,
            temp: sensors.temperature,
            humidity: sensors.humidity
        });

        if (!biomassWithStage.baseline_g) biomassWithStage.baseline_g = 850;
        if (!biomassWithStage.percentOfOptimal && biomassWithStage.percent_optimal) {
            biomassWithStage.percentOfOptimal = biomassWithStage.percent_optimal;
        }

        lastSnapshot = { sensors, health, growth, biomass: biomassWithStage };

        updateAnalyticsCards(health, growth, biomassWithStage);
        populateBaselineTable();
        renderAllCharts(health, growth, biomassWithStage);

        global.TwinFarmAnalyticsLastSnapshot = lastSnapshot;
        return lastSnapshot;
    }

    function startAutoRefresh(intervalMs) {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => refreshAnalytics(), intervalMs || 15000);
    }

    function stopAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    function initAnalytics() {
        const section = document.getElementById('analytics');
        if (!section) return;

        populateBaselineTable();
        refreshAnalytics();
        startAutoRefresh(15000);

        const refreshBtn = document.getElementById('analytics-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.disabled = true;
                refreshAnalytics().finally(() => {
                    refreshBtn.disabled = false;
                });
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAutoRefresh();
            } else {
                refreshAnalytics();
                startAutoRefresh(15000);
            }
        });
    }

    global.TwinFarmAnalytics = {
        init: initAnalytics,
        refresh: refreshAnalytics,
        getLastSnapshot: () => lastSnapshot,
        getSensorSnapshot,
        startAutoRefresh,
        stopAutoRefresh
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnalytics);
    } else {
        initAnalytics();
    }
})(typeof window !== 'undefined' ? window : globalThis);
