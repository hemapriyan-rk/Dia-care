#!/bin/bash

# Exit on error
set -e

PORT=4000
BASE_URL="http://localhost:$PORT"

# 1. Register user
echo "Registering user frank@gmail.com..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{ "email": "frank@gmail.com", "password": "frank123", "passwordConfirm": "frank123" }')

echo "Register response: $REGISTER_RESPONSE"

TOKEN=$(echo $REGISTER_RESPONSE | jq -r .token)

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "Failed to get token from registration response."
  exit 1
fi

# 2. Create user profile
echo "Creating profile for Frank..."
PROFILE_RESPONSE=$(curl -s -X POST "$BASE_URL/user-profiles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "full_name": "Frank", "age": 43, "sex": "Male" }')

echo "Profile response: $PROFILE_RESPONSE"

# 3. Create a daily log to generate deviation
echo "Creating daily log..."
DAILY_LOG_RESPONSE=$(curl -s -X POST "$BASE_URL/daily-log" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "behavioral_date": "2024-05-18", "sleep_midpoint_min": 180, "sleep_duration_min": 480, "medication_times_min": [480, 1080], "dose_count": 2, "mean_med_time_min": 780, "activity_duration_min": 60, "activity_MET": 3, "activity_load": 180, "stress_level": 3, "sleep_quality": 4, "medication_taken": true }')

echo "Daily log response: $DAILY_LOG_RESPONSE"

# 4. Fetch user profile
echo "Fetching user profile..."
FETCH_PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/user-profiles" \
  -H "Authorization: Bearer $TOKEN")

echo "User profile: $FETCH_PROFILE_RESPONSE"

# 5. Fetch daily output/deviation
echo "Fetching daily output..."
FETCH_OUTPUT_RESPONSE=$(curl -s -X GET "$BASE_URL/daily-log/latest" \
  -H "Authorization: Bearer $TOKEN")

echo "Daily output: $FETCH_OUTPUT_RESPONSE"
