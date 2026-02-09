import json

GLOBAL_JSON = r"E:\Desktop\Hackathon\Json\global_inference_output.json"
LOCAL_JSON = r"E:\Desktop\Hackathon\Json\local_output.json"
AGE_JSON = r"E:\Desktop\Hackathon\Json\account_age.json"
OUTPUT_JSON = r"E:\Desktop\Hackathon\Json\final_output.json"


def get_weights(days):
    if days <= 20:
        return 0.9, 0.1
    elif days <= 30:
        return 0.8, 0.2
    elif days <= 60:
        return 0.6, 0.4
    elif days <= 90:
        return 0.3, 0.7
    else:
        return 0.0, 1.0


def discretize(score):
    if score <= -1.5:
        return -1
    elif score >= 1.5:
        return 1
    else:
        return 0


with open(GLOBAL_JSON) as f:
    global_out = json.load(f)

with open(LOCAL_JSON) as f:
    local_out = json.load(f)

with open(AGE_JSON) as f:
    age_out = json.load(f)


days_since_signup = int(age_out["days_since_account_creation"])

global_dev = float(global_out["population_deviation"])


local_dev = float(
    local_out["local_cumulative_deviation"]
    if local_out.get("local_signal_ready", False)
    else 0.0
)


w_global, w_local = get_weights(days_since_signup)

final_score = (w_global * global_dev) + (w_local * local_dev)

final_label = discretize(final_score)


output = {
    "user_id": age_out["user_id"],
    "days_since_account_creation": days_since_signup,

    "weights": {
        "global": w_global,
        "local": w_local
    },

    "global_deviation": global_dev,
    "local_cumulative_deviation": round(local_dev, 3),

    "final_deviation_score": round(final_score, 3),
    "final_deviation": final_label
}

with open(OUTPUT_JSON, "w") as f:
    json.dump(output, f, indent=4)

print(json.dumps(output, indent=4))
