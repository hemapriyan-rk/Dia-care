# Quick Start Guide - User Registration & Profile Setup

## What Changed

### ✅ Registration is Now Two-Step

1. **Step 1 (Register)**: User creates account
   - Backend only creates users table entry
   - Returns token + flag: `requires_profile_setup: true`
2. **Step 2 (Profile Setup)**: User completes profile
   - User enters: full_name, age, sex
   - System auto-adds: timestamp (created_at)
   - Then user accesses Dashboard

## Files Created

| File                                                | Purpose                                |
| --------------------------------------------------- | -------------------------------------- |
| `/backend/src/routes/userProfiles.js`               | Profile API endpoints (POST, GET, PUT) |
| `/frontend/src/app/components/ProfileSetupPage.tsx` | Profile completion form                |

## Files Modified

| File                                         | Changes                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `/backend/src/routes/auth.js`                | Register no longer auto-creates profile         |
| `/backend/src/index.js`                      | Added userProfiles route registration           |
| `/frontend/src/app/components/LoginPage.tsx` | Redirect to ProfileSetupPage after signup       |
| `/frontend/src/app/App.tsx`                  | Added /profile-setup route                      |
| `/frontend/src/services/api.ts`              | Added profileApi with create/get/update methods |

## API Endpoints

### Backend

| Endpoint         | Method | Purpose                 | Auth |
| ---------------- | ------ | ----------------------- | ---- |
| `/auth/register` | POST   | Create new user account | No   |
| `/user-profiles` | POST   | Create user profile     | Yes  |
| `/user-profiles` | GET    | Get user's profile      | Yes  |
| `/user-profiles` | PUT    | Update user profile     | Yes  |

### Request/Response Examples

**Register User:**

```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "passwordConfirm": "password123"
}

Response:
{
  "token": "JWT_TOKEN_HERE",
  "user_id": "12",
  "message": "User created successfully. Please complete your profile.",
  "requires_profile_setup": true
}
```

**Create Profile:**

```bash
POST /user-profiles
Authorization: Bearer JWT_TOKEN_HERE
{
  "full_name": "John Doe",
  "age": 30,
  "sex": "Male"
}

Response:
{
  "message": "Profile created successfully",
  "profile": {
    "id": "4",
    "user_id": "12",
    "full_name": "John Doe",
    "age": 30,
    "sex": "Male",
    "created_at": "2026-02-10T00:32:52.212Z"
  }
}
```

## How to Test

### Option 1: Via Frontend

1. Start backend: `cd backend && node src/index.js`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173
4. Click "Sign Up"
5. Enter email/password → Sign Up
6. Fill profile → Complete Setup
7. Redirects to Dashboard ✅

### Option 2: Via Terminal (curl)

```bash
# 1. Register user
TOKEN=$(curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","passwordConfirm":"pass123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# 2. Create profile
curl -s -X POST http://localhost:4000/user-profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","age":25,"sex":"Female"}'

# 3. Get profile
curl -s -X GET http://localhost:4000/user-profiles \
  -H "Authorization: Bearer $TOKEN"

# 4. Update profile
curl -s -X PUT http://localhost:4000/user-profiles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Updated Name","age":26,"sex":"Female"}'
```

## Key Features

✅ **Automatic Timestamp** - Database auto-generates `created_at` (no frontend tampering)
✅ **Separate Setup Page** - Clean UX with explicit profile completion
✅ **Auto-Create Baseline** - New profiles get default baseline data
✅ **Edit Support** - Users can update profile after login (future: add dashboard button)
✅ **Full Validation** - Age range, required fields, all checked
✅ **Error Handling** - User-friendly error messages
✅ **Protected Routes** - Profile setup requires valid token

## Database

### Auto-Timestamp Field

```sql
-- user_profiles table now has:
created_at TIMESTAMP DEFAULT NOW()

-- This is generated automatically by PostgreSQL
-- Frontend does NOT send this in request body
-- Update queries do NOT modify created_at
```

### Default Baseline

```javascript
// Created automatically when profile is created:
avg_sleep_hours: 7.5;
avg_activity_score: 50;
med_adherence_pct: 80;
typical_sleep_window: "22:00-06:00";
// ... plus other defaults
```

## Common Issues & Solutions

| Issue                         | Solution                                                            |
| ----------------------------- | ------------------------------------------------------------------- |
| 404 on /user-profiles         | Backend not restarted after changes. Run `node src/index.js` again  |
| Token invalid for profile     | Make sure token from registration response is used                  |
| Profile creation fails        | Check all 3 fields provided: full_name, age, sex. Age must be 0-150 |
| created_at wrong format       | This is ISO 8601 format from PostgreSQL. Normal. ✅                 |
| User can't login after signup | Profile is required. Complete setup page first. ✅                  |

## Next Steps

1. ✅ Backend ready - registration and profile endpoints working
2. ✅ Frontend ready - ProfileSetupPage component integrated
3. ✅ Routes ready - /profile-setup route created and protected
4. 🔜 Test - Open browser and test signup → profile setup flow
5. 🔜 Feedback - Report any issues or desired changes

## Questions?

Refer to:

- Full docs: `/PROFILE_SETUP_IMPLEMENTATION.md`
- Backend: `/backend/src/routes/userProfiles.js`
- Frontend: `/frontend/src/app/components/ProfileSetupPage.tsx`
- API service: `/frontend/src/services/api.ts`
