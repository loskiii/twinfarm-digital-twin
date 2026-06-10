"""
Model 3 — Biomass fusion using deterministic agronomic formula.
Loads optimal baseline from data/optimal_baseline.json.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict

BASELINE_PATH = os.path.join(
    os.path.dirname(__file__), "..", "data", "optimal_baseline.json"
)

DEFAULT_BASELINE = {
    "moisture": 70,
    "temp": 25,
    "humidity": 65,
    "light": 1000,
    "biomass_target": 850,
}

STAGE_SCORES = {
    "seed": 0.10,
    "germinating": 0.30,
    "seedling": 0.55,
    "vegetative": 0.90,
    "flowering": 0.95,
    "maturation": 1.0,
}

_baseline_cache: Dict[str, Any] | None = None


def load_baseline() -> Dict[str, Any]:
    global _baseline_cache
    if _baseline_cache is not None:
        return _baseline_cache

    if os.path.isfile(BASELINE_PATH):
        try:
            with open(BASELINE_PATH, "r", encoding="utf-8") as handle:
                _baseline_cache = {**DEFAULT_BASELINE, **json.load(handle)}
                return _baseline_cache
        except Exception as exc:
            print(f"[model3] Could not read baseline JSON: {exc}")

    _baseline_cache = dict(DEFAULT_BASELINE)
    return _baseline_cache


def stage_score(stage: str) -> float:
    key = str(stage).strip().lower().replace(" ", "_")
    return STAGE_SCORES.get(key, 0.50)


def compute_biomass(moisture: float, light: float, stage: str) -> Dict[str, Any]:
    """
    Deterministic biomass fusion:
    biomass_g = ((0.4 * moisture/100) + (0.4 * light/1000) + (0.2 * stage_score)) * baseline_g
    """
    baseline = load_baseline()
    baseline_g = float(baseline.get("biomass_target", 850))
    score = stage_score(stage)

    moisture_term = 0.4 * (moisture / 100.0)
    light_term = 0.4 * (light / 1000.0)
    stage_term = 0.2 * score
    composite = moisture_term + light_term + stage_term

    biomass_g = round(composite * baseline_g, 2)
    percent_of_optimal = round(min(100.0, (biomass_g / baseline_g) * 100.0), 2)

    return {
        "biomass_g": biomass_g,
        "percentOfOptimal": percent_of_optimal,
        "baseline_g": baseline_g,
        "compositeScore": round(composite, 4),
        "stageScore": score,
        "baseline": baseline,
        "source": "fusion_formula",
    }


def compare_to_baseline(
    moisture: float,
    temp: float,
    humidity: float,
    light: float,
    biomass_g: float,
) -> Dict[str, Any]:
    """Build baseline comparison rows for the analytics table."""
    baseline = load_baseline()
    target = float(baseline.get("biomass_target", 850))

    def delta(current: float, optimal: float) -> float:
        if optimal == 0:
            return 0.0
        return round(((current - optimal) / optimal) * 100.0, 1)

    return {
        "metrics": [
            {
                "metric": "Soil Moisture (%)",
                "current": moisture,
                "optimal": baseline["moisture"],
                "deltaPct": delta(moisture, baseline["moisture"]),
            },
            {
                "metric": "Temperature (°C)",
                "current": temp,
                "optimal": baseline["temp"],
                "deltaPct": delta(temp, baseline["temp"]),
            },
            {
                "metric": "Humidity (%)",
                "current": humidity,
                "optimal": baseline["humidity"],
                "deltaPct": delta(humidity, baseline["humidity"]),
            },
            {
                "metric": "Light (lux)",
                "current": light,
                "optimal": baseline["light"],
                "deltaPct": delta(light, baseline["light"]),
            },
            {
                "metric": "Biomass (g)",
                "current": biomass_g,
                "optimal": target,
                "deltaPct": delta(biomass_g, target),
            },
        ],
        "baseline": baseline,
    }
