# Frontend-Backend-Python Model Integration - Implementation Guide

## 🎯 Objective

Integrate your React frontend, Node.js backend, and Python ML models into a complete end-to-end system where user daily health data flows through the prediction pipeline and results are displayed on the dashboard.

---

## 📊 System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  DailyEntryPage → Collects user health data (sleep, meds, etc)  │
└────────────────────┬────────────────────────────────────────────┘
                     │ POST /daily-log
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js/Express)                   │
│  1. Save to Database ──→ daily_behavior_logs                    │
│  2. Fetch User Profile ──→ age, sex                             │
│  3. Fetch Baseline ──→ avg_sleep, avg_activity, etc             │
└────────────────────┬────────────────────────────────────────────┘
                     │ Trigger Python Pipeline
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PYTHON ML MODELS                           │
│  local.py ──→ Tracks adaptive baseline, calculates deviation    │
│  global_infer.py ──→ LightGBM model predicts population risk   │
│  final.py ──→ Combines models with time-dependent weighting    │
└────────────────────┬────────────────────────────────────────────┘
                     │ Return predictions
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js/Express)                   │
│  4. Store Outputs:                                              │
│     - daily_outputs ──→ final score, risk zone, explanation     │
│     - local_output_history ──→ cumulative deviation trend      │
│     - global_inference_outputs ──→ population model output      │
│  5. Return response with prediction to frontend                 │
└────────────────────┬────────────────────────────────────────────┘
                     │ JSON response
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  DashboardPage → Display results, trends, explanations          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Step-by-Step Implementation

### **STEP 1: Fix Python Model File Paths**

Python scripts have hardcoded Windows paths. Update them for Linux:

**File**: `/home/fang/Downloads/DevSOC-Dia-Care/Code/Local Layer/local.py`

Replace lines 30-32:

```python
# OLD (Windows paths):
INPUT_JSON = r"E:\Desktop\Hackathon\Json\local_input.json"
STATE_JSON = r"E:\Desktop\Hackathon\Json\local_state.json"
OUTPUT_JSON = r"E:\Desktop\Hackathon\Json\local_output.json"

# NEW (Linux paths):
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_JSON = os.path.join(BASE_DIR, "Json", "local_input.json")
STATE_JSON = os.path.join(BASE_DIR, "Json", "local_state.json")
OUTPUT_JSON = os.path.join(BASE_DIR, "Json", "local_output.json")
```

Similarly for **Final layer/final.py**:

```python
# OLD:
GLOBAL_JSON = r"E:\Desktop\Hackathon\Json\global_inference_output.json"
LOCAL_JSON = r"E:\Desktop\Hackathon\Json\local_output.json"
AGE_JSON = r"E:\Desktop\Hackathon\Json\account_age.json"
OUTPUT_JSON = r"E:\Desktop\Hackathon\Json\final_output.json"

# NEW:
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLOBAL_JSON = os.path.join(BASE_DIR, "Json", "global_inference_output.json")
LOCAL_JSON = os.path.join(BASE_DIR, "Json", "local_output.json")
AGE_JSON = os.path.join(BASE_DIR, "Json", "account_age.json")
OUTPUT_JSON = os.path.join(BASE_DIR, "Json", "final_output.json")
```

---

### **STEP 2: Add Python Service to Backend**

The file `/backend/src/services/pythonModels.js` has been created. It provides:

- `invokeLocalModel(dailyData, baseline, previousState)` - Runs local.py
- `invokeGlobalModel(dailyData, userProfile)` - Runs global_infer.py
- `invokeFinalModel(globalOutput, localOutput, accountAge)` - Runs final.py
- `runCompletePipeline(params)` - Orchestrates all three models

**Usage**:

```javascript
import { runCompletePipeline } from '../services/pythonModels.js';

const result = await runCompletePipeline({
  dailyData: { sleep_midpoint_min: 360, ... },
  baseline: { avg_sleep_midpoint_min: 360, ... },
  userProfile: { age: 45, sex: 'M' },
  accountAgeDays: 30,
  previousLocalState: null
});

console.log(result.final_output.final_deviation_score);
```

---

### **STEP 3: Update Daily Log Route**

**Two options**:

#### **Option A: Replace Entire Route** (Recommended)

Replace `/backend/src/routes/dailyLog.js` with the integrated version created in `/backend/src/routes/dailyLog_integrated.js`:

```bash
cp backend/src/routes/dailyLog_integrated.js backend/src/routes/dailyLog.js
```

This new version:

- ✅ Saves daily data to DB
- ✅ Fetches user profile and baseline
- ✅ Invokes ML pipeline
- ✅ Stores all outputs (daily_outputs, local_output_history, global_inference_outputs)
- ✅ Returns predictions immediately to frontend
- ✅ Handles errors gracefully

#### **Option B: Merge Manually**

If you have custom logic in the current `dailyLog.js`, add this after the DB insert:

```javascript
// After: await pool.query(...INSERT INTO daily_behavior_logs...)

// Add ML inference
const { runCompletePipeline } = await import('../services/pythonModels.js');

const baselineResult = await pool.query('SELECT * FROM user_baselines WHERE user_id = $1', [req.user_id]);
const profileResult = await pool.query('SELECT age, sex FROM user_profiles WHERE user_id = $1', [req.user_id]);
const accountAgeResult = await pool.query('SELECT EXTRACT(DAY FROM NOW() - created_at)::int as days FROM users WHERE id = $1', [req.user_id]);

const pipelineResult = await runCompletePipeline({
  dailyData: req.body,
  baseline: baselineResult.rows[0],
  userProfile: profileResult.rows[0],
  accountAgeDays: accountAgeResult.rows[0].days
});

// Store outputs in daily_outputs table
await pool.query('INSERT INTO daily_outputs ... VALUES ...', [...]);
```

---

### **STEP 4: Create/Update Output Route**

Create `/backend/src/routes/output.js`:

```javascript
import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET latest prediction
router.get("/latest", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT behavioral_date, deviation_score, risk_zone, explanation_text, 
              local_cumulative_deviation, local_signal_ready, created_at
       FROM daily_outputs
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT 1`,
      [req.user_id],
    );

    res.json({
      message: "Latest prediction",
      data: result.rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET prediction history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 365);
    const result = await pool.query(
      `SELECT behavioral_date, deviation_score, risk_zone, local_cumulative_deviation,
              local_signal_ready, created_at
       FROM daily_outputs
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT $2`,
      [req.user_id, limit],
    );

    res.json({
      message: "Prediction history",
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

**Register in** `/backend/src/index.js`:

```javascript
import outputRoutes from "./routes/output.js";
app.use("/output", outputRoutes);
```

---

### **STEP 5: Update Frontend API Service**

Add to `/frontend/src/services/api.ts`:

```typescript
// Output endpoints
export const outputApi = {
  getLatest: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/output/latest`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse(response);
  },

  getHistory: async (days: number = 30): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/output/history?limit=${days}`,
      {
        method: "GET",
        headers: getHeaders(true),
      },
    );
    return handleResponse(response);
  },
};
```

---

### **STEP 6: Update Frontend DailyEntryPage**

**File**: `/frontend/src/app/components/DailyEntryPage.tsx`

After form submission, handle the prediction response:

```typescript
import { outputApi, dailyLogApi } from "../../services/api";

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    // Construct daily log data
    const dailyLogData: DailyLog = {
      behavioral_date: new Date().toISOString().split("T")[0],
      sleep_midpoint_min: calculateSleepMidpoint(sleepTime, wakeTime),
      sleep_duration_min: parseFloat(calculateSleepDuration()),
      medication_times_min: calculateMedicationTimes(),
      dose_count: calculateMedicationTimes().length,
      mean_med_time_min: calculateMeanMedicationTime(),
      activity_duration_min: parseFloat(activityDuration),
      activity_MET: parseFloat(activityMET),
      activity_load: parseFloat(activityDuration) * parseFloat(activityMET),
      stress_level: parseInt(stressLevel),
      sleep_quality: parseInt(sleepQuality),
      medication_taken: Object.values(medication).some((v) => v === "taken"),
    };

    // Submit to backend
    const response = await dailyLogApi.submit(dailyLogData);

    if (response.data?.predicted && response.data?.prediction) {
      // Show prediction immediately
      const prediction = response.data.prediction;

      toast.success(`Status: ${prediction.risk_label}`);

      // Navigate to dashboard with prediction
      navigate("/dashboard", {
        state: {
          newPrediction: {
            score: prediction.deviation_score,
            riskZone: prediction.risk_zone,
            explanation: prediction.explanation,
            weights: prediction.model_weights,
          },
        },
      });
    } else {
      toast.info(response.message);
      navigate("/dashboard");
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Submission failed");
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### **STEP 7: Update Frontend DashboardPage**

**File**: `/frontend/src/app/components/DashboardPage.tsx`

Display predictions:

```typescript
import { outputApi, dailyLogApi } from "../../services/api";

interface PredictionData {
  behavioral_date: string;
  deviation_score: number;
  risk_zone: 'UP' | 'STABLE' | 'DOWN';
  explanation_text: string;
  local_cumulative_deviation: number;
}

export function DashboardPage() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictionHistory, setPredictionHistory] = useState<PredictionData[]>([]);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      const latest = await outputApi.getLatest();
      if (latest?.data) {
        setPrediction(latest.data);
      }

      const history = await outputApi.getHistory(7);
      if (history?.data) {
        setPredictionHistory(history.data);
      }
    } catch (err) {
      console.error("Failed to load predictions:", err);
    }
  };

  const getRiskColor = (riskZone: string) => {
    switch (riskZone) {
      case 'UP':
        return 'text-red-600';
      case 'DOWN':
        return 'text-green-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="space-y-6">
      {prediction && (
        <Card className="border-2">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Today's Status</h2>

            <div className={`text-3xl font-bold mb-2 ${getRiskColor(prediction.risk_zone)}`}>
              {prediction.risk_zone === 'UP' && '⚠️ Higher Risk'}
              {prediction.risk_zone === 'DOWN' && '✅ Improved'}
              {prediction.risk_zone === 'STABLE' && '➡️ Stable'}
            </div>

            <p className="text-gray-600 mb-4">{prediction.explanation_text}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Deviation Score</p>
                <p className="text-lg font-semibold">{prediction.deviation_score.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-500">Cumulative Deviation</p>
                <p className="text-lg font-semibold">{prediction.local_cumulative_deviation.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {predictionHistory.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Prediction History (7 days)</h2>

            <LineChart width={600} height={300} data={predictionHistory.map((p, i) => ({
              day: `Day ${i + 1}`,
              score: p.deviation_score,
              cumulative: p.local_cumulative_deviation
            }))}>
              <CartesianGrid />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#8884d8" name="Daily Score" />
              <Line type="monotone" dataKey="cumulative" stroke="#82ca9d" name="Cumulative" />
            </LineChart>
          </div>
        </Card>
      )}
    </div>
  );
}
```

---

## 🗄️ Database Tables Required

Ensure these tables exist in PostgreSQL:

```sql
-- Daily behavior logs (input data)
CREATE TABLE daily_behavior_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  behavioral_date DATE NOT NULL,
  sleep_midpoint_min INTEGER,
  sleep_duration_min NUMERIC,
  medication_times_min INTEGER[],
  dose_count INTEGER,
  mean_med_time_min INTEGER,
  activity_duration_min INTEGER,
  activity_MET NUMERIC,
  activity_load NUMERIC,
  stress_level INTEGER,
  sleep_quality INTEGER,
  medication_taken BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, behavioral_date)
);

-- Daily outputs (predictions)
CREATE TABLE daily_outputs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  behavioral_date DATE NOT NULL,
  phase TEXT,
  daily_deviation NUMERIC,
  local_cumulative_deviation NUMERIC,
  local_signal_ready BOOLEAN,
  deviation_score NUMERIC,
  deviation_direction INTEGER,
  risk_zone TEXT,
  explanation_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, behavioral_date)
);

-- Local model history
CREATE TABLE local_output_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  behavioral_date DATE NOT NULL,
  daily_deviation NUMERIC,
  cumulative_deviation NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Global model outputs
CREATE TABLE global_inference_outputs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  layer TEXT,
  phase TEXT,
  population_glucose_deviation_z NUMERIC,
  population_deviation INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🚀 Deployment Checklist

- [ ] **Step 1**: Fix Python file paths (local.py, final.py)
- [ ] **Step 2**: Install `pythonModels.js` in `/backend/src/services/`
- [ ] **Step 3**: Update `/backend/src/routes/dailyLog.js` (or replace with integrated version)
- [ ] **Step 4**: Create `/backend/src/routes/output.js`
- [ ] **Step 5**: Register output route in `/backend/src/index.js`
- [ ] **Step 6**: Update frontend `api.ts` with output endpoints
- [ ] **Step 7**: Update `DailyEntryPage.tsx` to handle predictions
- [ ] **Step 8**: Update `DashboardPage.tsx` to display predictions
- [ ] **Step 9**: Verify all database tables exist
- [ ] **Step 10**: Install Python dependencies:
  ```bash
  cd /home/fang/Downloads/DevSOC-Dia-Care
  source .venv/bin/activate
  pip install pandas numpy lightgbm scikit-learn joblib
  ```

---

## 🧪 Testing

### **Test 1: Backend Python Models**

```bash
cd /home/fang/Downloads/DevSOC-Dia-Care/Code

# Test local model
python3 "Local Layer/local.py"

# Test global model
python3 global_infer.py

# Test final layer
python3 "Final layer/final.py"
```

### **Test 2: Backend Daily Log Endpoint**

```bash
curl -X POST http://localhost:4000/daily-log \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sleep_midpoint_min": 360,
    "sleep_duration_min": 480,
    "dose_count": 1,
    "mean_med_time_min": 480,
    "activity_duration_min": 30,
    "activity_MET": 3.5,
    "activity_load": 105,
    "stress_level": 5,
    "sleep_quality": 4,
    "medication_taken": true
  }'
```

### **Test 3: Check Database Outputs**

```sql
SELECT * FROM daily_outputs WHERE user_id = YOUR_USER_ID ORDER BY behavioral_date DESC LIMIT 1;
SELECT * FROM local_output_history WHERE user_id = YOUR_USER_ID ORDER BY behavioral_date DESC LIMIT 5;
SELECT * FROM global_inference_outputs WHERE user_id = YOUR_USER_ID ORDER BY created_at DESC LIMIT 1;
```

---

## 🐛 Troubleshooting

| Issue                            | Solution                                                    |
| -------------------------------- | ----------------------------------------------------------- |
| Python not found                 | Check `python3 --version`, update PATH in pythonModels.js   |
| Model timeout                    | Increase timeout in pythonModels.js (default 30s)           |
| JSON files not found             | Verify `/Code/Json/` directory exists and is writable       |
| Missing dependencies             | Run `pip install pandas numpy lightgbm scikit-learn joblib` |
| Database connection errors       | Check PostgreSQL running, verify DATABASE_URL in .env       |
| Frontend not showing predictions | Check network tab in DevTools, verify API route registered  |
| Prediction always null           | Verify user has baseline data in DB                         |

---

## 📈 Next Optimizations

1. **Async Queue**: Use Bull/BullMQ for heavy Python jobs
2. **Caching**: Cache baseline calculations, reuse for same-day submissions
3. **Monitoring**: Add logging to track model performance
4. **Alerts**: Email/push notifications for high-risk predictions
5. **Performance**: Profile Python models, optimize hyperparameters
