import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Calendar } from "lucide-react";
import { historyApi } from "../../services/api";

interface HistoryEntry {
  id: number;
  behavioral_date: string;
  sleep_duration_min: number;
  activity_duration_min: number;
  activity_MET: number;
  medication_taken: boolean;
  stress_level: number;
  sleep_quality: number;
}

export function HistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await historyApi.getAll(20, 0);
      setHistoryData(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load history";
      setError(errorMessage);
      console.error("History error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getActivityType = (met: number): string => {
    if (met <= 3) return "Walking";
    if (met <= 4) return "Yoga";
    if (met <= 6) return "Jogging";
    return "Cycling";
  };

  const getMedicationStatus = (taken: boolean): string => {
    return taken ? "All Taken" : "Missed";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-cyan-600" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Behavior History
              </h2>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading history...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            ) : historyData.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  No history data yet. Start by recording your daily data.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">
                          Sleep Duration
                        </TableHead>
                        <TableHead className="font-semibold">
                          Activity
                        </TableHead>
                        <TableHead className="font-semibold">
                          Stress Level
                        </TableHead>
                        <TableHead className="font-semibold">
                          Sleep Quality
                        </TableHead>
                        <TableHead className="font-semibold">
                          Medication
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((entry, index) => (
                        <TableRow key={entry.id || `entry-${index}`}>
                          <TableCell className="font-medium">
                            {formatDate(entry.behavioral_date)}
                          </TableCell>
                          <TableCell>
                            {(entry.sleep_duration_min / 60).toFixed(1)} hours
                          </TableCell>
                          <TableCell>
                            {getActivityType(entry.activity_MET)} -{" "}
                            {entry.activity_duration_min} min
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {entry.stress_level}/10
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {entry.sleep_quality}/10
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entry.medication_taken
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {getMedicationStatus(entry.medication_taken)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    Your behavioral data is being used to establish your
                    personal baseline. Continue daily logging for the most
                    accurate insights.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            This system provides behavioral proxy insights and does not measure
            blood glucose.
          </p>
        </div>
      </footer>
    </div>
  );
}
