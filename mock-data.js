// TwinFarm - Mock Data Engine
// Simulates real agricultural data for coriander farming

const MockData = {
    // Farm configuration
    farm: {
        name: "Green Valley Coriander Farm",
        location: { lat: -1.2921, lng: 36.8219, region: "Kiambu, Kenya" },
        totalArea: 54.2,
        corianderFields: 6,
        established: "2025"
    },
    
    // Coriander growth parameters
    corianderGrowth: {
        germination: { days: 7, tempMin: 15, tempMax: 25 },
        seedling: { days: 20, tempMin: 18, tempMax: 28 },
        vegetative: { days: 40, tempMin: 18, tempMax: 30 },
        flowering: { days: 25, tempMin: 20, tempMax: 32 },
        maturation: { days: 28, tempMin: 18, tempMax: 28 },
        totalDays: 120
    },
    
    // Generate realistic sensor reading
    getSensorReading: function(sensorType) {
        const time = new Date();
        const hour = time.getHours();
        
        const patterns = {
            soilMoisture: { base: 60, amplitude: 15, min: 35, max: 85 },
            temperature: { base: 23, amplitude: 5, min: 18, max: 32 },
            humidity: { base: 65, amplitude: 15, min: 45, max: 85 },
            ndvi: { base: 0.65, amplitude: 0.2, min: 0.3, max: 0.9 }
        };
        
        const p = patterns[sensorType] || { base: 50, amplitude: 10, min: 0, max: 100 };
        const dailyPattern = Math.sin((hour - 6) * Math.PI / 12);
        let value = p.base + (dailyPattern * p.amplitude) + (Math.random() * 4 - 2);
        return Math.min(p.max, Math.max(p.min, value));
    },
    
    // Calculate field health
    getFieldHealth: function(fieldId) {
        const baseHealth = 0.7 + Math.random() * 0.2;
        const daysSincePlanting = this.getDaysSince('2025-01-15');
        const growthProgress = Math.min(1, daysSincePlanting / 120);
        const healthFactor = 1 - Math.abs(growthProgress - 0.6) * 0.5;
        return Math.min(0.95, Math.max(0.3, baseHealth * healthFactor));
    },
    
    // Get days since date
    getDaysSince: function(dateString) {
        const start = new Date(dateString);
        const now = new Date();
        return Math.floor((now - start) / (1000 * 60 * 60 * 24));
    },
    
    // Predict yield for coriander
    predictYield: function(fieldId) {
        const health = this.getFieldHealth(fieldId);
        const seasonFactor = this.getSeasonFactor();
        const baseYield = 8.5;
        return (baseYield * health * seasonFactor).toFixed(1);
    },
    
    // Get seasonal factor
    getSeasonFactor: function() {
        const month = new Date().getMonth();
        const optimalMonths = [2, 3, 4, 9, 10]; // March-May, October-November
        return optimalMonths.includes(month) ? 1.1 : 0.95;
    },
    
    // Irrigation recommendation
    getIrrigationRecommendation: function(fieldId) {
        const moisture = this.getSensorReading('soilMoisture');
        if (moisture < 45) {
            return { amount: 1500, timing: "Immediately", priority: "High" };
        } else if (moisture < 55) {
            return { amount: 1000, timing: "Within 24 hours", priority: "Medium" };
        } else {
            return { amount: 500, timing: "In 48-72 hours", priority: "Low" };
        }
    },
    
    // Weather forecast
    getWeatherForecast: function(days = 7) {
        const forecast = [];
        for (let i = 0; i < days; i++) {
            forecast.push({
                day: i,
                tempHigh: 24 + Math.random() * 6,
                tempLow: 16 + Math.random() * 4,
                rain: Math.random() > 0.7 ? Math.random() * 15 : 0,
                condition: Math.random() > 0.8 ? "Rainy" : "Partly Cloudy"
            });
        }
        return forecast;
    }
};

// Make functions available globally
if (typeof window !== 'undefined') {
    window.MockData = MockData;
}

// Auto-update for real-time simulation
setInterval(() => {
    if (typeof updateDashboardValues === 'function') {
        updateDashboardValues();
    }
}, 10000);