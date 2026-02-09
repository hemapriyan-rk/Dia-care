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
  age_range TEXT,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE daily_behavior_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  log_date DATE NOT NULL,
  sleep_hours NUMERIC CHECK (sleep_hours BETWEEN 0 AND 24),
  sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
  activity_level INTEGER CHECK (activity_level BETWEEN 1 AND 5),
  medication_taken BOOLEAN,
  stress_level INTEGER CHECK (stress_level BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, log_date)
);

CREATE TABLE daily_outputs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  log_date DATE NOT NULL,
  deviation_score NUMERIC,
  deviation_direction TEXT,
  risk_zone TEXT,
  explanation_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, log_date)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_logs_user_date ON daily_behavior_logs(user_id, log_date);
CREATE INDEX idx_outputs_user_date ON daily_outputs(user_id, log_date);
