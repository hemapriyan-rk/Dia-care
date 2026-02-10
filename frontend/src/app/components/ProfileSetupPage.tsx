import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    sex: "Not Specified",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isEditMode] = useState(location.state?.isEditMode || false);

  // Pre-fill form if in edit mode
  React.useEffect(() => {
    if (isEditMode && location.state?.profile) {
      setFormData({
        full_name: location.state.profile.full_name,
        age: location.state.profile.age.toString(),
        sex: location.state.profile.sex,
      });
    }
  }, [isEditMode, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate fields
      if (!formData.full_name.trim()) {
        throw new Error("Full name is required");
      }
      if (
        !formData.age ||
        parseInt(formData.age) < 0 ||
        parseInt(formData.age) > 150
      ) {
        throw new Error("Age must be between 0 and 150");
      }
      if (!formData.sex) {
        throw new Error("Sex/Gender is required");
      }

      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const method = isEditMode ? "PUT" : "POST";
      const response = await fetch("http://localhost:4000/user-profiles", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
          age: parseInt(formData.age),
          sex: formData.sex,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || `Failed to ${isEditMode ? "update" : "create"} profile`,
        );
      }

      const data = await response.json();

      // Store profile info in localStorage for dashboard
      localStorage.setItem("userProfile", JSON.stringify(data.profile));

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Profile setup error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      sex: value,
    }));
  };

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isEditMode ? "Edit Your Profile" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription>
            {isEditMode
              ? "Update your personal information"
              : "Please provide your details to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 bg-red-50 border-red-200">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                name="age"
                type="number"
                placeholder="25"
                value={formData.age}
                onChange={handleInputChange}
                min="0"
                max="150"
                required
                disabled={loading}
              />
            </div>

            {/* Sex/Gender */}
            <div className="space-y-2">
              <Label htmlFor="sex">Sex/Gender *</Label>
              <Select
                value={formData.sex}
                onValueChange={handleSelectChange}
                disabled={loading}
              >
                <SelectTrigger id="sex">
                  <SelectValue placeholder="Select sex/gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Not Specified">Not Specified</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Created Date (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="created_at">Created Date</Label>
              <div className="px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-600 text-sm">
                {today}
              </div>
              <p className="text-xs text-slate-500">
                Date is automatically set by the system
              </p>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Creating Profile..."
                : isEditMode
                  ? "Update Profile"
                  : "Complete Setup"}
            </Button>

            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/dashboard")}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </form>

          <p className="text-xs text-slate-500 mt-4 text-center">
            * Required fields
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetupPage;
