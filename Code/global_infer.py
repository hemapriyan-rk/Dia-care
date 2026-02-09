

import json
import numpy as np
import joblib
import os


BASE_DIR = r"E:\Desktop\Hackathon"

MODEL_PATH = os.path.join(BASE_DIR, "Model", "global_layer_model.pkl")
INPUT_JSON = os.path.join(BASE_DIR, "Json", "user_input.json")
OUTPUT_JSON = os.path.join(BASE_DIR, "Json", "global_inference_output.json")


if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)


if not os.path.exists(INPUT_JSON):
    raise FileNotFoundError(f"Input JSON not found: {INPUT_JSON}")

with open(INPUT_JSON, "r") as f:
    user = json.load(f)


if "age" not in user or user["age"] is None:
    raise ValueError("age is required")


def safe(v, default):
    return default if v is None else v


age = user["age"]
sex = 1 if user.get("sex") == "M" else 0


sleep_midpoint_min = safe(user.get("sleep_midpoint_min"), 720)
sleep_duration_min = safe(user.get("sleep_duration_min"), 420)


activity_duration_min = safe(user.get("activity_duration_min"), 0)
activity_MET = safe(user.get("activity_MET"), 1.0)
activity_load = activity_duration_min * activity_MET


raw_med_times = user.get("medication_times_min")

if not isinstance(raw_med_times, list):
    raw_med_times = []

valid_med_times = [
    t for t in raw_med_times
    if isinstance(t, (int, float))
]

dose_count = len(valid_med_times)

mean_med_time_min = (
    float(sum(valid_med_times) / dose_count)
    if dose_count > 0 else 0.0
)


X_user = np.array([[
    age,
    sex,
    sleep_midpoint_min,
    sleep_duration_min,
    dose_count,
    mean_med_time_min,
    activity_duration_min,
    activity_MET,
    activity_load
]], dtype=float)


z = float(model.predict(X_user)[0])


if z <= -0.5:
    deviation = -1
elif z >= 0.5:
    deviation = 1
else:
    deviation = 0

output = {
    "user_id": user.get("user_id"),
    "layer": "global",
    "phase": "initial_window",
    "population_glucose_deviation_z": round(z, 3),
    "population_deviation": deviation
}

with open(OUTPUT_JSON, "w") as f:
    json.dump(output, f, indent=4)

print("✅ Global inference completed")
print(json.dumps(output, indent=4))
