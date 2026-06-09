/**
 * TwinFarm AI Farming Assistant
 * Rule-based knowledge engine with live dashboard context.
 */
const TwinFarmAssistant = {
    getContext() {
        const text = (id) => document.getElementById(id)?.textContent?.trim() || '';
        return {
            soilMoisture: text('soil-moisture-value'),
            soilStatus: text('soil-status'),
            cropHealth: text('crop-health-value'),
            healthStatus: text('health-status'),
            soilTemp: text('soil-temp-value'),
            tempStatus: text('temp-status'),
            growthStage: text('growth-stage-value'),
            daysToHarvest: text('days-to-harvest'),
            yieldPrediction: text('yield-prediction'),
            yieldConfidence: text('yield-confidence-text'),
            irrigationAmount: text('irrigation-amount'),
            irrigationTime: text('irrigation-time'),
            harvestDays: text('harvest-days'),
            harvestRange: text('harvest-range'),
            avgNdvi: text('avg-ndvi'),
            userName: text('user-name'),
            loggedIn: document.body.classList.contains('logged-in')
        };
    },

    normalize(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    scoreTopic(query, topic) {
        const q = this.normalize(query);
        let score = 0;

        for (const keyword of topic.keywords) {
            if (q.includes(keyword)) {
                score += keyword.split(' ').length;
            }
        }

        if (topic.patterns) {
            for (const pattern of topic.patterns) {
                if (pattern.test(q)) score += 2;
            }
        }

        return score;
    },

    topics: [
        {
            id: 'greeting',
            keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'],
            respond(query, ctx) {
                const name = ctx.loggedIn && ctx.userName !== 'Farmer' ? `, ${ctx.userName}` : '';
                return `Hello${name}! I'm the TwinFarm assistant. I can help with coriander care, your live field data, irrigation, harvest timing, NDVI, pests, and how to use this platform. What would you like to know?`;
            }
        },
        {
            id: 'thanks',
            keywords: ['thank', 'thanks', 'appreciate', 'helpful'],
            respond() {
                return "You're welcome! Ask anytime about your coriander fields, predictions, or TwinFarm features.";
            }
        },
        {
            id: 'help',
            keywords: ['help', 'what can you', 'how do you work', 'what do you know', 'capabilities'],
            patterns: [/what can i ask/i, /how can you help/i],
            respond() {
                return `I can answer questions about:
• <strong>Live farm data</strong> — soil moisture, crop health, temperature, growth stage
• <strong>Coriander farming</strong> — planting, irrigation, fertilizer, pests, diseases, harvest
• <strong>NDVI & yield</strong> — satellite health index and production forecasts
• <strong>TwinFarm tools</strong> — 3D farm, dashboard, predictions, field map, and sign-in

Try asking: "What is my soil moisture?" or "When should I harvest coriander?"`;
            }
        },
        {
            id: 'soil_moisture',
            keywords: ['soil moisture', 'moisture level', 'how wet', 'how dry', 'water content', 'dry soil', 'wet soil'],
            patterns: [/optimal.*moisture/i, /moisture.*coriander/i],
            respond(query, ctx) {
                const live = ctx.soilMoisture ? ` Your dashboard currently shows <strong>${ctx.soilMoisture}</strong> (${ctx.soilStatus}).` : '';
                return `Coriander grows best with soil moisture around <strong>60–75%</strong>. Below 45% stresses the crop; above 80% risks root rot.${live} Irrigate when moisture drops below 55%, preferably in the early morning.`;
            }
        },
        {
            id: 'irrigation',
            keywords: ['irrigation', 'watering', 'water schedule', 'how much water', 'when to water', 'drip', 'sprinkler'],
            patterns: [/irrigate/i, /water my/i],
            respond(query, ctx) {
                const live = ctx.irrigationAmount
                    ? ` TwinFarm recommends about <strong>${ctx.irrigationAmount} liters/day</strong>, with next irrigation in <strong>${ctx.irrigationTime}</strong>.`
                    : '';
                return `Irrigate coriander when soil moisture falls below 55%. Use light, frequent watering rather than heavy flooding — coriander roots are shallow.${live} Drip irrigation saves 30–40% water compared to flood irrigation.`;
            }
        },
        {
            id: 'yield',
            keywords: ['yield', 'production', 'tons per hectare', 'how much harvest', 'output', 'productivity'],
            patterns: [/tons\/ha/i, /yield prediction/i],
            respond(query, ctx) {
                const live = ctx.yieldPrediction
                    ? ` Current AI prediction: <strong>${ctx.yieldPrediction} tons/ha</strong> (${ctx.yieldConfidence} confidence).`
                    : '';
                return `Coriander typically yields <strong>6–10 tons/ha</strong> under good management in Kenya.${live} Yield depends on soil moisture, temperature (18–28°C), NDVI health, and timely harvest. Check the Predictions section to run simulations.`;
            }
        },
        {
            id: 'harvest',
            keywords: ['harvest', 'when to pick', 'when to cut', 'harvesting', 'ready to harvest', 'harvest time', 'harvest window'],
            patterns: [/when should i harvest/i, /days to harvest/i],
            respond(query, ctx) {
                const live = ctx.harvestDays
                    ? ` Your fields show harvest in about <strong>${ctx.harvestDays} days</strong> (optimal window: ${ctx.harvestRange}).`
                    : '';
                return `Coriander is usually ready <strong>90–120 days</strong> after planting, when plants are 15–25 cm tall and before heavy flowering.${live} Harvest in the cool morning for best leaf quality and aroma.`;
            }
        },
        {
            id: 'ndvi',
            keywords: ['ndvi', 'vegetation index', 'satellite', 'remote sensing', 'crop index'],
            patterns: [/how is ndvi/i, /what is ndvi/i],
            respond(query, ctx) {
                const live = ctx.avgNdvi ? ` Your farm average NDVI is <strong>${ctx.avgNdvi}</strong>.` : '';
                return `NDVI measures vegetation health from satellite imagery: <strong>NDVI = (NIR − Red) / (NIR + Red)</strong>. Scale: 0 (bare soil) to 1 (dense vegetation). For coriander: below 0.4 = stressed, 0.4–0.6 = moderate, above 0.6 = healthy.${live} See the NDVI Field Map for per-field detail.`;
            }
        },
        {
            id: 'temperature',
            keywords: ['temperature', 'temp', 'heat', 'cold', 'soil temperature', 'weather temp', 'too hot', 'too cold'],
            respond(query, ctx) {
                const live = ctx.soilTemp
                    ? ` Current soil temperature: <strong>${ctx.soilTemp}</strong> (${ctx.tempStatus}).`
                    : '';
                return `Coriander prefers <strong>18–28°C</strong>. Germination slows below 15°C; above 32°C plants may bolt (flower early) and leaves become bitter.${live} Mulching helps stabilize soil temperature in hot Kenyan afternoons.`;
            }
        },
        {
            id: 'crop_health',
            keywords: ['crop health', 'plant health', 'field health', 'health score', 'how healthy', 'condition'],
            respond(query, ctx) {
                const live = ctx.cropHealth
                    ? ` Dashboard crop health: <strong>${ctx.cropHealth}</strong> — ${ctx.healthStatus}.`
                    : '';
                return `Crop health combines soil moisture, temperature, NDVI, and growth stage data.${live} Scores above 7/10 are good; below 4/10 needs urgent attention. Check the 3D farm — green fields are healthy, red fields need care.`;
            }
        },
        {
            id: 'yellowing',
            keywords: ['yellow', 'yellowing', 'yellow leaves', 'chlorosis', 'pale leaves', 'leaf colour', 'leaf color'],
            patterns: [/leaves turning/i, /why are my leaves/i],
            respond() {
                return `Yellow coriander leaves are usually caused by:
1. <strong>Overwatering</strong> — roots suffocate; let soil dry slightly between watering
2. <strong>Nitrogen deficiency</strong> — apply balanced NPK during vegetative stage
3. <strong>Root rot</strong> — improve drainage; avoid waterlogging
4. <strong>Heat stress</strong> — provide shade cloth during peak midday sun

Check soil moisture on your dashboard first — it's the most common cause.`;
            }
        },
        {
            id: 'pests_disease',
            keywords: ['pest', 'disease', 'aphid', 'fungus', 'mildew', 'rot', 'wilt', 'insect', 'bug', 'blight'],
            patterns: [/sick plant/i, /dying plant/i],
            respond() {
                return `Common coriander issues in Kenya:
• <strong>Aphids</strong> — spray neem oil or insecticidal soap early morning
• <strong>Powdery mildew</strong> — improve airflow, reduce leaf wetness, use sulfur-based fungicide
• <strong>Root rot</strong> — caused by waterlogging; improve drainage immediately
• <strong>Leaf spot</strong> — remove affected leaves, avoid overhead irrigation

Prevention: crop rotation, proper spacing (15–20 cm), and monitoring NDVI for early stress signals.`;
            }
        },
        {
            id: 'fertilizer',
            keywords: ['fertilizer', 'fertiliser', 'npk', 'nutrient', 'compost', 'manure', 'feeding', 'nitrogen'],
            respond() {
                return `Coriander fertilizer guide:
• <strong>At planting:</strong> well-decomposed compost or farmyard manure (5–10 t/ha)
• <strong>Vegetative stage:</strong> balanced NPK (e.g. 17-17-17) at 50 kg/ha
• <strong>Avoid excess nitrogen</strong> late in growth — it reduces essential oil content

Soil tests every season help tailor application. Organic options work well for export-quality coriander.`;
            }
        },
        {
            id: 'planting',
            keywords: ['plant', 'planting', 'seed', 'sowing', 'germination', 'spacing', 'how to grow', 'cultivation'],
            patterns: [/when to plant/i, /how to plant/i],
            respond() {
                return `Coriander planting tips for Kenya:
• <strong>Season:</strong> March–May and October–November are ideal
• <strong>Spacing:</strong> 15–20 cm between plants, 30 cm between rows
• <strong>Depth:</strong> sow seeds 1–2 cm deep; germination in 7–10 days
• <strong>Soil:</strong> well-drained loam, pH 6.0–7.5
• <strong>Water:</strong> keep soil moist (not soggy) until seedlings establish

Your dashboard tracks growth stage from germination through maturation.`;
            }
        },
        {
            id: 'growth_stage',
            keywords: ['growth stage', 'vegetative', 'flowering', 'seedling', 'maturation', 'germination', 'life cycle'],
            respond(query, ctx) {
                const live = ctx.growthStage
                    ? ` Your crop is currently in the <strong>${ctx.growthStage}</strong> stage (${ctx.daysToHarvest} days to harvest).`
                    : '';
                return `Coriander growth stages: <strong>Germination</strong> (7 days) → <strong>Seedling</strong> (20 days) → <strong>Vegetative</strong> (40 days) → <strong>Flowering</strong> (25 days) → <strong>Maturation</strong> (28 days). Total ~120 days.${live}`;
            }
        },
        {
            id: 'weather',
            keywords: ['weather', 'rain', 'rainfall', 'forecast', 'climate', 'humidity', 'drought'],
            respond() {
                return `Weather affects coriander significantly:
• <strong>Rain:</strong> reduce irrigation after rainfall; watch for waterlogging
• <strong>Heat (>32°C):</strong> plants may bolt — harvest earlier or use shade
• <strong>Humidity >80%:</strong> increases mildew risk

Check the Weather Forecast chart on your dashboard for temperature and humidity trends.`;
            }
        },
        {
            id: '3d_farm',
            keywords: ['3d', 'virtual farm', 'digital twin', 'three d', 'rotate', 'simulation', '3d farm'],
            patterns: [/how do i use the 3d/i],
            respond() {
                return `The 3D Digital Twin shows your coriander fields with realistic terrain and plants:
• <strong>Desktop:</strong> drag to rotate, right-click to pan, scroll to zoom
• <strong>Mobile:</strong> one finger to rotate, two fingers to pan and zoom
• <strong>Click a field</strong> to see health, moisture, area, and predicted yield
• Use control buttons to reset camera, toggle shadows, or wireframe view`;
            }
        },
        {
            id: 'dashboard',
            keywords: ['dashboard', 'sensor reading', 'live data', 'real time', 'monitoring', 'my farm data'],
            patterns: [/what is my/i, /show me my/i, /current data/i],
            respond(query, ctx) {
                if (/moisture/i.test(query) && ctx.soilMoisture) {
                    return `Your soil moisture is <strong>${ctx.soilMoisture}</strong> — ${ctx.soilStatus}.`;
                }
                if (/health/i.test(query) && ctx.cropHealth) {
                    return `Your crop health is <strong>${ctx.cropHealth}</strong> — ${ctx.healthStatus}.`;
                }
                if (/temperature|temp/i.test(query) && ctx.soilTemp) {
                    return `Your soil temperature is <strong>${ctx.soilTemp}</strong> — ${ctx.tempStatus}.`;
                }
                return `Your live dashboard readings:
• Soil moisture: <strong>${ctx.soilMoisture || '—'}</strong>
• Crop health: <strong>${ctx.cropHealth || '—'}</strong>
• Soil temperature: <strong>${ctx.soilTemp || '—'}</strong>
• Growth stage: <strong>${ctx.growthStage || '—'}</strong> (${ctx.daysToHarvest || '—'} days to harvest)`;
            }
        },
        {
            id: 'sensors',
            keywords: ['sensor', 'iot', 'device', 'probe', 'fiware', 'data source'],
            respond() {
                return `TwinFarm uses multiple data sources:
• <strong>Soil moisture sensor</strong> — active, real-time field readings
• <strong>Temperature sensor</strong> — active, tracks soil temperature
• <strong>NDVI satellite data</strong> — simulated satellite vegetation index
• <strong>Weather API</strong> — active, powers the forecast chart

Sensor status is shown on the dashboard. FIWARE integration enables scalable IoT in production deployments.`;
            }
        },
        {
            id: 'predictions',
            keywords: ['prediction', 'ai', 'forecast', 'simulate', 'simulation', 'machine learning', 'model'],
            respond(query, ctx) {
                return `TwinFarm AI predictions include:
• <strong>Yield:</strong> ${ctx.yieldPrediction || '8.2'} tons/ha (${ctx.yieldConfidence || '87%'} confidence)
• <strong>Irrigation:</strong> ${ctx.irrigationAmount || '1,250'} L/day, next in ${ctx.irrigationTime || '48 hours'}
• <strong>Harvest:</strong> ${ctx.harvestDays || '45'} days (window: ${ctx.harvestRange || '42–48 days'})

Use the Growth Simulator sliders to see how temperature and moisture affect 3D plant growth.`;
            }
        },
        {
            id: 'map',
            keywords: ['map', 'field map', 'ndvi map', 'location', 'gps', 'coordinates'],
            respond(query, ctx) {
                return `The NDVI Field Map shows coriander field health across your farm near Kiambu, Kenya. Average NDVI: <strong>${ctx.avgNdvi || '0.68'}</strong>. Green markers = healthy, orange = moderate, red = needs attention. Click markers for field-specific NDVI values.`;
            }
        },
        {
            id: 'coriander',
            keywords: ['coriander', 'dhania', 'cilantro', 'herb', 'what is coriander'],
            respond() {
                return `Coriander (<em>Coriandrum sativum</em>), known as dhania in Kenya, is a fast-growing herb valued for leaves and seeds. It's well-suited to Kenyan highland climates (1,500–2,000 m altitude). Leaves are harvested for fresh market; seeds for spice. TwinFarm monitors your crop from planting through harvest using sensors, NDVI, and AI predictions.`;
            }
        },
        {
            id: 'account',
            keywords: ['sign in', 'sign up', 'login', 'log in', 'account', 'register', 'demo account', 'password'],
            respond() {
                return `To use TwinFarm with a saved account:
• Click <strong>Get Started</strong> to register (name, email, farm size, password)
• Click <strong>Sign In</strong> for existing accounts
• Or use the demo: <strong>demo@twinfarm.com</strong> / <strong>demo123</strong>

Your session persists across page refreshes once signed in.`;
            }
        },
        {
            id: 'water_savings',
            keywords: ['water saving', 'water efficiency', 'conserve water', 'drought'],
            respond() {
                return `TwinFarm helps save 30–40% water through:
• Soil moisture sensors that trigger irrigation only when needed
• AI-scheduled watering based on crop stage and weather
• Drip irrigation recommendations per field
• Early stress detection via NDVI before visible wilting`;
            }
        },
        {
            id: 'goodbye',
            keywords: ['bye', 'goodbye', 'see you', 'later'],
            respond() {
                return 'Goodbye! Your coriander fields are in good hands. Come back anytime for farming advice or to check your dashboard.';
            }
        }
    ],

    fallback(query, ctx) {
        const q = this.normalize(query);

        if (/^(what|how|when|why|where|which|can|should|is|are|do|does)\b/.test(q)) {
            return `I want to give you a precise answer. Based on your question, try asking about:
• <strong>Your live data:</strong> "What is my soil moisture?" or "How healthy are my crops?"
• <strong>Coriander care:</strong> irrigation, fertilizer, pests, yellow leaves, or harvest timing
• <strong>Platform:</strong> NDVI map, 3D farm, predictions, or sensors

Or tap a quick question on the left to get started.`;
        }

        if (q.length < 4) {
            return 'Could you add a bit more detail? For example: "When should I irrigate?" or "What causes yellow leaves?"';
        }

        return `I'm specialized in coriander farming and TwinFarm. I didn't find an exact match for that, but I can help with soil moisture (${ctx.soilMoisture || '60–75%'}), irrigation, yield (${ctx.yieldPrediction || '8.2'} tons/ha), NDVI, harvest timing, pests, and the 3D farm. Try rephrasing your question!`;
    },

    answer(query) {
        const ctx = this.getContext();
        let bestTopic = null;
        let bestScore = 0;

        for (const topic of this.topics) {
            const score = this.scoreTopic(query, topic);
            if (score > bestScore) {
                bestScore = score;
                bestTopic = topic;
            }
        }

        if (bestTopic && bestScore > 0) {
            return bestTopic.respond(query, ctx);
        }

        return this.fallback(query, ctx);
    }
};

if (typeof window !== 'undefined') {
    window.TwinFarmAssistant = TwinFarmAssistant;
}
