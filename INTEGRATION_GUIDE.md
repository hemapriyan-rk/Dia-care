# DevSOC Dia-Care - Complete Integration Guide

## 📋 System Architecture Overview

Your application follows a **3-layer architecture** with data flow from frontend → backend → Python ML models:

```
Frontend (React/TypeScript)
    ↓ (API calls)
Backend (Node.js/Express)
    ↓ (invoke models)
Python Models (LightGBM, Local, Final Layer)
    ↓ (results)
Database (PostgreSQL)
    ↓ (display)
Frontend Dashboard
```

---

## 🏗️ Architecture Components

### **1. Frontend Layer** (`/frontend`)

- **Framework**: React + TypeScript (Vite)
- **Key Files**:
  - `src/services/api.ts` - Centralized API client
  - `src/app/components/DailyEntryPage.tsx` - Daily data entry form
  - `src/app/components/DashboardPage.tsx` - Results display
  - `src/contexts/AuthContext.tsx` - Authentication state

### **2. Backend Layer** (`/backend`)

- **Framework**: Node.js + Express (ESM)
- **Key Routes**:
  - `/auth` - Authentication (login)
  - `/baseline` - User baseline metrics
  - `/daily-log` - Daily behavioral data submission
  - `/history` - Retrieve historical data
  - `/global-inference` - Global model outputs
  - `/local-history` - Local model history
  - `/output` - Final predictions
  - `/account-age` - User account age

### **3. ML Models Layer** (`/Code`)

- **global.py** - Trains global LightGBM model
- **global_infer.py** - Global inference execution
- **Local Layer/local.py** - Local adaptive baseline tracking
- **Final layer/final.py** - Combines global + local outputs

### **4. Database Layer** (`/db`)

- **PostgreSQL** with tables for:
  - User profiles and authentication
  - Daily behavior logs
  - Baseline metrics
  - Local/Global inference outputs
  - Final predictions

---

## 🔄 Complete Data Flow

### **Step 1: User Authentication**

```
Frontend → POST /auth/login
Backend: Validates credentials, returns JWT token
Frontend: Stores token in localStorage
```

**API Call** (`frontend/src/services/api.ts`):

```typescript
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify(credentials),
    });
    return handleResponse<LoginResponse>(response);
  },
};
```

---

### **Step 2: User Baseline Setup**

```
Frontend → POST /baseline
Backend: Stores initial baseline metrics in DB
Frontend: Displays baseline on dashboard
```

**Required Data** (`DailyEntryPage.tsx`):

```typescript
interface UserBaseline {
  avg_sleep_hours: number;
  avg_activity_score: number;
  med_adherence_pct: number;
  typical_sleep_window: string;
  avg_sleep_midpoint_min: number;
  avg_sleep_duration_min: number;
  avg_activity_MET: number;
  avg_activity_duration_min: number;
}
```

---

### **Step 3: Daily Data Entry & Processing**

#### **3a. Frontend collects daily data**

```tsx
// DailyEntryPage.tsx calculates:
- Sleep time → sleep_midpoint_min, sleep_duration_min
- Medication adherence → dose_count, mean_med_time_min
- Activity → activity_duration_min, activity_MET, activity_load
- Stress & sleep quality scores
```

#### **3b. Submit to backend**

```
Frontend → POST /daily-log
Backend: Inserts into daily_behavior_logs table
```

**Data Structure** (`api.ts`):

```typescript
interface DailyLog {
  behavioral_date: string;
  sleep_midpoint_min: number;
  sleep_duration_min: number;
  medication_times_min?: number[];
  dose_count: number;
  mean_med_time_min: number;
  activity_duration_min: number;
  activity_MET: number;
  activity_load: number;
  stress_level: number;
  sleep_quality: number;
  medication_taken: boolean;
}
```

---

### **Step 4: Invoke Python Models**

#### **⚠️ MISSING INTEGRATION - This is what needs to be added!**

Currently, the Python models are **NOT automatically invoked** by the backend. You need to:

#### **Option A: Node.js executes Python (Recommended)**

Add Python execution in backend routes:

```javascript
// backend/src/routes/dailyLog.js - Add after DB insert
const { spawn } = require("child_process");
const path = require("path");

// After saving to DB, invoke Python models
async function invokeModels(userId, dailyData, baseline) {
  try {
    // 1. Create input JSON for models
    const userInput = {
      user_id: userId,
      age: userProfile.age,
      sex: userProfile.sex,
      ...dailyData,
      baseline: baseline,
    };

    // 2. Run local.py
    const localOutput = await runPythonScript("local.py", userInput);

    // 3. Run global_infer.py
    const globalOutput = await runPythonScript("global_infer.py", userInput);

    // 4. Run final.py
    const finalOutput = await runPythonScript("final.py", {
      global_output: globalOutput,
      local_output: localOutput,
      account_age: accountAge,
    });

    // 5. Store results in DB
    await saveInferenceResults(userId, finalOutput);

    return finalOutput;
  } catch (err) {
    console.error("Model invocation failed:", err);
    throw err;
  }
}
```

#### **Option B: Python Flask API Server**

Create a separate Python Flask service that backend calls via HTTP:

```python
# Backend calls:
POST /api/infer/local
POST /api/infer/global
POST /api/infer/final
```

---

### **Step 5: Local Model Processing**

**Input**: Daily behavioral data + Historical baseline

**Process** (`Local Layer/local.py`):

```python
FEATURES = [
    "sleep_midpoint_min",
    "sleep_duration_min",
    "mean_med_time_min",
    "activity_load"
]

# Computes deviations from baseline with exponential decay
daily_deviation = weighted_distance(today_values, baseline_values)

# Adaptively updates baseline using BASELINE_ADAPT_ALPHA = 0.02
baseline = (1 - α) * old_baseline + α * today_values

# Tracks cumulative deviation over time
cumulative_deviation += daily_deviation * (DECAY ** days_since_baseline)
```

**Output**:

```json
{
  "local_daily_deviation": 0.25,
  "local_cumulative_deviation": 1.5,
  "local_signal_ready": true,
  "updated_baseline": {...}
}
```

---

### **Step 6: Global Model Processing**

**Input**: Current daily data + User demographics

**Process** (`global_infer.py`):

```python
# Features for LightGBM model:
X = [age, sex, sleep_midpoint_min, sleep_duration_min,
     dose_count, mean_med_time_min, activity_duration_min,
     activity_MET, activity_load]

# Inference
prediction = model.predict(X)  # glucose_proxy_deviation_z score
```

**Output**:

```json
{
  "population_glucose_deviation_z": -0.5,
  "population_deviation": -1
}
```

---

### **Step 7: Final Layer Combination**

**Input**: Global + Local outputs + Account age

**Process** (`Final layer/final.py`):

```python
# Weighting changes with account age:
if days <= 20:
    w_global, w_local = 0.9, 0.1  # Trust population model
elif days <= 60:
    w_global, w_local = 0.6, 0.4  # Balanced
else:
    w_global, w_local = 0.0, 1.0  # Trust user's patterns

# Combine predictions
final_score = w_global * global_dev + w_local * local_dev

# Discretize to risk categories
final_label = {
    score <= -1.5: -1,  # Risk DOWN
    -1.5 < score < 1.5: 0,  # STABLE
    score >= 1.5: 1  # Risk UP
}
```

**Output**:

```json
{
  "user_id": 123,
  "final_deviation_score": 0.35,
  "final_deviation": 0,  # STABLE
  "weights": {"global": 0.6, "local": 0.4},
  "days_since_account_creation": 45
}
```

---

## 🔌 Required Integration Tasks

### **1. Create Python Model Wrapper Service**

**File**: `backend/src/services/pythonModels.js`

```javascript
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PYTHON_DIR = path.join(__dirname, "../../..", "Code");

export async function invokeLocalModel(dailyData, baseline) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(PYTHON_DIR, "Local Layer", "local.py");

    // Write input to JSON
    const inputFile = path.join(PYTHON_DIR, "Json", "local_input.json");
    fs.writeFileSync(
      inputFile,
      JSON.stringify({
        ...dailyData,
        baseline,
      }),
    );

    const python = spawn("python", [pythonScript]);
    let output = "";
    let error = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      error += data.toString();
    });

    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Local model failed: ${error}`));
      } else {
        const resultFile = path.join(PYTHON_DIR, "Json", "local_output.json");
        const result = JSON.parse(fs.readFileSync(resultFile, "utf-8"));
        resolve(result);
      }
    });
  });
}

export async function invokeGlobalModel(dailyData, userProfile) {
  // Similar pattern for global_infer.py
}

export async function invokeFinalModel(globalOutput, localOutput, accountAge) {
  // Similar pattern for final.py
}
```

---

### **2. Update Daily Log Route to Trigger Models**

**File**: `backend/src/routes/dailyLog.js`

```javascript
import {
  invokeLocalModel,
  invokeGlobalModel,
  invokeFinalModel,
} from "../services/pythonModels.js";

// After daily log is saved:
try {
  // Get baseline for this user
  const baselineResult = await pool.query(
    "SELECT * FROM user_baselines WHERE user_id = $1",
    [req.user_id],
  );
  const baseline = baselineResult.rows[0];

  // Get user profile for demographics
  const profileResult = await pool.query(
    "SELECT age, sex FROM user_profiles WHERE user_id = $1",
    [req.user_id],
  );
  const profile = profileResult.rows[0];

  // Get account age
  const accountAgeResult = await pool.query(
    "SELECT EXTRACT(DAY FROM NOW() - created_at)::int as days FROM users WHERE id = $1",
    [req.user_id],
  );
  const accountAge = accountAgeResult.rows[0].days;

  // Invoke models
  const localOutput = await invokeLocalModel(req.body, baseline);
  const globalOutput = await invokeGlobalModel(req.body, profile);
  const finalOutput = await invokeFinalModel(
    globalOutput,
    localOutput,
    accountAge,
  );

  // Save results to DB
  await pool.query(
    `INSERT INTO daily_outputs 
    (user_id, behavioral_date, daily_deviation, local_cumulative_deviation, 
     local_signal_ready, deviation_score, deviation_direction)
    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      req.user_id,
      dateToUse,
      finalOutput.final_deviation_score,
      localOutput.local_cumulative_deviation,
      localOutput.local_signal_ready,
      finalOutput.final_deviation_score,
      getFinalDirection(finalOutput.final_deviation),
    ],
  );
} catch (err) {
  console.error("Model invocation error:", err);
  // Return partial success - data saved but models failed
}
```

---

### **3. Create Output Retrieval Endpoints**

**File**: `backend/src/routes/output.js`

```javascript
// GET /output/latest - Get today's prediction
router.get("/latest", authMiddleware, async (req, res) => {
  const result = await pool.query(
    `SELECT deviation_score, deviation_direction, risk_zone, explanation_text, created_at
     FROM daily_outputs 
     WHERE user_id = $1 
     ORDER BY created_at DESC LIMIT 1`,
    [req.user_id],
  );
  res.json(result.rows[0]);
});

// GET /output/history - Get past N predictions
router.get("/history", authMiddleware, async (req, res) => {
  const limit = req.query.limit || 30;
  const result = await pool.query(
    `SELECT behavioral_date, deviation_score, deviation_direction 
     FROM daily_outputs 
     WHERE user_id = $1 
     ORDER BY behavioral_date DESC 
     LIMIT $2`,
    [req.user_id, limit],
  );
  res.json(result.rows);
});
```

---

### **4. Update Frontend to Display Results**

**File**: `frontend/src/services/api.ts`

```typescript
export const outputApi = {
  getLatest: async (): Promise<OutputPrediction> => {
    const response = await fetch(`${API_BASE_URL}/output/latest`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<OutputPrediction>(response);
  },

  getHistory: async (days: number = 30): Promise<OutputPrediction[]> => {
    const response = await fetch(
      `${API_BASE_URL}/output/history?limit=${days}`,
      {
        method: "GET",
        headers: getHeaders(true),
      },
    );
    return handleResponse<OutputPrediction[]>(response);
  },
};
```

**File**: `frontend/src/app/components/DailyEntryPage.tsx`

```typescript
// After daily log submission succeeds:
const response = await dailyLogApi.submit(dailyLogData);

// Show prediction immediately
if (response.prediction) {
  toast.success(
    `Status: ${getPredictionLabel(response.prediction.deviation_direction)}`,
  );
  navigate("/dashboard", {
    state: { newPrediction: response.prediction },
  });
} else {
  toast.success("Data saved, awaiting model prediction");
  setTimeout(() => navigate("/dashboard"), 2000);
}
```

---

## 📊 Model Parameters Reference

### **Global Model (LightGBM)**

- **Target**: `glucose_proxy_deviation_z` (continuous)
- **Hyperparameters**:
  - n_estimators: 600
  - learning_rate: 0.05
  - num_leaves: 48
  - subsample: 0.8
  - colsample_bytree: 0.8
- **Input Features**: 9 features (age, sex, sleep, medication, activity)
- **Training**: GroupKFold (5 splits by subject)

### **Local Model**

- **Tracking**: Adaptive exponential baseline with decay
- **Alpha**: 0.02 (adaptation rate)
- **Decay**: 0.95 (daily decay of old deviations)
- **Min Days for Baseline**: 7 days

### **Final Layer**

- **Weighting Strategy**: Time-dependent
  - 0-20 days: 90% global, 10% local
  - 20-60 days: 60% global, 40% local
  - 60+ days: 0% global, 100% local

---

## 🐛 Troubleshooting Integration

### **Issue: Python models not found**

```bash
# Check paths in pythonModels.js match your directory structure
ls -la /home/fang/Downloads/DevSOC-Dia-Care/Code/
```

### **Issue: JSON input/output files not syncing**

- Ensure all Python scripts write to `Json/` directory
- Backend should read written files immediately
- Use absolute paths, not relative

### **Issue: Models timeout**

- Add timeout parameter to spawn:
  ```javascript
  const python = spawn("python", [script], { timeout: 30000 });
  ```

### **Issue: Database connection in models**

- Python models currently use JSON files, not DB
- To use DB directly from Python:
  ```bash
  pip install psycopg2-binary
  ```

---

## 📝 Required Environment Variables

**.env** (Backend):

```
DATABASE_URL=postgresql://user:password@localhost/diacare
JWT_SECRET=your_secret_key_here
PORT=4000
PYTHON_PATH=/usr/bin/python3
MODEL_DIR=/path/to/Code
```

**.env** (Frontend - .env.local):

```
VITE_API_URL=http://localhost:4000
```

---

## ✅ Integration Checklist

- [ ] Create `backend/src/services/pythonModels.js`
- [ ] Update `backend/src/routes/dailyLog.js` to invoke models
- [ ] Create/update `backend/src/routes/output.js` for result retrieval
- [ ] Add Python service integration tests
- [ ] Update frontend API types for model outputs
- [ ] Update DashboardPage to fetch and display predictions
- [ ] Fix Python model file paths (Windows → Linux paths)
- [ ] Add error handling for model failures
- [ ] Database cleanup/initialization for all tables
- [ ] Environment variable configuration

---

## 🚀 Next Steps

1. **Implement Python wrapper service** (Step 1)
2. **Test local model execution** with sample data
3. **Add database storage** for all outputs
4. **Create frontend components** to display results
5. **End-to-end testing** of full data flow
6. **Performance optimization** (caching, async processing)
7. **Add monitoring/logging** for model outputs
8. **Production deployment** considerations
