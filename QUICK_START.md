# Quick Start - Testing the Integration

## 1. Start Backend
```bash
cd /home/fang/Downloads/DevSOC-Dia-Care/backend
node src/index.js
```
✓ Should see: "Server running on port 4000"

## 2. Start Frontend
```bash
cd /home/fang/Downloads/DevSOC-Dia-Care/frontend
npm run dev
```
✓ Should see: "Local: http://localhost:5173"

## 3. Test Backend Health
```bash
curl http://localhost:4000/health
```
✓ Should return: `{"status":"OK"}`

## 4. Test Python Models
```bash
# Create test input
cat > /tmp/test_input.json << 'INNER_EOF'
{
  "user_id": 1,
  "behavioral_date": "2026-02-10",
  "sleep_midpoint_min": 360,
  "sleep_duration_min": 480,
  "mean_med_time_min": 480,
  "activity_load": 105
}
INNER_EOF

# Copy to Json directory
cp /tmp/test_input.json /home/fang/Downloads/DevSOC-Dia-Care/Code/Json/local_input.json

# Run local model
python3 "/home/fang/Downloads/DevSOC-Dia-Care/Code/Local Layer/local.py"
```

✓ Should see JSON output with:
- phase: "active" or "baseline"
- daily_deviation: (some number)
- local_cumulative_deviation: (some number)
- local_signal_ready: true/false

## 5. Test Frontend Flow
1. Open http://localhost:5173
2. Login with test credentials
3. Go to "Daily Entry"
4. Fill in the form:
   - Sleep time: 22:00
   - Wake time: 06:30
   - Stress level: 5
   - Sleep quality: 4
   - Activity duration: 30 min
   - Activity MET: 3.5
   - Medication: Select "taken"
5. Click "Submit"
6. Should see toast: "Status: Stable" (or whatever prediction)
7. Redirects to Dashboard
8. Dashboard shows:
   - Today's Status card with risk zone
   - Deviation score
   - Explanation text
   - 7-day trend chart (if data exists)

## 6. Database Check
```bash
# Login to psql
psql -U your_user -d diacare -h localhost

# Check saved data
SELECT * FROM daily_behavior_logs ORDER BY created_at DESC LIMIT 1;
SELECT * FROM daily_outputs ORDER BY created_at DESC LIMIT 1;
SELECT * FROM local_output_history ORDER BY created_at DESC LIMIT 1;
SELECT * FROM global_inference_outputs ORDER BY created_at DESC LIMIT 1;
```

## 7. API Testing with curl
```bash
# Get auth token (test user)
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# Submit daily log
curl -X POST http://localhost:4000/daily-log \
  -H "Authorization: Bearer $TOKEN" \
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
  }' | jq

# Get latest prediction
curl -X GET http://localhost:4000/output/latest \
  -H "Authorization: Bearer $TOKEN" | jq

# Get prediction history
curl -X GET "http://localhost:4000/output/history?limit=7" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## 8. Logs to Check

Backend logs:
```bash
tail -f /tmp/backend.log
```

Frontend console:
Open Developer Tools → Console tab in browser

Python execution output:
Check `/home/fang/Downloads/DevSOC-Dia-Care/Code/Json/` for:
- local_output.json
- global_inference_output.json
- final_output.json

## Troubleshooting

**Backend won't start**
- Check DATABASE_URL in .env
- Check PostgreSQL is running: `pg_isready`
- Check port 4000 not in use: `lsof -i :4000`

**Python models fail**
- Check paths are correct: `ls /home/fang/Downloads/DevSOC-Dia-Care/Code/Json/`
- Run python3 directly: `python3 "/home/fang/Downloads/DevSOC-Dia-Care/Code/Local Layer/local.py"`
- Check dependencies: `pip list | grep -E "pandas|numpy|lightgbm"`

**Frontend can't connect**
- Check backend is running: `curl http://localhost:4000/health`
- Check VITE_API_URL in frontend .env
- Check browser console for CORS errors

**No predictions after submission**
- Check backend logs for model execution errors
- Verify user has baseline set: Check user_baselines table
- Check daily_behavior_logs table for saved data
- Try running model directly with test data

**Database has no data**
- Check DATABASE_URL connection string
- Run schema: `psql -f db/schema.sql`
- Check user exists: `SELECT * FROM users;`
