"""
Model 2 — Growth stage classification from 30-day sensor stream.
Falls back to day-index heuristics when growth_stage_model.cbm is missing.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Tuple

import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "growth_stage_model.cbm")

FEATURE_COLUMNS = ["soil_moisture_pct", "temperature_c", "humidity_pct", "day_number"]
STAGE_ORDER = ["seed", "germinating", "seedling", "vegetative"]

_model = None
_model_loaded = False
_load_attempted = False


def _ensure_model() -> bool:
    global _model, _model_loaded, _load_attempted

    if _load_attempted:
        return _model_loaded

    _load_attempted = True
    if not os.path.isfile(MODEL_PATH):
        return False

    try:
        from catboost import CatBoostClassifier

        model = CatBoostClassifier()
        model.load_model(MODEL_PATH)
        _model = model
        _model_loaded = True
    except Exception as exc:
        print(f"[model2] Could not load growth model: {exc}")
        _model_loaded = False

    return _model_loaded


def _day_based_stage(day_number: float) -> str:
    if day_number < 3:
        return "seed"
    if day_number < 8:
        return "germinating"
    if day_number < 18:
        return "seedling"
    return "vegetative"


def _stage_distribution(primary: str, confidence: float) -> Dict[str, float]:
    """Build softmax-like distribution across four stages."""
    scores = {stage: 0.05 for stage in STAGE_ORDER}
    scores[primary] = confidence
    remaining = max(0.0, 1.0 - confidence)
    others = [s for s in STAGE_ORDER if s != primary]
    share = remaining / len(others) if others else 0.0
    for stage in others:
        scores[stage] = round(share, 4)
    scores[primary] = round(confidence, 4)
    return scores


def rule_based_growth(
    soil_moisture: float,
    temperature: float,
    humidity: float,
    day_number: float,
) -> Tuple[str, float, Dict[str, float]]:
    stage = _day_based_stage(day_number)

    stress = 0.0
    if soil_moisture < 60:
        stress += 0.12
    if temperature > 30 or temperature < 15:
        stress += 0.1
    if humidity < 45:
        stress += 0.06

    confidence = max(0.55, min(0.94, 0.85 - stress))
    if stage == "seed":
        confidence = min(confidence, 0.78)

    return stage, confidence, _stage_distribution(stage, confidence)


def _normalize_stage_label(label: str) -> str:
    normalized = str(label).strip().lower().replace(" ", "_")
    aliases = {
        "germination": "germinating",
        "germ": "germinating",
        "veg": "vegetative",
        "vegetative_stage": "vegetative",
    }
    return aliases.get(normalized, normalized)


def predict_growth(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predict growth stage from sensor JSON.
    Expected keys: soilMoisture, temperature, humidity, dayNumber.
    """
    soil_moisture = float(payload.get("soilMoisture", 70))
    temperature = float(payload.get("temperature", 25))
    humidity = float(payload.get("humidity", 65))
    day_number = float(payload.get("dayNumber", 15))

    if _ensure_model() and _model is not None:
        try:
            row = np.array(
                [[soil_moisture, temperature, humidity, day_number]], dtype=float
            )
            probabilities = _model.predict_proba(row)[0]
            class_idx = int(np.argmax(probabilities))
            raw_label = _normalize_stage_label(str(_model.classes_[class_idx]))
            stage = raw_label if raw_label in STAGE_ORDER else _day_based_stage(day_number)
            confidence = float(probabilities[class_idx])

            all_stages: Dict[str, float] = {}
            for idx, cls in enumerate(_model.classes_):
                key = _normalize_stage_label(str(cls))
                if key in STAGE_ORDER:
                    all_stages[key] = round(float(probabilities[idx]), 4)
            for missing in STAGE_ORDER:
                all_stages.setdefault(missing, 0.0)

            return {
                "stage": stage,
                "confidence": round(confidence, 4),
                "allStages": all_stages,
                "source": "catboost",
            }
        except Exception as exc:
            print(f"[model2] Inference failed, using rules: {exc}")

    stage, confidence, all_stages = rule_based_growth(
        soil_moisture, temperature, humidity, day_number
    )
    return {
        "stage": stage,
        "confidence": round(confidence, 4),
        "allStages": all_stages,
        "source": "rule_engine",
    }


def stage_display_name(stage: str) -> str:
    names = {
        "seed": "Seed",
        "germinating": "Germinating",
        "seedling": "Seedling",
        "vegetative": "Vegetative",
    }
    return names.get(stage, stage.title())


def model_status() -> Dict[str, Any]:
    return {
        "loaded": _ensure_model(),
        "path": MODEL_PATH,
        "features": FEATURE_COLUMNS,
        "stages": STAGE_ORDER,
    }
