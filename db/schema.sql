CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  full_name TEXT,
  age INTEGER,
  sex TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_baselines (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  avg_sleep_hours NUMERIC,
  avg_activity_score NUMERIC,
  med_adherence_pct NUMERIC CHECK (med_adherence_pct BETWEEN 0 AND 100),
  typical_sleep_window TEXT,
  avg_sleep_midpoint_min INTEGER,
  avg_sleep_duration_min INTEGER,
  avg_activity_MET NUMERIC,
  avg_activity_duration_min INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
  stress_level INTEGER CHECK (stress_level BETWEEN 0 AND 5),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  medication_taken BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, behavioral_date)
);

CREATE TABLE daily_outputs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  behavioral_date DATE NOT NULL,
  phase TEXT,
  daily_deviation NUMERIC,
  local_cumulative_deviation NUMERIC,
  local_signal_ready BOOLEAN,
  deviation_score NUMERIC,
  deviation_direction TEXT,
  risk_zone TEXT,
  explanation_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, behavioral_date)
);

CREATE TABLE local_output_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  behavioral_date DATE NOT NULL,
  daily_deviation NUMERIC,
  cumulative_deviation NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE final_outputs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  days_since_account_creation INTEGER,
  global_weight NUMERIC,
  local_weight NUMERIC,
  global_deviation NUMERIC,
  local_cumulative_deviation NUMERIC,
  final_deviation_score NUMERIC,
  final_deviation INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_logs_user_date ON daily_behavior_logs(user_id, behavioral_date);
CREATE INDEX idx_outputs_user_date ON daily_outputs(user_id, behavioral_date);
CREATE INDEX idx_local_history_user_date ON local_output_history(user_id, behavioral_date);

