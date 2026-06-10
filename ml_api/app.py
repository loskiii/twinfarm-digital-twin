from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route('/health')
def health():
    return jsonify({
        "status": "ok",
        "message": "TwinFarm ML API running",
        "dataset": "30-day historical coriander data"
    })


@app.route('/api/ml/health', methods=['POST'])
def predict_health():
    data = request.json or {}
    moisture = data.get('soilMoisture', 75)
    temp = data.get('temperature', 23)
    humidity = data.get('humidity', 65)
    if moisture < 72 or temp > 30:
        status, conf = 'High Stress', 0.82
    elif moisture < 78:
        status, conf = 'Moderate Stress', 0.75
    else:
        status, conf = 'Healthy', 0.88
    shap = {
        'soilMoisture': round((moisture - 75) / 100, 3),
        'temperature': round((temp - 25) / 100, 3),
        'humidity': round((humidity - 65) / 100, 3),
    }
    return jsonify({'status': status, 'confidence': conf, 'shap': shap})


@app.route('/api/ml/growth', methods=['POST'])
def predict_growth():
    data = request.json or {}
    day = data.get('dayNumber', 30)
    day = min(day, 30)
    if day <= 7:
        stage = 'seed'
    elif day <= 14:
        stage = 'germinating'
    elif day <= 21:
        stage = 'seedling'
    else:
        stage = 'vegetative'
    return jsonify({
        'stage': stage,
        'confidence': 0.79,
        'allStages': {
            'seed': 0.05,
            'germinating': 0.07,
            'seedling': 0.09,
            'vegetative': 0.79
        }
    })


@app.route('/api/ml/biomass', methods=['GET'])
def predict_biomass():
    moisture = float(request.args.get('moisture', 75))
    stage = request.args.get('stage', 'vegetative')
    scores = {'seed': 0.1, 'germinating': 0.3, 'seedling': 0.6, 'vegetative': 1.0}
    biomass = round(
        ((0.6 * moisture / 100) + (0.4 * scores.get(stage, 1.0))) * 850,
        2
    )
    return jsonify({
        'biomass_g': biomass,
        'percent_optimal': round(biomass / 850 * 100, 2),
        'baseline_g': 850
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
