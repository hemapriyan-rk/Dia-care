import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { AlertCircle, TrendingUp } from "lucide-react";
import {
  baselineApi,
  historyApi,
  accountAgeApi,
  outputApi,
} from "../../services/api";

interface StabilityData {
  day: string;
  stability: number;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stabilityData, setStabilityData] = useState<StabilityData[]>([
    { day: "Day 1", stability: 45 },
    { day: "Day 2", stability: 52 },
    { day: "Day 3", stability: 48 },
    { day: "Day 4", stability: 65 },
  ]);
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
      console.log("Loading baseline data...");
      const baselineData = await baselineApi.get();
      setBaseline(baselineData);

      console.log("Loading account age...");
      const ageData = await accountAgeApi.get();
      setAccountAge(ageData.account_age_days);

      console.log("Loading history...");
      const historyData = await historyApi.getAll(5, 0);
      setRecentEntries(historyData);

      console.log("Loading predictions...");
      try {
        const predictionResponse = await outputApi.getLatest();
        if (predictionResponse?.data) {
          setLatestPrediction(predictionResponse.data);
        }

        const historyResponse = await outputApi.getHistory(7);
        if (historyResponse?.data) {
          setPredictionHistory(historyResponse.data);
        }
      } catch (predErr) {
        console.log("Predictions not available yet:", predErr);
      }

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
            <div className="bg-red-50 p-3 rounded text-sm text-red-800">
              <p className="font-medium mb-1">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Make sure the backend is running on port 4000</li>
                <li>Check that VITE_API_URL is correctly set in .env</li>
                <li>Verify database is initialized with test data</li>
                <li>Check browser console for more details</li>
              </ul>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {latestPrediction && (
            <Card className="p-6 border-l-4 border-l-cyan-600">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Today's Status
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Risk Zone</p>
                    <p
                      className={`text-2xl font-bold ${
                        latestPrediction.risk_zone === "UP"
                          ? "text-red-600"
                          : latestPrediction.risk_zone === "DOWN"
                            ? "text-green-600"
                            : "text-yellow-600"
                      }`}
                    >
                      {latestPrediction.risk_zone}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Score</p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {parseFloat(latestPrediction.deviation_score)?.toFixed(
                        2,
                      ) || "N/A"}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">Cumulative</p>
                    <p className="text-lg font-semibold">
                      {parseFloat(
                        latestPrediction.local_cumulative_deviation,
                      )?.toFixed(2) || "N/A"}
                    </p>
                  </div>
                </div>
                {latestPrediction.explanation_text && (
                  <p className="text-sm text-gray-700 mt-3 p-3 bg-gray-100 rounded">
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

          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-cyan-600" />
                <h3 className="text-xl font-semibold text-gray-900">
                  Behavioral Stability Trend
                </h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stabilityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="day"
                      stroke="#6b7280"
                      style={{ fontSize: "14px" }}
                    />
                    <YAxis
                      label={{
                        value: "Stability (Low → High)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: "14px" }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="stability"
                      stroke="#0891b2"
                      strokeWidth={3}
                      dot={{ fill: "#0891b2", r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Sleep Pattern</h4>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-cyan-600">
                  {avgSleepHours.toFixed(1)}
                </div>
                <p className="text-sm text-gray-600">hours average</p>
                <Progress
                  value={Math.min(100, (avgSleepHours / 10) * 100)}
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
                  {medAdherence.toFixed(0)}%
                </div>
                <p className="text-sm text-gray-600">compliance rate</p>
                <Progress value={medAdherence} className="mt-2" />
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">Activity Level</h4>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-blue-600">
                  {avgActivityScore.toFixed(0)}
                </div>
                <p className="text-sm text-gray-600">activity score</p>
                <Progress value={avgActivityScore} className="mt-2" />
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
                    {avgSleepHours < 7
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
                    {medAdherence >= 90
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

          {predictionHistory && predictionHistory.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Prediction History
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={predictionHistory.map((p: any, i: number) => ({
                      day: `Day ${i + 1}`,
                      score: p.deviation_score || 0,
                      cumulative: p.local_cumulative_deviation || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#0891b2"
                      strokeWidth={2}
                      name="Daily Score"
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Cumulative"
                    />
                  </LineChart>
                </ResponsiveContainer>
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
