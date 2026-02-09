/**
 * API Service
 * Centralized API calls to backend
 */

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:4000";

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user_id: number;
}

export interface UserBaseline {
  avg_sleep_hours: number;
  avg_activity_score: number;
  med_adherence_pct: number;
  typical_sleep_window: string;
  avg_sleep_midpoint_min: number;
  avg_sleep_duration_min: number;
  avg_activity_MET: number;
  avg_activity_duration_min: number;
}

export interface DailyLog {
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

export interface HistoryEntry {
  id: number;
  user_id: number;
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
  created_at: string;
  updated_at: string;
}

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

// Helper function to set auth headers
function getHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API error: ${response.status}`);
  }
  return response.json();
}

// API Endpoints

// Auth endpoints
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

// Baseline endpoints
export const baselineApi = {
  get: async (): Promise<UserBaseline> => {
    const response = await fetch(`${API_BASE_URL}/baseline`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<UserBaseline>(response);
  },

  create: async (baseline: UserBaseline): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/baseline`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(baseline),
    });
    return handleResponse<{ message: string }>(response);
  },

  update: async (baseline: UserBaseline): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/baseline`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(baseline),
    });
    return handleResponse<{ message: string }>(response);
  },
};

// Daily log endpoints
export const dailyLogApi = {
  submit: async (log: DailyLog): Promise<{ message: string; data: any }> => {
    const response = await fetch(`${API_BASE_URL}/daily-log`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(log),
    });
    return handleResponse<{ message: string; data: any }>(response);
  },

  getToday: async (): Promise<HistoryEntry> => {
    const response = await fetch(`${API_BASE_URL}/daily-log/today`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<HistoryEntry>(response);
  },

  getByDate: async (date: string): Promise<HistoryEntry> => {
    const response = await fetch(`${API_BASE_URL}/daily-log/date/${date}`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<HistoryEntry>(response);
  },
};

// History endpoints
export const historyApi = {
  getAll: async (limit?: number, offset?: number): Promise<HistoryEntry[]> => {
    let url = `${API_BASE_URL}/history`;
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<HistoryEntry[]>(response);
  },

  getByDateRange: async (
    startDate: string,
    endDate: string,
  ): Promise<HistoryEntry[]> => {
    const response = await fetch(
      `${API_BASE_URL}/history/range?start_date=${startDate}&end_date=${endDate}`,
      {
        method: "GET",
        headers: getHeaders(true),
      },
    );
    return handleResponse<HistoryEntry[]>(response);
  },
};

// Account age endpoints
export const accountAgeApi = {
  get: async (): Promise<{ account_age_days: number }> => {
    const response = await fetch(`${API_BASE_URL}/account-age`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<{ account_age_days: number }>(response);
  },
};

// Local history endpoints
export const localHistoryApi = {
  getStatistics: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/local-history/statistics`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<any>(response);
  },

  getTrend: async (days?: number): Promise<any> => {
    let url = `${API_BASE_URL}/local-history/trend`;
    if (days) url += `?days=${days}`;

    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<any>(response);
  },
};

// Global inference endpoints
export const globalInferenceApi = {
  getLatest: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/global-inference/latest`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<any>(response);
  },

  getByDate: async (date: string): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/global-inference/date/${date}`,
      {
        method: "GET",
        headers: getHeaders(true),
      },
    );
    return handleResponse<any>(response);
  },
};

// Output endpoints
export const outputApi = {
  getLatest: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/output/latest`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<any>(response);
  },

  getByDate: async (date: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/output/${date}`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<any>(response);
  },

  getToday: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/output/today`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<any>(response);
  },

  getHistory: async (limit: number = 30): Promise<any> => {
    const response = await fetch(
      `${API_BASE_URL}/output/history?limit=${limit}`,
      {
        method: "GET",
        headers: getHeaders(true),
      },
    );
    return handleResponse<any>(response);
  },

  submit: async (output: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/output`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(output),
    });
    return handleResponse<any>(response);
  },

  submitFinal: async (output: any): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/output/final`, {
      method: "POST",
      headers: getHeaders(true),
      body: JSON.stringify(output),
    });
    return handleResponse<any>(response);
  },

  getFinalLatest: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/output/final/latest`, {
      method: "GET",
      headers: getHeaders(true),
    });
    return handleResponse<any>(response);
  },
};
