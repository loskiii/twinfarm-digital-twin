const { loadFarmState, saveFarmState } = require('./db');
const PLANTING_DATE = '2025-01-15';
const TOTAL_GROWTH_DAYS = 120;
const GROWTH_STAGES = ['Germination', 'Seedling', 'Vegetative', 'Flowering', 'Maturation'];

const FIELD_SEED = [
    { id: 'north', name: 'North Field', lat: -1.2921, lng: 36.8219, area: 8.5, health: 0.85, moisture: 72, ndvi: 0.78 },
    { id: 'east', name: 'East Field', lat: -1.2881, lng: 36.8259, area: 10.2, health: 0.65, moisture: 58, ndvi: 0.52 },
    { id: 'south', name: 'South Field', lat: -1.2961, lng: 36.8179, area: 7.5, health: 0.92, moisture: 78, ndvi: 0.85 },
    { id: 'west', name: 'West Field', lat: -1.2901, lng: 36.8139, area: 6.8, health: 0.48, moisture: 35, ndvi: 0.35 },
    { id: 'central', name: 'Central Field', lat: -1.2941, lng: 36.8299, area: 12.0, health: 0.78, moisture: 65, ndvi: 0.68 },
    { id: 'irrigation', name: 'Irrigation Field', lat: -1.2911, lng: 36.8199, area: 9.2, health: 0.72, moisture: 62, ndvi: 0.71 }
];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function round(value, digits = 1) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

function daysSince(dateString) {
    const start = new Date(dateString);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

function getGrowthStage(days) {
    const index = clamp(Math.floor(days / 25), 0, GROWTH_STAGES.length - 1);
    return {
        stage: GROWTH_STAGES[index],
        stageIndex: index,
        daysToHarvest: Math.max(0, TOTAL_GROWTH_DAYS - days)
    };
}

function moistureStatus(value) {
    if (value > 60) return 'Optimal for coriander';
    if (value > 40) return 'Moderate - consider irrigation';
    return 'Low - irrigation needed';
}

function tempStatus(value) {
    if (value >= 18 && value <= 28) return 'Ideal for coriander';
    if (value < 18) return 'Cool - growth may slow';
    return 'Warm - monitor for bolting';
}

function healthStatus(score) {
    if (score > 7) return 'Good condition';
    if (score > 4) return 'Monitor closely';
    return 'Needs attention';
}

function ndviStatus(value) {
    if (value > 0.6) return 'Healthy vegetation';
    if (value > 0.4) return 'Moderate stress';
    return 'High stress';
}

function healthColor(health) {
    if (health > 0.7) return '#4CAF50';
    if (health > 0.4) return '#FF9800';
    return '#F44336';
}

class FarmSimulator {
    constructor() {
        this.state = null;
        this.tickCount = 0;
        this.startedAt = new Date().toISOString();
    }

    async init() {
        const saved = loadFarmState();
        if (saved) {
            this.state = saved;
            this.state.meta = this.state.meta || {};
            this.state.meta.restored = true;
        } else {
            this.state = this.createInitialState();
        }
        return this.state;
    }

    createInitialState() {
        const days = daysSince(PLANTING_DATE);
        const growth = getGrowthStage(days);

        return {
            meta: {
                source: 'simulated',
                plantingDate: PLANTING_DATE,
                startedAt: this.startedAt,
                restored: false
            },
            updatedAt: new Date().toISOString(),
            farm: {
                name: 'Green Valley Coriander Farm',
                location: { lat: -1.2921, lng: 36.8219, region: 'Kiambu, Kenya' },
                totalArea: 54.2,
                fieldCount: FIELD_SEED.length
            },
            dashboard: {
                soilMoisture: 68,
                soilMoistureStatus: moistureStatus(68),
                cropHealth: 8.1,
                cropHealthStatus: healthStatus(8.1),
                soilTemperature: 23,
                soilTempStatus: tempStatus(23),
                humidity: 65,
                growthStage: growth.stage,
                stageIndex: growth.stageIndex,
                daysToHarvest: growth.daysToHarvest
            },
            weather: this.buildWeatherSeries(23, 65),
            fields: FIELD_SEED.map((field) => this.buildFieldSnapshot(field)),
            predictions: this.buildPredictions(FIELD_SEED, 68, growth.daysToHarvest),
            sensors: [
                { id: 'soil-moisture', name: 'Soil Moisture Sensor', status: 'active', type: 'hardware' },
                { id: 'temperature', name: 'Temperature Sensor', status: 'active', type: 'hardware' },
                { id: 'ndvi', name: 'NDVI Satellite Data', status: 'simulated', type: 'satellite' },
                { id: 'weather', name: 'Weather API', status: 'active', type: 'api' }
            ]
        };
    }

    buildFieldSnapshot(field) {
        const yieldValue = round(5 + field.health * 4, 1);
        return {
            ...field,
            health: round(field.health, 2),
            moisture: round(field.moisture, 0),
            ndvi: round(field.ndvi, 2),
            ndviStatus: ndviStatus(field.ndvi),
            predictedYield: yieldValue,
            waterNeed: Math.round(800 + (1 - field.moisture / 100) * 700),
            color: healthColor(field.health)
        };
    }

    buildWeatherSeries(temperature, humidity) {
        const hours = [6, 9, 12, 15, 18, 21];
        const labels = ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'];
        const currentHour = new Date().getHours();

        return {
            labels,
            temperature: hours.map((hour) => {
                const wave = Math.sin(((hour - 6) / 12) * Math.PI);
                return round(temperature - 4 + wave * 6 + (hour === currentHour ? 0.5 : 0), 0);
            }),
            humidity: hours.map((hour) => {
                const wave = Math.sin(((hour - 6) / 12) * Math.PI);
                return round(humidity + 8 - wave * 14, 0);
            })
        };
    }

    buildPredictions(fields, avgMoisture, daysToHarvest) {
        const avgHealth = fields.reduce((sum, field) => sum + field.health, 0) / fields.length;
        const avgNdvi = fields.reduce((sum, field) => sum + field.ndvi, 0) / fields.length;
        const yieldValue = round(6 + avgHealth * 3 + avgNdvi * 2, 1);
        const confidence = Math.round(clamp(72 + avgHealth * 20, 70, 95));

        let irrigationLiters = 1250;
        let irrigationHours = 48;
        if (avgMoisture < 45) {
            irrigationLiters = 1500;
            irrigationHours = 6;
        } else if (avgMoisture < 55) {
            irrigationLiters = 1100;
            irrigationHours = 24;
        } else if (avgMoisture > 75) {
            irrigationLiters = 650;
            irrigationHours = 72;
        }

        return {
            yield: yieldValue,
            yieldConfidence: confidence,
            irrigationLitersPerDay: irrigationLiters,
            irrigationNextHours: irrigationHours,
            harvestDays: daysToHarvest,
            harvestRange: `${Math.max(0, daysToHarvest - 4)}-${daysToHarvest + 4} days`
        };
    }

    randomDrift(current, amount, min, max) {
        const delta = (Math.random() - 0.5) * amount;
        return clamp(current + delta, min, max);
    }

    tick() {
        const now = new Date();
        const hour = now.getHours();
        const dayWave = Math.sin(((hour - 6) / 12) * Math.PI);
        const days = daysSince(PLANTING_DATE);
        const growth = getGrowthStage(days);

        let soilTemperature = this.state.dashboard.soilTemperature;
        soilTemperature = this.randomDrift(
            21 + dayWave * 5 + (soilTemperature - (21 + dayWave * 5)) * 0.35,
            0.8,
            16,
            33
        );

        let humidity = this.state.dashboard.humidity;
        humidity = this.randomDrift(62 - dayWave * 10, 2.5, 40, 90);

        let soilMoisture = this.state.dashboard.soilMoisture;
        const evaporation = dayWave > 0 ? 0.35 + dayWave * 0.25 : -0.1;
        soilMoisture = this.randomDrift(soilMoisture - evaporation, 0.8, 30, 88);

        this.state.fields = this.state.fields.map((field) => {
            let moisture = this.randomDrift(field.moisture - evaporation * 0.8, 1.2, 25, 92);
            let health = field.health;

            if (moisture < 40) {
                health = this.randomDrift(health - 0.01, 0.004, 0.25, 0.98);
            } else if (moisture >= 55 && moisture <= 78) {
                health = this.randomDrift(health + 0.004, 0.003, 0.25, 0.98);
            } else if (moisture > 82) {
                health = this.randomDrift(health - 0.006, 0.004, 0.25, 0.98);
            } else {
                health = this.randomDrift(health, 0.003, 0.25, 0.98);
            }

            let ndvi = this.randomDrift(field.ndvi + (health - field.health) * 0.4, 0.02, 0.2, 0.95);
            ndvi = clamp(ndvi * 0.9 + health * 0.1, 0.2, 0.95);

            if (moisture < 38 && Math.random() < 0.08) {
                moisture = clamp(moisture + 8 + Math.random() * 6, 30, 92);
            }

            return this.buildFieldSnapshot({
                ...field,
                health: round(health, 2),
                moisture: round(moisture, 0),
                ndvi: round(ndvi, 2)
            });
        });

        const avgFieldMoisture = this.state.fields.reduce((sum, field) => sum + field.moisture, 0) / this.state.fields.length;
        const avgHealth = this.state.fields.reduce((sum, field) => sum + field.health, 0) / this.state.fields.length;
        const avgNdvi = this.state.fields.reduce((sum, field) => sum + field.ndvi, 0) / this.state.fields.length;
        const cropHealthScore = round(avgHealth * 10, 1);

        this.state.dashboard = {
            soilMoisture: round(avgFieldMoisture * 0.55 + soilMoisture * 0.45, 0),
            soilMoistureStatus: moistureStatus(avgFieldMoisture),
            cropHealth: cropHealthScore,
            cropHealthStatus: healthStatus(cropHealthScore),
            soilTemperature: round(soilTemperature, 0),
            soilTempStatus: tempStatus(soilTemperature),
            humidity: round(humidity, 0),
            growthStage: growth.stage,
            stageIndex: growth.stageIndex,
            daysToHarvest: growth.daysToHarvest,
            averageNdvi: round(avgNdvi, 2)
        };

        this.state.weather = this.buildWeatherSeries(soilTemperature, humidity);
        this.state.predictions = this.buildPredictions(this.state.fields, avgFieldMoisture, growth.daysToHarvest);
        this.state.updatedAt = new Date().toISOString();
        this.state.sensors = this.state.sensors.map((sensor) => ({
            ...sensor,
            lastReadingAt: this.state.updatedAt
        }));

        this.tickCount += 1;
        return this.getPublicState();
    }

    getPublicState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    async persist() {
        saveFarmState(this.state);
    }
}

let simulatorInstance = null;
let tickTimer = null;

async function startFarmSimulator(options = {}) {
    const intervalMs = options.intervalMs || 5000;
    const persistEvery = options.persistEvery || 12;

    simulatorInstance = new FarmSimulator();
    await simulatorInstance.init();
    simulatorInstance.tick();

    tickTimer = setInterval(async () => {
        simulatorInstance.tick();
        if (simulatorInstance.tickCount % persistEvery === 0) {
            try {
                await simulatorInstance.persist();
            } catch (error) {
                console.error('Failed to persist farm state:', error.message);
            }
        }
    }, intervalMs);

    return simulatorInstance;
}

function getFarmSimulator() {
    return simulatorInstance;
}

function stopFarmSimulator() {
    if (tickTimer) clearInterval(tickTimer);
}

module.exports = {
    startFarmSimulator,
    getFarmSimulator,
    stopFarmSimulator
};
