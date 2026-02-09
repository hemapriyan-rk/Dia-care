import json
import statistics
from pathlib import Path


MIN_BASELINE_DAYS = 7
BASELINE_ADAPT_ALPHA = 0.02
DECAY = 0.95

FEATURES = [
    "sleep_midpoint_min",
    "sleep_duration_min",
    "mean_med_time_min",
    "activity_load"
]

TOL = {
    "sleep_midpoint_min": 60,
    "sleep_duration_min": 90,
    "mean_med_time_min": 45,
    "activity_load": 50
}

WEIGHTS = {
    "sleep": 0.4,
    "med": 0.35,
    "activity": 0.25
}

INPUT_JSON = r"E:\Desktop\Hackathon\Json\local_input.json"
STATE_JSON = r"E:\Desktop\Hackathon\Json\local_state.json"
OUTPUT_JSON =r"E:\Desktop\Hackathon\Json\local_output.json"

# ---------------- HELPERS ----------------
def compute_baseline(history):
    return {
        f: statistics.median([d[f] for d in history])
        for f in FEATURES
    }


def adapt_baseline(baseline, today):
    updated = baseline.copy()
    for f in FEATURES:
        updated[f] = (
            (1 - BASELINE_ADAPT_ALPHA) * baseline[f]
            + BASELINE_ADAPT_ALPHA * today[f]
        )
    return updated


def daily_deviation(today, baseline):
    d_sleep = (today["sleep_midpoint_min"] - baseline["sleep_midpoint_min"]) / TOL["sleep_midpoint_min"]
    d_med   = (today["mean_med_time_min"]  - baseline["mean_med_time_min"])  / TOL["mean_med_time_min"]
    d_act   = (today["activity_load"]      - baseline["activity_load"])      / TOL["activity_load"]

    return (
        WEIGHTS["sleep"] * d_sleep +
        WEIGHTS["med"]   * d_med -
        WEIGHTS["activity"] * d_act
    )


with open(INPUT_JSON) as f:
    inp = json.load(f)

today = {f: inp[f] for f in FEATURES}


if Path(STATE_JSON).exists():
    with open(STATE_JSON) as f:
        state = json.load(f)
else:
    state = {}


state.setdefault("days_observed", 0)
state.setdefault("history", [])
state.setdefault("baseline", None)
state.setdefault("cumulative_deviation", 0.0)


state["days_observed"] += 1
state["history"].append(today)

phase = "baseline"
daily_delta = 0.0


if state["baseline"] is None:
    if state["days_observed"] >= MIN_BASELINE_DAYS:
        state["baseline"] = compute_baseline(state["history"])
else:
    phase = "active"
    daily_delta = daily_deviation(today, state["baseline"])
    state["cumulative_deviation"] = (
        DECAY * state["cumulative_deviation"] + daily_delta
    )

    if abs(daily_delta) < 0.5:
        state["baseline"] = adapt_baseline(state["baseline"], today)


with open(STATE_JSON, "w") as f:
    json.dump(state, f, indent=4)


output = {
    "user_id": inp["user_id"],
    "behavioral_date": inp["behavioral_date"],
    "phase": phase,
    "daily_deviation": round(daily_delta, 3),
    "local_cumulative_deviation": round(state["cumulative_deviation"], 3),
    "local_signal_ready": phase == "active"
}

with open(OUTPUT_JSON, "w") as f:
    json.dump(output, f, indent=4)

print(json.dumps(output, indent=4))
