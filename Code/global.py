import pandas as pd
import numpy as np
import os
import lightgbm as lgb
from sklearn.model_selection import GroupKFold
from sklearn.metrics import mean_squared_error
import joblib
import json

# ============================================================
# FIXED PATHS
# ============================================================
BASE_DIR = r"E:\Desktop\Hackathon"

DATA_PATH = os.path.join(
    BASE_DIR, "Dataset", "final_classwise_global_training_dataset.xlsx"
)
MODEL_PATH = os.path.join(
    BASE_DIR, "Model", "global_layer_model.pkl"
)
PRIORS_PATH = os.path.join(
    BASE_DIR, "Json", "global_priors.json"
)

# ============================================================
# LOAD DATA
# ============================================================
xls = pd.ExcelFile(DATA_PATH)

subject  = pd.read_excel(xls, "subject_profile")
sleep    = pd.read_excel(xls, "sleep_daily")
med      = pd.read_excel(xls, "medication_daily")
activity = pd.read_excel(xls, "activity_daily")
glucose  = pd.read_excel(xls, "glucose_proxy_daily")

# ============================================================
# PREPROCESSING
# ============================================================
subject["sex"] = subject["sex"].map({"M": 1, "F": 0})

sleep["sleep_duration_min"] = (
    (sleep["wake_min"] + 1440 - sleep["sleep_start_min"]) % 1440
)
sleep["sleep_midpoint_min"] = (
    sleep["sleep_start_min"] + sleep["sleep_duration_min"] // 2
) % 1440

dose_cols = ["dose_1_time_min", "dose_2_time_min", "dose_3_time_min"]
med["dose_count"] = med[dose_cols].notnull().sum(axis=1)
med["mean_med_time_min"] = med[dose_cols].mean(axis=1)

activity["activity_load"] = (
    activity["activity_duration_min"] * activity["activity_MET"]
)

# ============================================================
# BUILD DAILY MASTER
# ============================================================
df = (
    sleep
    .merge(subject, on="subject_id")
    .merge(med, on=["subject_id", "day_index"])
    .merge(activity, on=["subject_id", "day_index"])
    .merge(glucose, on=["subject_id", "day_index"])
)

df = df.dropna(subset=["glucose_proxy_deviation_z"])

# ============================================================
# TRAIN MATRIX
# ============================================================
FEATURES = [
    "age", "sex",
    "sleep_midpoint_min", "sleep_duration_min",
    "dose_count", "mean_med_time_min",
    "activity_duration_min", "activity_MET", "activity_load"
]

X = df[FEATURES].to_numpy(dtype=float)
y = df["glucose_proxy_deviation_z"].to_numpy(dtype=float)
groups = df["subject_id"].to_numpy()

# ============================================================
# MODEL
# ============================================================
model = lgb.LGBMRegressor(
    objective="regression",
    n_estimators=600,
    learning_rate=0.05,
    num_leaves=48,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42
)

# ============================================================
# CROSS-USER VALIDATION
# ============================================================
gkf = GroupKFold(n_splits=5)
rmse = []

for i, (tr, va) in enumerate(gkf.split(X, y, groups)):
    model.fit(X[tr], y[tr])
    preds = model.predict(X[va])
    score = np.sqrt(mean_squared_error(y[va], preds))
    rmse.append(score)
    print(f"Fold {i+1} RMSE: {score:.4f}")

print(f"\nMean RMSE: {np.mean(rmse):.4f}")

# ============================================================
# FINAL TRAIN
# ============================================================
model.fit(X, y)
joblib.dump(model, MODEL_PATH)

# ============================================================
# GLOBAL PRIORS
# ============================================================
importances = model.feature_importances_
weights = importances / importances.sum()

priors = {
    "feature_weights": dict(zip(FEATURES, weights.tolist())),
    "alpha_max": 0.03,
    "lambda_decay": 0.02,
    "note": "Population-level global priors (non-clinical)"
}

with open(PRIORS_PATH, "w") as f:
    json.dump(priors, f, indent=4)

print("\n✅ Global training complete")
