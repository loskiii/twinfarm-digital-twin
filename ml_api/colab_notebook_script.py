"""
TwinFarm AIware — Google Colab Training Script
JKUAT Digital Twin Capstone | Dr. Lawrence Nderu

Copy/paste this entire file into a Google Colab cell after uploading:
  - plant_health_data.csv        (local farm sensor data)
  - coriander_30_day_hourly_dataset.csv  (30-day hourly local stream)

Outputs (download from Colab):
  - catboost_model.cbm
  - growth_stage_model.cbm

Place both .cbm files in: ml_api/models/
"""

from __future__ import annotations

import os
import warnings

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
import shap

warnings.filterwarnings("ignore")

LOCAL_CSV = "plant_health_data.csv"
THIRTY_DAY_CSV = "coriander_30_day_hourly_dataset.csv"

HEALTH_FEATURES = ["Soil_Moisture", "Ambient_Temperature", "Humidity"]
HEALTH_TARGET = "Plant_Health_Status"

GROWTH_FEATURES = ["soil_moisture_pct", "temperature_c", "humidity_pct", "day_number"]
GROWTH_TARGET = "growth_stage"


def assert_files_exist() -> None:
    for path in (LOCAL_CSV, THIRTY_DAY_CSV):
        if not os.path.isfile(path):
            raise FileNotFoundError(
                f"Required dataset '{path}' not found. Upload it to Colab first."
            )


# ---------------------------------------------------------------------------
# Step A — Local Processing: rule-based health labels
# ---------------------------------------------------------------------------
def assign_health_label(moisture: float, temp: float) -> str:
    if moisture < 72 or temp > 30:
        return "High Stress"
    if 72 <= moisture <= 78:
        return "Moderate Stress"
    return "Healthy"


def step_a_local_processing(local_df: pd.DataFrame) -> pd.DataFrame:
    print("\n=== Step A: Local Processing — Health Labels ===")

    df = local_df.copy()

    moisture_col = next(
        (c for c in df.columns if "moisture" in c.lower() and "soil" in c.lower()),
        next((c for c in df.columns if "moisture" in c.lower()), None),
    )
    temp_col = next(
        (c for c in df.columns if "temp" in c.lower()),
        None,
    )

    if moisture_col is None or temp_col is None:
        raise ValueError(
            "Local CSV must contain moisture and temperature columns. "
            f"Found columns: {list(df.columns)}"
        )

    df["Soil_Moisture"] = pd.to_numeric(df[moisture_col], errors="coerce")
    df["Ambient_Temperature"] = pd.to_numeric(df[temp_col], errors="coerce")

    humidity_col = next((c for c in df.columns if "humid" in c.lower()), None)
    if humidity_col:
        df["Humidity"] = pd.to_numeric(df[humidity_col], errors="coerce")
    else:
        df["Humidity"] = 65.0

    df[HEALTH_TARGET] = df.apply(
        lambda row: assign_health_label(row["Soil_Moisture"], row["Ambient_Temperature"]),
        axis=1,
    )

    print(df[HEALTH_TARGET].value_counts())
    print(f"Labeled {len(df)} local rows.")
    return df


# ---------------------------------------------------------------------------
# Step B — Domain Adaptation Scaling (Kaggle moisture 10–40 → 69–92)
# ---------------------------------------------------------------------------
def scale_kaggle_moisture(value: float) -> float:
    x = float(value)
    return 69.0 + (x - 10.0) / (40.0 - 10.0) * (92.0 - 69.0)


def step_b_domain_adaptation(kaggle_df: pd.DataFrame) -> pd.DataFrame:
    print("\n=== Step B: Domain Adaptation Scaling ===")

    df = kaggle_df.copy()

    kaggle_moisture = next(
        (c for c in df.columns if "moisture" in c.lower()),
        None,
    )
    kaggle_temp = next((c for c in df.columns if "temp" in c.lower()), None)
    kaggle_humidity = next((c for c in df.columns if "humid" in c.lower()), None)

    if kaggle_moisture is None:
        raise ValueError(f"Kaggle CSV missing moisture column. Columns: {list(df.columns)}")

    raw_moisture = pd.to_numeric(df[kaggle_moisture], errors="coerce")
    df["Soil_Moisture"] = raw_moisture.apply(scale_kaggle_moisture)

    if kaggle_temp:
        df["Ambient_Temperature"] = pd.to_numeric(df[kaggle_temp], errors="coerce")
    else:
        df["Ambient_Temperature"] = 25.0

    if kaggle_humidity:
        df["Humidity"] = pd.to_numeric(df[kaggle_humidity], errors="coerce")
    else:
        df["Humidity"] = 65.0

    print(
        f"Scaled moisture range: {df['Soil_Moisture'].min():.2f} – "
        f"{df['Soil_Moisture'].max():.2f}"
    )
    return df


# ---------------------------------------------------------------------------
# Step C — Merge, partition, train Model 1 (health CatBoost + SHAP)
# ---------------------------------------------------------------------------
def step_c_train_health_model(
    local_labeled: pd.DataFrame,
    kaggle_adapted: pd.DataFrame,
) -> CatBoostClassifier:
    print("\n=== Step C: Merge & Train Model 1 (Plant Health) ===")

    kaggle_health = kaggle_adapted[HEALTH_FEATURES].copy()
    kaggle_health[HEALTH_TARGET] = kaggle_health.apply(
        lambda row: assign_health_label(row["Soil_Moisture"], row["Ambient_Temperature"]),
        axis=1,
    )

    local_subset = local_labeled[HEALTH_FEATURES + [HEALTH_TARGET]].dropna()
    kaggle_subset = kaggle_health.dropna()

    local_count = len(local_subset)
    local_test_size = max(1, int(np.floor(local_count * 0.20)))

    local_shuffled = local_subset.sample(frac=1.0, random_state=42).reset_index(drop=True)
    test_df = local_shuffled.iloc[-local_test_size:].copy()
    local_train_part = local_shuffled.iloc[:-local_test_size].copy()

    train_df = pd.concat([local_train_part, kaggle_subset], ignore_index=True)
    train_df = train_df.sample(frac=1.0, random_state=42).reset_index(drop=True)

    print(f"Train rows: {len(train_df)} | Local test rows: {len(test_df)}")

    X_train = train_df[HEALTH_FEATURES]
    y_train = train_df[HEALTH_TARGET]
    X_test = test_df[HEALTH_FEATURES]
    y_test = test_df[HEALTH_TARGET]

    model = CatBoostClassifier(
        iterations=500,
        learning_rate=0.05,
        depth=6,
        loss_function="MultiClass",
        eval_metric="Accuracy",
        random_seed=42,
        verbose=100,
        auto_class_weights="Balanced",
    )

    model.fit(
        X_train,
        y_train,
        eval_set=(X_test, y_test),
        use_best_model=True,
    )

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel 1 Test Accuracy (local hold-out): {acc:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred))
    print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

    print("\nSHAP TreeExplainer (sample)...")
    explainer = shap.TreeExplainer(model)
    sample = X_test.head(min(50, len(X_test)))
    shap_values = explainer.shap_values(sample)
    print(f"SHAP values computed for {len(sample)} test samples.")

    model.save_model("catboost_model.cbm")
    print("Saved: catboost_model.cbm")
    return model


# ---------------------------------------------------------------------------
# Step D — Train Model 2 (growth stage on 30-day local CSV)
# ---------------------------------------------------------------------------
def normalize_growth_stage(value: str) -> str:
    label = str(value).strip().lower().replace(" ", "_")
    mapping = {
        "germination": "germinating",
        "germ": "germinating",
        "veg": "vegetative",
        "vegetative_stage": "vegetative",
    }
    return mapping.get(label, label)


def step_d_train_growth_model(thirty_day_df: pd.DataFrame) -> CatBoostClassifier:
    print("\n=== Step D: Train Model 2 (Growth Stage) ===")

    df = thirty_day_df.copy()

    moisture_col = next((c for c in df.columns if "moisture" in c.lower()), None)
    temp_col = next((c for c in df.columns if "temp" in c.lower()), None)
    humidity_col = next((c for c in df.columns if "humid" in c.lower()), None)
    stage_col = next(
        (c for c in df.columns if "stage" in c.lower() or "growth" in c.lower()),
        None,
    )

    if moisture_col is None or temp_col is None:
        raise ValueError(
            "30-day CSV must include moisture and temperature columns. "
            f"Found: {list(df.columns)}"
        )

    df["soil_moisture_pct"] = pd.to_numeric(df[moisture_col], errors="coerce")
    df["temperature_c"] = pd.to_numeric(df[temp_col], errors="coerce")
    df["humidity_pct"] = (
        pd.to_numeric(df[humidity_col], errors="coerce") if humidity_col else 65.0
    )
    df["day_number"] = df.index // 24

    if stage_col:
        df[GROWTH_TARGET] = df[stage_col].apply(normalize_growth_stage)
    else:
        df[GROWTH_TARGET] = df["day_number"].apply(
            lambda d: (
                "seed"
                if d < 3
                else "germinating"
                if d < 8
                else "seedling"
                if d < 18
                else "vegetative"
            )
        )

    df = df.dropna(subset=GROWTH_FEATURES + [GROWTH_TARGET])
    print(df[GROWTH_TARGET].value_counts())

    X = df[GROWTH_FEATURES]
    y = df[GROWTH_TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = CatBoostClassifier(
        iterations=400,
        learning_rate=0.06,
        depth=5,
        loss_function="MultiClass",
        eval_metric="Accuracy",
        random_seed=42,
        verbose=100,
        auto_class_weights="Balanced",
    )

    model.fit(X_train, y_train, eval_set=(X_test, y_test), use_best_model=True)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nModel 2 Test Accuracy: {acc:.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred))

    model.save_model("growth_stage_model.cbm")
    print("Saved: growth_stage_model.cbm")
    return model


def main() -> None:
    print("TwinFarm AIware — Colab Training Pipeline")
    print("=" * 50)

    assert_files_exist()

    local_raw = pd.read_csv(LOCAL_CSV)
    thirty_day_raw = pd.read_csv(THIRTY_DAY_CSV)

    local_labeled = step_a_local_processing(local_raw)

    # Kaggle-style rows: use plant_health rows whose raw moisture sits in [10, 40]
    moisture_probe = next(
        (c for c in local_raw.columns if "moisture" in c.lower()),
        None,
    )
    if moisture_probe:
        raw_vals = pd.to_numeric(local_raw[moisture_probe], errors="coerce")
        kaggle_mask = (raw_vals >= 10) & (raw_vals <= 40)
        kaggle_source = local_raw[kaggle_mask].copy() if kaggle_mask.any() else local_raw.copy()
    else:
        kaggle_source = local_raw.copy()

    kaggle_adapted = step_b_domain_adaptation(kaggle_source)

    step_c_train_health_model(local_labeled, kaggle_adapted)
    step_d_train_growth_model(thirty_day_raw)

    print("\n" + "=" * 50)
    print("Training complete. Download catboost_model.cbm and growth_stage_model.cbm")
    print("and place them in ml_api/models/ in your TwinFarm repository.")


if __name__ == "__main__":
    main()
