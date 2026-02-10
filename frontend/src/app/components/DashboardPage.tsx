import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  TrendingUp,
  Maximize2,
  Minimize2,
  User,
  Edit,
} from "lucide-react";
import {
  baselineApi,
  historyApi,
  accountAgeApi,
  outputApi,
  profileApi,
} from "../../services/api";

interface StabilityData {
  day: string;
  stability: number;
}

interface DeviationTrendData {
  day: string;
  local_cumulative_deviation: number;
  global_deviation: number;
  date: string;
}

type MaximizedChart = "baseline" | "prediction" | null;

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maximizedChart, setMaximizedChart] = useState<MaximizedChart>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stabilityData, setStabilityData] = useState<StabilityData[]>([]);
  const [deviationTrendData, setDeviationTrendData] = useState<
    DeviationTrendData[]
  >([]);
  const [baseline, setBaseline] = useState<any>(null);
  const [accountAge, setAccountAge] = useState<number | null>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<any>(null);
  const [predictionHistory, setPredictionHistory] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch baseline with graceful fallback
      let baselineData = null;
      try {
        baselineData = await baselineApi.get();
        setBaseline(baselineData);
      } catch (baselineErr) {
        console.warn("Baseline not found, using defaults:", baselineErr);
        // Set default baseline for new users
        baselineData = {
          avg_sleep_hours: 7.5,
          avg_activity_score: 50,
          med_adherence_pct: 80,
          typical_sleep_window: "22:00-06:00",
          avg_sleep_midpoint_min: 1380,
          avg_sleep_duration_min: 480,
          avg_activity_MET: 1.2,
          avg_activity_duration_min: 30,
        };
        setBaseline(baselineData);
      }

      // Fetch account age
      let ageData = null;
      try {
        ageData = await accountAgeApi.get();
        setAccountAge(ageData.account_age_days);
      } catch (ageErr) {
        console.warn("Account age not available:", ageErr);
        setAccountAge(1); // Default to Day 1
      }

      // Fetch user profile
      try {
        const profileResponse = await profileApi.get();
        if (profileResponse?.profile) {
          setUserProfile(profileResponse.profile);
        }
      } catch (profileErr) {
        console.warn("Profile not available:", profileErr);
      }

      // Fetch daily log history
      let historyData: any[] = [];
      try {
        historyData = await historyApi.getAll(5, 0);
        setRecentEntries(historyData);
      } catch (histErr) {
        console.warn("History not available yet:", histErr);
        setRecentEntries([]);
      }

      // Fetch predictions with optional error handling
      try {
        const predictionResponse = await outputApi.getLatest();
        if (predictionResponse?.data) {
          setLatestPrediction(predictionResponse.data);
        }

        const historyResponse = await outputApi.getHistory(7);
        if (historyResponse?.data) {
          setPredictionHistory(historyResponse.data);
          // Build deviation trend data from prediction history
          buildDeviationTrendData(historyResponse.data);
        }
      } catch (predErr) {
        console.log("Predictions not available yet:", predErr);
      }

      // Build stability trend data from daily logs
      if (historyData && historyData.length > 0) {
        const trend = historyData
          .reverse()
          .map((entry: any, index: number) => ({
            day: `Day ${index + 1}`,
            stability: calculateStability(entry),
          }));
        setStabilityData(trend);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load dashboard data";
      console.error("Dashboard error:", errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Transform prediction history into deviation trend data for charting
   * Combines local cumulative deviation with global deviation
   */
  const buildDeviationTrendData = (history: any[]) => {
    if (!history || history.length === 0) {
      setDeviationTrendData([]);
      return;
    }

    const deviationData = history
      .reverse()
      .map((entry: any, index: number) => ({
        day: `Day ${index + 1}`,
        local_cumulative_deviation:
          parseFloat(entry.local_cumulative_deviation) || 0,
        global_deviation: parseFloat(entry.global_deviation) || 0,
        date: entry.behavioral_date,
      }));

    setDeviationTrendData(deviationData);
  };

  const calculateStability = (entry: any): number => {
    let stability = 50;
    if (entry.sleep_quality) {
      stability += entry.sleep_quality * 2;
    }
    if (entry.medication_taken) {
      stability += 10;
    }
    if (entry.activity_duration_min && entry.activity_duration_min > 0) {
      stability += Math.min(entry.activity_duration_min / 5, 15);
    }
    if (entry.stress_level) {
      stability -= (11 - entry.stress_level) * 2;
    }
    return Math.min(Math.max(stability, 0), 100);
  };

  /**
   * Render baseline deviation chart (local vs global)
   */
  const renderBaselineDeviationChart = () => (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: "1200px", height: "500px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={deviationTrendData}
            margin={{ top: 20, right: 30, left: 80, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              vertical={true}
            />
            <XAxis
              dataKey="day"
              stroke="#6b7280"
              style={{ fontSize: "16px", fontWeight: "bold" }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              label={{
                value: "Deviation Score",
                angle: -90,
                position: "insideLeft",
                offset: 20,
                style: { fontSize: "16px", fontWeight: "bold" },
              }}
              stroke="#6b7280"
              style={{ fontSize: "14px" }}
              domain={["dataMin - 0.1", "dataMax + 0.1"]}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "2px solid #0891b2",
                borderRadius: "12px",
                padding: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                fontSize: "14px",
                fontWeight: "500",
              }}
              cursor={{ stroke: "#0891b2", strokeWidth: 2 }}
              formatter={(value: any) => [
                typeof value === "number" ? value.toFixed(3) : value,
                "",
              ]}
              labelFormatter={() => ""}
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  return (
                    <div className="bg-white p-3 rounded-lg border-2 border-cyan-600 shadow-lg">
                      {payload.map((entry: any, index: number) => (
                        <div key={index} style={{ color: entry.color }}>
                          <span className="font-semibold">
                            {entry.name}: {(entry.value as number).toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="local_cumulative_deviation"
              stroke="#0891b2"
              strokeWidth={4}
              name="Local Cumulative"
              dot={{ fill: "#0891b2", r: 8, strokeWidth: 2 }}
              activeDot={{ r: 12, stroke: "#06b6d4", strokeWidth: 3 }}
              isAnimationActive={true}
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="global_deviation"
              stroke="#a855f7"
              strokeWidth={4}
              name="Global Deviation"
              dot={{ fill: "#a855f7", r: 8, strokeWidth: 2 }}
              activeDot={{ r: 12, stroke: "#d946ef", strokeWidth: 3 }}
              isAnimationActive={true}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  /**
   * Render prediction/stability chart
   */
  const renderPredictionChart = () => {
    if (stabilityData.length === 0) {
      return (
        <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-lg">
            No stability data yet. Start recording your daily behavior to see
            trends.
          </p>
        </div>
      );
    }

    return (
      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: "1200px", height: "500px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={stabilityData}
              margin={{ top: 20, right: 30, left: 80, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={true}
              />
              <XAxis
                dataKey="day"
                stroke="#6b7280"
                style={{ fontSize: "16px", fontWeight: "bold" }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis
                label={{
                  value: "Risk Score / Stability",
                  angle: -90,
                  position: "insideLeft",
                  offset: 20,
                  style: { fontSize: "16px", fontWeight: "bold" },
                }}
                stroke="#6b7280"
                style={{ fontSize: "14px" }}
                domain={["dataMin - 5", "dataMax + 5"]}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #0891b2",
                  borderRadius: "12px",
                  padding: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
                cursor={{ stroke: "#0891b2", strokeWidth: 2 }}
                formatter={(value: any) => [
                  typeof value === "number" ? value.toFixed(2) : value,
                  "Score",
                ]}
              />
              <Line
                type="monotone"
                dataKey="stability"
                stroke="#0891b2"
                strokeWidth={4}
                dot={{ fill: "#0891b2", r: 8, strokeWidth: 2 }}
                activeDot={{ r: 12, stroke: "#06b6d4", strokeWidth: 3 }}
                isAnimationActive={true}
                animationDuration={800}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const handleEditProfile = () => {
    navigate("/profile-setup", {
      state: {
        isEditMode: true,
        profile: userProfile,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full border-l-4 border-l-red-500">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-red-900">
                Dashboard Error
              </h2>
              <p className="text-sm text-red-700 mt-2">{error}</p>
            </div>
            <Button onClick={() => loadDashboardData()} className="w-full">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const avgSleepHours = Math.max(
    0,
    typeof baseline?.avg_sleep_hours === "number"
      ? baseline.avg_sleep_hours
      : 7.5,
  );
  const medAdherence = Math.max(
    0,
    Math.min(
      100,
      typeof baseline?.med_adherence_pct === "number"
        ? baseline.med_adherence_pct
        : 85,
    ),
  );
  const avgActivityScore = Math.max(
    0,
    Math.min(
      100,
      typeof baseline?.avg_activity_score === "number"
        ? baseline.avg_activity_score
        : 60,
    ),
  );

  // Maximized baseline chart view
  if (maximizedChart === "baseline") {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            Baseline - Deviation Analysis (Full View)
          </h2>
          <Button
            onClick={() => setMaximizedChart(null)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Normal View
          </Button>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <Card className="p-6 h-full">
            <div style={{ height: "calc(100vh - 150px)" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={deviationTrendData}
                  margin={{ top: 20, right: 30, left: 100, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    style={{ fontSize: "18px", fontWeight: "bold" }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    label={{
                      value: "Deviation Score",
                      angle: -90,
                      position: "insideLeft",
                      offset: 20,
                      style: { fontSize: "18px", fontWeight: "bold" },
                    }}
                    stroke="#6b7280"
                    style={{ fontSize: "16px" }}
                    domain={["dataMin - 0.1", "dataMax + 0.1"]}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "2px solid #0891b2",
                      borderRadius: "12px",
                      padding: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      fontSize: "16px",
                      fontWeight: "500",
                    }}
                    cursor={{ stroke: "#0891b2", strokeWidth: 2 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        return (
                          <div className="bg-white p-4 rounded-lg border-2 border-cyan-600 shadow-lg">
                            {payload.map((entry: any, index: number) => (
                              <div key={index} style={{ color: entry.color }}>
                                <span className="font-semibold text-lg">
                                  {entry.name}:{" "}
                                  {(entry.value as number).toFixed(3)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="local_cumulative_deviation"
                    stroke="#0891b2"
                    strokeWidth={5}
                    name="Local Cumulative"
                    dot={{ fill: "#0891b2", r: 12, strokeWidth: 2 }}
                    activeDot={{ r: 16, stroke: "#06b6d4", strokeWidth: 3 }}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="global_deviation"
                    stroke="#a855f7"
                    strokeWidth={5}
                    name="Global Deviation"
                    dot={{ fill: "#a855f7", r: 12, strokeWidth: 2 }}
                    activeDot={{ r: 16, stroke: "#d946ef", strokeWidth: 3 }}
                    isAnimationActive={true}
                    animationDuration={800}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Maximized prediction chart view
  if (maximizedChart === "prediction") {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            Prediction History - Full View
          </h2>
          <Button
            onClick={() => setMaximizedChart(null)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Minimize2 className="w-4 h-4 mr-2" />
            Normal View
          </Button>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <Card className="p-6 h-full">
            {stabilityData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-600 text-lg">
                  No stability data yet. Start recording your daily behavior to
                  see trends.
                </p>
              </div>
            ) : (
              <div style={{ height: "calc(100vh - 150px)" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stabilityData}
                    margin={{ top: 20, right: 30, left: 100, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="day"
                      stroke="#6b7280"
                      style={{ fontSize: "18px", fontWeight: "bold" }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis
                      label={{
                        value: "Risk Score / Stability",
                        angle: -90,
                        position: "insideLeft",
                        offset: 20,
                        style: { fontSize: "18px", fontWeight: "bold" },
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: "16px" }}
                      domain={["dataMin - 5", "dataMax + 5"]}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #0891b2",
                        borderRadius: "12px",
                        padding: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        fontSize: "16px",
                        fontWeight: "500",
                      }}
                      cursor={{ stroke: "#0891b2", strokeWidth: 2 }}
                      formatter={(value: any) => [
                        typeof value === "number" ? value.toFixed(2) : value,
                        "Score",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="stability"
                      stroke="#0891b2"
                      strokeWidth={5}
                      dot={{ fill: "#0891b2", r: 12, strokeWidth: 2 }}
                      activeDot={{ r: 16, stroke: "#06b6d4", strokeWidth: 3 }}
                      isAnimationActive={true}
                      animationDuration={800}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Normal dashboard view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header with Profile Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            {userProfile && (
              <p className="text-gray-600 mt-2">
                Welcome,{" "}
                <span className="font-semibold">{userProfile.full_name}</span>
              </p>
            )}
          </div>
          <Button
            onClick={handleEditProfile}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="space-y-6">
          {/* PRIMARY GRAPH: BASELINE - DEVIATION ANALYSIS */}
          <Card className="p-6 col-span-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <h3 className="text-2xl font-semibold text-gray-900">
                    Baseline - Deviation Analysis
                  </h3>
                </div>
                <Button
                  onClick={() => setMaximizedChart("baseline")}
                  variant="outline"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Maximize
                </Button>
              </div>
              {deviationTrendData.length > 0 ? (
                renderBaselineDeviationChart()
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-600 text-lg">
                    Accumulating deviation data. Check back in a few days.
                  </p>
                </div>
              )}
              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-purple-700">
                    📊 Chart Info:
                  </span>
                  This chart compares your personal cumulative deviation (cyan
                  line) against population baseline deviation (purple line).
                  Lower values indicate stability. The Y-axis automatically
                  scales to your data range.
                </p>
              </div>
            </div>
          </Card>

          {latestPrediction && (
            <Card className="p-6 border-l-4 border-l-cyan-600">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Today's Status
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Risk Zone
                    </p>
                    <p
                      className={`text-3xl font-bold ${
                        latestPrediction.risk_zone === "Red"
                          ? "text-red-600"
                          : latestPrediction.risk_zone === "Amber"
                            ? "text-yellow-600"
                            : "text-green-600"
                      }`}
                    >
                      {latestPrediction.risk_zone}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Deviation Score
                    </p>
                    <p className="text-3xl font-bold text-cyan-600">
                      {parseFloat(latestPrediction.deviation_score)?.toFixed(
                        2,
                      ) || "N/A"}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Cumulative Dev.
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {parseFloat(
                        latestPrediction.local_cumulative_deviation,
                      )?.toFixed(3) || "N/A"}
                    </p>
                  </div>
                </div>
                {latestPrediction.explanation_text && (
                  <p className="text-sm text-gray-700 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded border border-cyan-200">
                    <span className="font-semibold text-cyan-700">
                      Analysis:
                    </span>{" "}
                    {latestPrediction.explanation_text}
                  </p>
                )}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {accountAge
                    ? `Evaluation Phase (Day ${accountAge})`
                    : "Evaluation Phase: Building Your Baseline"}
                </h2>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                  <span className="text-sm font-medium">
                    Overall Status: {getOverallStatus(stabilityData)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Sleep Pattern</h4>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-cyan-600">
                  {Math.max(
                    0,
                    typeof baseline?.avg_sleep_hours === "number"
                      ? baseline.avg_sleep_hours
                      : 7.5,
                  ).toFixed(1)}
                </div>
                <p className="text-sm text-gray-600">hours average</p>
                <Progress
                  value={Math.min(
                    100,
                    (Math.max(
                      0,
                      typeof baseline?.avg_sleep_hours === "number"
                        ? baseline.avg_sleep_hours
                        : 7.5,
                    ) /
                      10) *
                      100,
                  )}
                  className="mt-2"
                />
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">
                Medication Adherence
              </h4>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-green-600">
                  {Math.max(
                    0,
                    Math.min(
                      100,
                      typeof baseline?.med_adherence_pct === "number"
                        ? baseline.med_adherence_pct
                        : 85,
                    ),
                  ).toFixed(0)}
                  %
                </div>
                <p className="text-sm text-gray-600">compliance rate</p>
                <Progress
                  value={Math.max(
                    0,
                    Math.min(
                      100,
                      typeof baseline?.med_adherence_pct === "number"
                        ? baseline.med_adherence_pct
                        : 85,
                    ),
                  )}
                  className="mt-2"
                />
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Activity Level</h4>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.max(
                    0,
                    Math.min(
                      100,
                      typeof baseline?.avg_activity_score === "number"
                        ? baseline.avg_activity_score
                        : 60,
                    ),
                  ).toFixed(0)}
                </div>
                <p className="text-sm text-gray-600">activity score</p>
                <Progress
                  value={Math.max(
                    0,
                    Math.min(
                      100,
                      typeof baseline?.avg_activity_score === "number"
                        ? baseline.avg_activity_score
                        : 60,
                    ),
                  )}
                  className="mt-2"
                />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 border-l-4 border-l-orange-500">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Sleep Pattern Notice
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {Math.max(
                      0,
                      typeof baseline?.avg_sleep_hours === "number"
                        ? baseline.avg_sleep_hours
                        : 7.5,
                    ) < 7
                      ? "Short sleep duration detected. Aim for 7-9 hours."
                      : "Sleep duration is within recommended range."}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-green-500">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    Medication Adherence
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {Math.max(
                      0,
                      Math.min(
                        100,
                        typeof baseline?.med_adherence_pct === "number"
                          ? baseline.med_adherence_pct
                          : 85,
                      ),
                    ) >= 90
                      ? "Excellent medication compliance. Keep it up!"
                      : "Try to improve medication adherence for better health outcomes."}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Record Today's Data
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Help us build your behavioral baseline
                </p>
              </div>
              <Button
                onClick={() => navigate("/daily-entry")}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Enter Daily Data
              </Button>
            </div>
          </Card>

          {/* SECONDARY GRAPH: PREDICTION HISTORY */}
          <Card className="p-6 col-span-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-2xl font-semibold text-gray-900">
                    Prediction History - 7 Day Trend
                  </h3>
                </div>
                <Button
                  onClick={() => setMaximizedChart("prediction")}
                  variant="outline"
                  className="border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                >
                  <Maximize2 className="w-4 h-4 mr-2" />
                  Maximize
                </Button>
              </div>
              {renderPredictionChart()}
              <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-cyan-700">
                    📈 Chart Info:
                  </span>
                  The Y-axis automatically scales to fit your data range for
                  better visibility. Click "Maximize" to view the full chart.
                </p>
              </div>
            </div>
          </Card>

          {recentEntries.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Entries
              </h3>
              <div className="space-y-3">
                {recentEntries.slice(0, 3).map((entry: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry.behavioral_date}
                      </p>
                      <p className="text-sm text-gray-600">
                        Sleep:{" "}
                        {(typeof entry.sleep_duration_min === "number"
                          ? entry.sleep_duration_min / 60
                          : 0
                        ).toFixed(1)}
                        h | Activity: {entry.activity_duration_min || 0}min |
                        Medication:{" "}
                        {entry.medication_taken ? "Taken" : "Missed"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-cyan-600">
                        {Math.max(
                          0,
                          Math.min(100, calculateStability(entry)),
                        ).toFixed(0)}
                        %
                      </p>
                      <p className="text-xs text-gray-600">stability</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getOverallStatus(data: StabilityData[]): string {
  if (data.length === 0) return "Starting";
  const avg = data.reduce((sum, d) => sum + d.stability, 0) / data.length;
  if (avg >= 70) return "Stable";
  if (avg >= 50) return "Moderate";
  return "Developing";
}
