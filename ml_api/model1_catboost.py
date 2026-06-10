"""
Model 1 — Plant health classification (CatBoost + SHAP).
Falls back to agronomic rule engine when catboost_model.cbm is missing.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "catboost_model.cbm")

FEATURE_COLUMNS = ["Soil_Moisture", "Ambient_Temperature", "Humidity"]
FEATURE_KEYS = ["soilMoisture", "temperature", "humidity", "light"]
CLASS_LABELS = ["Healthy", "Moderate Stress", "High Stress"]

_model = None
_explainer = None
_model_loaded = False
_load_attempted = False


def _ensure_model() -> bool:
    """Lazy-load CatBoost model and SHAP explainer once."""
    global _model, _explainer, _model_loaded, _load_attempted

    if _load_attempted:
        return _model_loaded

    _load_attempted = True
    if not os.path.isfile(MODEL_PATH):
        return False

    try:
        from catboost import CatBoostClassifier
        import shap

        model = CatBoostClassifier()
        model.load_model(MODEL_PATH)
        _model = model
        _explainer = shap.TreeExplainer(model)
        _model_loaded = True
    except Exception as exc:
        print(f"[model1] Could not load CatBoost model: {exc}")
        _model_loaded = False

    return _model_loaded


def rule_based_health(
    soil_moisture: float,
    temperature: float,
    humidity: float,
    light: float,
) -> Tuple[str, float, Dict[str, float]]:
    """
    Agronomic rule engine aligned with Colab labelling (Step A).
    Returns (status, confidence, shap_dict).
    """
    if soil_moisture < 72 or temperature > 30:
        status = "High Stress"
        confidence = 0.88 if soil_moisture < 65 or temperature > 32 else 0.78
        shap = {
            "soilMoisture": -0.35 if soil_moisture < 72 else 0.05,
            "temperature": -0.42 if temperature > 30 else 0.02,
            "humidity": -0.08 if humidity < 50 else 0.06,
            "light": -0.05 if light < 600 else 0.04,
        }
    elif 72 <= soil_moisture <= 78:
        status = "Moderate Stress"
        confidence = 0.82
        shap = {
            "soilMoisture": -0.12,
            "temperature": -0.06 if temperature > 27 else 0.04,
            "humidity": 0.03,
            "light": 0.02,
        }
    else:
        status = "Healthy"
        confidence = 0.91
        shap = {
            "soilMoisture": 0.28,
            "temperature": 0.18 if 20 <= temperature <= 28 else -0.05,
            "humidity": 0.12 if 55 <= humidity <= 75 else -0.04,
            "light": 0.15 if light >= 800 else -0.08,
        }

    return status, confidence, shap


def _health_score_from_status(status: str) -> float:
    mapping = {"Healthy": 9.2, "Moderate Stress": 6.8, "High Stress": 4.1}
    return mapping.get(status, 7.0)


def _shap_from_array(values: np.ndarray) -> Dict[str, float]:
    """Map SHAP vector to frontend keys (4 features; light uses last or zero)."""
    arr = np.asarray(values).flatten()
    padded = np.zeros(4, dtype=float)
    padded[: min(len(arr), 4)] = arr[: min(len(arr), 4)]
    return {
        "soilMoisture": float(padded[0]),
        "temperature": float(padded[1]),
        "humidity": float(padded[2]),
        "light": float(padded[3]),
    }


def predict_health(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict plant health from sensor JSON.
    Expected keys: soilMoisture, temperature, humidity, light.
    """
    soil_moisture = float(payload.get("soilMoisture", 70))
    temperature = float(payload.get("temperature", 25))
    humidity = float(payload.get("humidity", 65))
    light = float(payload.get("light", 1000))

    if _ensure_model() and _model is not None and _explainer is not None:
        try:
            row = np.array([[soil_moisture, temperature, humidity]], dtype=float)
            probabilities = _model.predict_proba(row)[0]
            class_idx = int(np.argmax(probabilities))
            status = str(_model.classes_[class_idx])
            confidence = float(probabilities[class_idx])

            shap_values = _explainer.shap_values(row)
            if isinstance(shap_values, list):
                shap_row = shap_values[class_idx][0]
            else:
                shap_row = shap_values[0]

            shap_dict = _shap_from_array(shap_row)
            shap_dict["light"] = round((light - 1000) / 5000, 4)

            return {
                "status": status,
                "confidence": round(confidence, 4),
                "healthScore": round(_health_score_from_status(status), 1),
                "shap": shap_dict,
                "source": "catboost",
            }
        except Exception as exc:
            print(f"[model1] Inference failed, using rules: {exc}")

    status, confidence, shap_dict = rule_based_health(
        soil_moisture, temperature, humidity, light
    )
    return {
        "status": status,
        "confidence": round(confidence, 4),
        "healthScore": round(_health_score_from_status(status), 1),
        "shap": shap_dict,
        "source": "rule_engine",
    }


def model_status() -> Dict[str, Any]:
    return {
        "loaded": _ensure_model(),
        "path": MODEL_PATH,
        "features": FEATURE_COLUMNS,
        "classes": CLASS_LABELS,
    }
