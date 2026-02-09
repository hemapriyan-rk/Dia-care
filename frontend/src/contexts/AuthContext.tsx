import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi, LoginResponse } from "../services/api";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  isAuthenticated: boolean;
  userId: number | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if user is already logged in on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUserId = localStorage.getItem("user_id");

    if (storedToken && storedUserId) {
      setToken(storedToken);
      setUserId(parseInt(storedUserId));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response: LoginResponse = await authApi.login({ email, password });

      // Store token and user ID
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("user_id", response.user_id.toString());

      // Update state
      setToken(response.token);
      setUserId(response.user_id);
      setIsAuthenticated(true);

      // Navigate to dashboard
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear storage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_id");

    // Clear state
    setToken(null);
    setUserId(null);
    setIsAuthenticated(false);
    setError(null);

    // Navigate to login
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        token,
        login,
        logout,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
