/**
 * TwinFarm AIware — ML API Bridge
 * JKUAT Digital Twin Capstone | Dr. Lawrence Nderu
 */

(function (global) {
    'use strict';

    const ML_API_BASE = 'http://localhost:5000';
    const REQUEST_TIMEOUT_MS = 8000;
    const DATASET_HOURS = 720;
    const MAX_DAY = 30;

    const OPTIMAL_BASELINE = {
        moisture: 70,
        temp: 25,
        humidity: 65,
        light: 1000,
        biomass_target: 850
    };

    const STAGE_SCORES = {
        seed: 0.1,
        germinating: 0.3,
        seedling: 0.6,
        vegetative: 1.0
    };

    /**
     * Day number from 30-day hourly dataset (720 rows), capped at Day 30.
     */
    function getCapDayNumber(hourIndex) {
        const index = hourIndex != null
            ? Number(hourIndex)
            : Math.floor(Date.now() / 3600000) % DATASET_HOURS;
        const day = Math.floor(index / 24) + 1;
        return Math.min(MAX_DAY, Math.max(1, day));
    }

    function getDefaultSensors() {
        return {
            soilMoisture: 75,
            temperature: 23,
            humidity: 65,
            light: 946,
            dayNumber: 30
        };
    }

    async function mlFetch(path, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(`${ML_API_BASE}${path}`, {
                ...options,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            });

            if (!response.ok) {
                throw new Error(`ML API ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } finally {
            clearTimeout(timer);
        }
    }

    function normalizeBiomass(result) {
        const percent = result.percentOfOptimal ?? result.percent_optimal ?? 74.6;
        const biomassG = Number(result.biomass_g ?? 634);
        return {
            ...result,
            biomass_g: biomassG,
            percentOfOptimal: percent,
            percent_optimal: percent,
            baseline_g: Number(result.baseline_g ?? OPTIMAL_BASELINE.biomass_target)
        };
    }

    function fallbackHealth({ soilMoisture, temperature, humidity, light }) {
        return {
            status: 'Moderate Stress',
            confidence: 0.82,
            shap: {
                soilMoisture: roundShap((soilMoisture - 75) / 100),
                temperature: roundShap((temperature - 25) / 100),
                humidity: roundShap((humidity - 65) / 100),
                light: roundShap((light - 1000) / 10000)
            },
            source: 'offline_fallback'
        };
    }

    function roundShap(value) {
        return Math.round(Number(value) * 10000) / 10000;
    }

    function dayBasedStage(dayNumber) {
        const day = Number(dayNumber);
        if (day <= 7) return 'seed';
        if (day <= 14) return 'germinating';
        if (day <= 21) return 'seedling';
        return 'vegetative';
    }

    function stageLabelFromKey(stage) {
        const labels = {
            seed: 'Seed',
            germinating: 'Germinating',
            seedling: 'Seedling',
            vegetative: 'Vegetative'
        };
        return labels[String(stage).toLowerCase()] || 'Vegetative';
    }

    function stageDistribution(primary, confidence) {
        const stages = ['seed', 'germinating', 'seedling', 'vegetative'];
        const result = {};
        const share = roundShap((1 - confidence) / (stages.length - 1));
        stages.forEach((s) => {
            result[s] = s === primary ? confidence : share;
        });
        return result;
    }

    function fallbackGrowth({ dayNumber }) {
        const stage = dayBasedStage(dayNumber);
        const confidence = 0.79;

        return {
            stage,
            stageLabel: stageLabelFromKey(stage),
            confidence,
            allStages: stageDistribution(stage, confidence),
            source: 'offline_fallback'
        };
    }

    function fallbackBiomass({ moisture, light, stage }) {
        const score = STAGE_SCORES[stage] ?? STAGE_SCORES.vegetative;
        const biomass_g = Math.round(
            ((0.4 * moisture / 100) + (0.4 * light / 1000) + (0.2 * score)) * OPTIMAL_BASELINE.biomass_target * 100
        ) / 100;
        const percentOfOptimal = Math.round((biomass_g / OPTIMAL_BASELINE.biomass_target) * 10000) / 100;

        return normalizeBiomass({
            biomass_g,
            percentOfOptimal,
            baseline_g: OPTIMAL_BASELINE.biomass_target,
            source: 'offline_fallback'
        });
    }

    async function predictHealth(payload) {
        const normalized = {
            soilMoisture: Number(payload?.soilMoisture ?? 70),
            temperature: Number(payload?.temperature ?? 25),
            humidity: Number(payload?.humidity ?? 65),
            light: Number(payload?.light ?? 1000)
        };

        try {
            const result = await mlFetch('/api/ml/health', {
                method: 'POST',
                body: JSON.stringify(normalized)
            });
            return { ...result, reachable: true };
        } catch (error) {
            console.warn('[ML Bridge] Health API unreachable:', error.message);
            return { ...fallbackHealth(normalized), reachable: false };
        }
    }

    async function predictGrowth(payload) {
        const normalized = {
            soilMoisture: Number(payload?.soilMoisture ?? 70),
            temperature: Number(payload?.temperature ?? 25),
            humidity: Number(payload?.humidity ?? 65),
            dayNumber: Number(payload?.dayNumber ?? getCapDayNumber())
        };

        try {
            const result = await mlFetch('/api/ml/growth', {
                method: 'POST',
                body: JSON.stringify(normalized)
            });
            if (!result.stageLabel) {
                result.stageLabel = stageLabelFromKey(result.stage);
            }
            return { ...result, reachable: true };
        } catch (error) {
            console.warn('[ML Bridge] Growth API unreachable:', error.message);
            return { ...fallbackGrowth(normalized), reachable: false };
        }
    }

    async function getBiomass(params) {
        const moisture = Number(params?.moisture ?? 70);
        const light = Number(params?.light ?? 1000);
        const stage = String(params?.stage ?? 'vegetative');

        const query = new URLSearchParams({
            moisture: String(moisture),
            light: String(light),
            stage
        });

        try {
            const result = await mlFetch(`/api/ml/biomass?${query.toString()}`, {
                method: 'GET'
            });
            return { ...normalizeBiomass(result), reachable: true };
        } catch (error) {
            console.warn('[ML Bridge] Biomass API unreachable:', error.message);
            const fallback = fallbackBiomass({ moisture, light, stage });
            return { ...fallback, reachable: false };
        }
    }

    async function fetchHealthStatus(payload) {
        return predictHealth(payload || getDefaultSensors());
    }

    async function fetchGrowthStage(payload) {
        return predictGrowth(payload || getDefaultSensors());
    }

    async function fetchBiomass(params) {
        const sensors = getDefaultSensors();
        const growth = await fetchGrowthStage(sensors);
        return getBiomass({
            moisture: params?.moisture ?? sensors.soilMoisture,
            light: params?.light ?? sensors.light,
            stage: params?.stage ?? growth.stage,
            temp: params?.temp ?? sensors.temperature,
            humidity: params?.humidity ?? sensors.humidity
        });
    }

    async function checkMlApiStatus() {
        try {
            await mlFetch('/health', { method: 'GET' });
            return { online: true, service: 'TwinFarm ML API' };
        } catch {
            return { online: false, service: 'TwinFarm ML API (offline)' };
        }
    }

    global.TwinFarmML = {
        ML_API_BASE,
        OPTIMAL_BASELINE,
        MAX_DAY,
        getCapDayNumber,
        getDefaultSensors,
        predictHealth,
        predictGrowth,
        getBiomass,
        fetchHealthStatus,
        fetchGrowthStage,
        fetchBiomass,
        checkMlApiStatus,
        fallbackHealth,
        fallbackGrowth,
        fallbackBiomass
    };
})(typeof window !== 'undefined' ? window : globalThis);
