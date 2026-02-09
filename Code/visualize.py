import json
import matplotlib.pyplot as plt
from datetime import datetime

LOCAL_JSON = r"E:\Desktop\Hackathon\Json\local_output.json"
FINAL_JSON = r"E:\Desktop\Hackathon\Json\final_output.json"
AGE_JSON = r"E:\Desktop\Hackathon\Json\account_age.json"

# ---------------- LOAD LOCAL DATA ----------------
with open(LOCAL_JSON) as f:
    local_data = json.load(f)

# Normalize to list of dicts
if isinstance(local_data, dict):
    local_hist = [local_data]
elif isinstance(local_data, list):
    local_hist = local_data
else:
    raise ValueError("Invalid local output format")

# ---------------- LOAD OTHER DATA ----------------
with open(FINAL_JSON) as f:
    final_out = json.load(f)

with open(AGE_JSON) as f:
    age_out = json.load(f)

# ---------------- EXTRACT SERIES SAFELY ----------------
dates = []
daily = []
cumulative = []

for d in local_hist:
    if not isinstance(d, dict):
        continue

    dates.append(datetime.fromisoformat(d["behavioral_date"]))
    daily.append(d.get("daily_deviation", 0.0))

    # Handle BOTH possible key names
    if "local_cumulative_deviation" in d:
        cumulative.append(d["local_cumulative_deviation"])
    elif "cumulative_deviation" in d:
        cumulative.append(d["cumulative_deviation"])
    else:
        cumulative.append(0.0)

# ---------------- WEIGHTS ----------------
days_since = age_out["days_since_account_creation"]
w_global = final_out["weights"]["global"]
w_local = final_out["weights"]["local"]

# ---------------- PLOTS ----------------
plt.figure()
plt.plot(dates, daily, marker="o")
plt.axhline(0)
plt.title("Daily Local Deviation")
plt.xlabel("Date")
plt.ylabel("Deviation")
plt.show()

plt.figure()
plt.plot(dates, cumulative, marker="o")
plt.axhline(0)
plt.title("Cumulative Local Deviation")
plt.xlabel("Date")
plt.ylabel("Cumulative Deviation")
plt.show()

plt.figure()
plt.bar(["Global", "Local"], [w_global, w_local])
plt.title(f"Weight Distribution (Day {days_since})")
plt.ylabel("Weight")
plt.show()

plt.figure()
plt.bar(["Final Score"], [final_out["final_deviation_score"]])
plt.axhline(1.5, linestyle="--")
plt.axhline(-1.5, linestyle="--")
plt.title("Final Deviation Score")
plt.show()
