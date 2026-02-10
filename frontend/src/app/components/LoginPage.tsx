import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { authApi, RegisterCredentials } from "../../services/api";

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [localError, setLocalError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!email || !password) {
      setLocalError("Please enter both email and password");
      return;
    }

    try {
      await login(email, password);
      toast.success("Login successful!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setLocalError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!email || !password || !passwordConfirm) {
      setLocalError("Please fill in all fields");
      return;
    }

    if (password !== passwordConfirm) {
      setLocalError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError("Invalid email format");
      return;
    }

    setSignupLoading(true);
    try {
      const credentials: RegisterCredentials = {
        email,
        password,
        passwordConfirm,
      };
      const response = await authApi.register(credentials);

      // Store token and user_id for profile setup page
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("user_id", response.user_id.toString());

      toast.success("Account created! Please complete your profile.");

      // Redirect to profile setup page instead of dashboard
      navigate("/profile-setup", {
        state: {
          userId: response.user_id,
          token: response.token,
          email: email,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Signup failed";
      setLocalError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSignupLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setLocalError("");
  };

  const toggleMode = () => {
    resetForm();
    setIsSignup(!isSignup);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-50">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">
              Behavioral Monitoring System
            </h1>
            <p className="text-gray-600">
              {isSignup ? "Create your account" : "Sign in to continue"}
            </p>
          </div>

          {(error || localError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error || localError}</p>
            </div>
          )}

          <form
            onSubmit={isSignup ? handleSignup : handleLogin}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                disabled={isLoading || signupLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                disabled={isLoading || signupLoading}
              />
              {isSignup && (
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirm Password</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="Confirm your password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  className="w-full"
                  disabled={isLoading || signupLoading}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              disabled={isLoading || signupLoading}
            >
              {signupLoading || isLoading
                ? isSignup
                  ? "Creating account..."
                  : "Logging in..."
                : isSignup
                  ? "Create Account"
                  : "Login"}
            </Button>
          </form>

          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={toggleMode}
              className="w-full text-center text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              {isSignup
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
