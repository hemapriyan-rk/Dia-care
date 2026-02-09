/**
 * Complete API Types for Dia-Care Application
 * Defines all request/response interfaces for frontend-backend communication
 */

// ============================================================================
// AUTH TYPES
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user_id: number;
}

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

export interface UserProfile {
  id: number;
  user_id: number;
  full_name?: string;
  age?: number;
  sex?: "M" | "F";
  created_at: string;
}

// ============================================================================
// BASELINE TYPES
// ============================================================================

export interface UserBaseline {
  id?: number;
  user_id?: number;
  avg_sleep_hours?: number;
  avg_activity_score?: number;
  med_adherence_pct?: number;
  typical_sleep_window?: string;
  avg_sleep_midpoint_min?: number;
  avg_sleep_duration_min?: number;
  avg_activity_MET?: number;
  avg_activity_duration_min?: number;
  created_at?: string;
}

// ============================================================================
// DAILY LOG TYPES
// ============================================================================

export interface DailyLog {
  behavioral_date?: string;
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

export interface DailyLogSubmissionResponse {
  message: string;
  data: {
    user_id: number;
    behavioral_date: string;
    saved: boolean;
    predicted: boolean;
    prediction?: PredictionResult;
    models?: {
      local: LocalModelOutput;
      global: GlobalModelOutput;
    };
    error?: string;
    reason?: string;
  };
}

// ============================================================================
// HISTORY TYPES
// ============================================================================

export interface HistoryEntry {
  id?: number;
  user_id?: number;
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
  created_at?: string;
  updated_at?: string;
}

export interface HistoryResponse {
  message: string;
  data: HistoryEntry[];
}

// ============================================================================
// MODEL OUTPUT TYPES
// ============================================================================

// Local Model Output
export interface LocalModelOutput {
  local_daily_deviation?: number;
  local_cumulative_deviation?: number;
  local_signal_ready?: boolean;
  updated_baseline?: {
    sleep_midpoint_min: number;
    sleep_duration_min: number;
    mean_med_time_min: number;
    activity_load: number;
  };
  days_observed?: number;
}

// Global Model Output
export interface GlobalModelOutput {
  population_glucose_deviation_z?: number;
  population_deviation?: number;
  layer?: string;
  phase?: string;
}

// Final Model Output
export interface FinalModelOutput {
  user_id?: number;
  final_deviation_score: number;
  final_deviation: -1 | 0 | 1; // -1: DOWN, 0: STABLE, 1: UP
  days_since_account_creation?: number;
  weights?: {
    global: number;
    local: number;
  };
  global_deviation?: number;
  local_cumulative_deviation?: number;
}

// ============================================================================
// PREDICTION & OUTPUT TYPES
// ============================================================================

export interface PredictionResult {
  deviation_score: number;
  risk_zone: "UP" | "STABLE" | "DOWN";
  risk_label: "Higher Risk" | "Stable" | "Lower Risk" | "Unknown";
  explanation: string;
  model_weights?: {
    global: number;
    local: number;
  };
  account_age_days?: number;
}

export interface DailyOutput {
  id?: number;
  user_id?: number;
  behavioral_date: string;
  phase?: string;
  daily_deviation?: number;
  local_cumulative_deviation?: number;
  local_signal_ready?: boolean;
  deviation_score: number;
  deviation_direction: -1 | 0 | 1;
  risk_zone: "UP" | "STABLE" | "DOWN";
  explanation_text: string;
  created_at?: string;
}

export interface DailyOutputResponse {
  message: string;
  data?: DailyOutput;
  count?: number;
}

// ============================================================================
// GLOBAL INFERENCE TYPES
// ============================================================================

export interface GlobalInferenceOutput {
  id?: number;
  user_id?: number;
  layer: string;
  phase?: string;
  population_glucose_deviation_z: number;
  population_deviation: number;
  created_at?: string;
}

export interface GlobalInferenceResponse {
  message: string;
  data?: GlobalInferenceOutput | GlobalInferenceOutput[];
}

// ============================================================================
// LOCAL HISTORY TYPES
// ============================================================================

export interface LocalOutputHistory {
  id?: number;
  user_id?: number;
  behavioral_date: string;
  daily_deviation?: number;
  cumulative_deviation: number;
  created_at?: string;
}

export interface LocalHistoryResponse {
  message: string;
  data?: LocalOutputHistory[];
  count?: number;
}

// ============================================================================
// ACCOUNT AGE TYPES
// ============================================================================

export interface AccountAge {
  user_id: number;
  account_age_days: number;
  days_since_account_creation?: number;
  created_at?: string;
}

export interface AccountAgeResponse {
  message: string;
  data?: AccountAge;
}

// ============================================================================
// FINAL OUTPUT TYPES
// ============================================================================

export interface FinalOutput {
  id?: number;
  user_id: number;
  days_since_account_creation: number;
  global_weight: number;
  local_weight: number;
  global_deviation: number;
  local_cumulative_deviation: number;
  final_deviation_score: number;
  final_deviation: -1 | 0 | 1;
  created_at?: string;
}

export interface FinalOutputResponse {
  message: string;
  data?: FinalOutput | FinalOutput[];
  count?: number;
}

// ============================================================================
// AGGREGATE DASHBOARD TYPES
// ============================================================================

export interface DashboardData {
  baseline: UserBaseline | null;
  accountAge: AccountAge | null;
  recentEntries: HistoryEntry[];
  latestPrediction: DailyOutput | null;
  predictionHistory: DailyOutput[];
  stability: number;
  riskTrend: ("UP" | "STABLE" | "DOWN")[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  error: string;
  details?: string;
  data?: any;
}

export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  details?: string;
  count?: number;
}

// ============================================================================
// FORM SUBMISSION TYPES
// ============================================================================

export interface BaselineFormData {
  avg_sleep_hours: string;
  avg_activity_score: string;
  med_adherence_pct: string;
  typical_sleep_window: string;
  avg_sleep_midpoint_min: string;
  avg_sleep_duration_min: string;
  avg_activity_MET: string;
  avg_activity_duration_min: string;
}

export interface DailyEntryFormData {
  sleepTime: string;
  wakeTime: string;
  stressLevel: string;
  sleepQuality: string;
  activityType: string;
  activityDuration: string;
  activityMET: string;
  medication: {
    morning: "taken" | "missed";
    afternoon: "taken" | "missed";
    night: "taken" | "missed";
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type RiskCategory = -1 | 0 | 1;

export interface TrendData {
  day: string;
  stability: number;
  riskScore?: number;
  deviation?: number;
}

export interface ChartData {
  date: string;
  value: number;
  label?: string;
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

/**
 * Type Summary:
 *
 * Request Types:
 * - LoginCredentials
 * - UserBaseline
 * - DailyLog
 * - DailyEntryFormData
 * - BaselineFormData
 *
 * Response Types:
 * - LoginResponse
 * - DailyLogSubmissionResponse
 * - GlobalInferenceResponse
 * - LocalHistoryResponse
 * - DailyOutputResponse
 * - FinalOutputResponse
 *
 * Data Model Types:
 * - UserProfile
 * - HistoryEntry
 * - DailyOutput
 * - GlobalInferenceOutput
 * - LocalOutputHistory
 * - FinalOutput
 *
 * ML Model Output Types:
 * - LocalModelOutput
 * - GlobalModelOutput
 * - FinalModelOutput
 * - PredictionResult
 *
 * Composite Types:
 * - DashboardData
 * - TrendData
 * - ChartData
 *
 * Error Types:
 * - ApiError
 * - ApiResponse<T>
 */
