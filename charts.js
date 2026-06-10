/**
 * TwinFarm AIware — Chart.js Wrappers
 * JKUAT Digital Twin Capstone | Dr. Lawrence Nderu
 */

(function (global) {
    'use strict';

    const chartRegistry = {};

    function destroyChart(containerId) {
        if (chartRegistry[containerId]) {
            chartRegistry[containerId].destroy();
            delete chartRegistry[containerId];
        }
    }

    function getCanvas(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`[Charts] Container #${containerId} not found`);
            return null;
        }

        let canvas = container.querySelector('canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.setAttribute('role', 'img');
            container.appendChild(canvas);
        }
        return canvas;
    }

    function shapColor(value) {
        return value >= 0 ? 'rgba(46, 125, 50, 0.85)' : 'rgba(230, 57, 70, 0.85)';
    }

    function shapBorderColor(value) {
        return value >= 0 ? '#2E7D32' : '#E63946';
    }

    /**
     * Horizontal bar chart for SHAP feature contributions.
     * Green = positive impact, Red = negative impact.
     */
    function renderShapChart(containerId, shapValues) {
        const canvas = getCanvas(containerId);
        if (!canvas || typeof Chart === 'undefined') return null;

        destroyChart(containerId);

        const labels = ['Soil Moisture', 'Temperature', 'Humidity', 'Light'];
        const keys = ['soilMoisture', 'temperature', 'humidity', 'light'];
        const data = keys.map(k => Number(shapValues[k] ?? 0));
        const colors = data.map(shapColor);
        const borders = data.map(shapBorderColor);

        chartRegistry[containerId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'SHAP Contribution',
                    data,
                    backgroundColor: colors,
                    borderColor: borders,
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                const val = ctx.raw;
                                const direction = val >= 0 ? 'supports health' : 'reduces health';
                                return `${val >= 0 ? '+' : ''}${val.toFixed(3)} (${direction})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0,0,0,0.06)' },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 12, weight: '500' } }
                    }
                }
            }
        });

        return chartRegistry[containerId];
    }

    /**
     * Doughnut-style percentage gauge for biomass vs optimal.
     */
    function renderBiomassGauge(containerId, value, maxValue) {
        const canvas = getCanvas(containerId);
        if (!canvas || typeof Chart === 'undefined') return null;

        destroyChart(containerId);

        const safeMax = Math.max(maxValue, 1);
        const clamped = Math.min(Math.max(value, 0), safeMax);
        const percent = Math.round((clamped / safeMax) * 100);
        const remainder = 100 - percent;

        let gaugeColor = '#2E7D32';
        if (percent < 50) gaugeColor = '#E63946';
        else if (percent < 75) gaugeColor = '#FF9800';

        chartRegistry[containerId] = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Biomass', 'Remaining'],
                datasets: [{
                    data: [percent, remainder],
                    backgroundColor: [gaugeColor, '#E9ECEF'],
                    borderWidth: 0,
                    circumference: 270,
                    rotation: 225
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [{
                id: 'gaugeCenterText',
                afterDraw(chart) {
                    const { ctx, chartArea } = chart;
                    const centerX = (chartArea.left + chartArea.right) / 2;
                    const centerY = (chartArea.top + chartArea.bottom) / 2 + 8;

                    ctx.save();
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 28px Montserrat, sans-serif';
                    ctx.fillStyle = '#1A2B3C';
                    ctx.fillText(`${percent}%`, centerX, centerY - 8);
                    ctx.font = '12px Inter, sans-serif';
                    ctx.fillStyle = '#6C757D';
                    ctx.fillText(`${Math.round(clamped)}g / ${Math.round(safeMax)}g`, centerX, centerY + 18);
                    ctx.restore();
                }
            }]
        });

        return chartRegistry[containerId];
    }

    /**
     * Vertical bar chart for growth stage confidence across all 4 stages.
     */
    function renderGrowthConfidence(containerId, stages, confidences) {
        const canvas = getCanvas(containerId);
        if (!canvas || typeof Chart === 'undefined') return null;

        destroyChart(containerId);

        const stageLabels = ['Seed', 'Germinating', 'Seedling', 'Vegetative'];
        const stageKeys = ['seed', 'germinating', 'seedling', 'vegetative'];

        let data;
        if (confidences && typeof confidences === 'object' && !Array.isArray(confidences)) {
            data = stageKeys.map(k => Number((confidences[k] ?? 0) * 100));
        } else if (Array.isArray(confidences)) {
            data = confidences.map(v => Number(v) * (Number(v) <= 1 ? 100 : 1));
        } else {
            data = [5, 10, 25, 60];
        }

        const maxIdx = data.indexOf(Math.max(...data));
        const colors = stageKeys.map((_, i) =>
            i === maxIdx ? 'rgba(10, 123, 66, 0.9)' : 'rgba(10, 123, 66, 0.35)'
        );

        chartRegistry[containerId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: stages || stageLabels,
                datasets: [{
                    label: 'Confidence (%)',
                    data,
                    backgroundColor: colors,
                    borderColor: '#06582F',
                    borderWidth: 1,
                    borderRadius: 8,
                    maxBarThickness: 48
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(ctx) {
                                return `${ctx.raw.toFixed(1)}% confidence`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11, weight: '500' } }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(0,0,0,0.06)' },
                        ticks: {
                            callback(v) { return `${v}%`; },
                            font: { size: 11 }
                        }
                    }
                }
            }
        });

        return chartRegistry[containerId];
    }

    function destroyAllCharts() {
        Object.keys(chartRegistry).forEach(destroyChart);
    }

    global.TwinFarmCharts = {
        renderShapChart,
        renderBiomassGauge,
        renderGrowthConfidence,
        destroyChart,
        destroyAllCharts
    };
})(typeof window !== 'undefined' ? window : globalThis);
