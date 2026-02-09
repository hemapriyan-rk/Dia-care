import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Clock, Activity, Pill } from "lucide-react";
import { toast } from "sonner";
import { dailyLogApi } from "../../services/api";

export function DailyEntryPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sleepTime, setSleepTime] = useState("22:00");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [stressLevel, setStressLevel] = useState("5");
  const [sleepQuality, setSleepQuality] = useState("5");
  const [activityType, setActivityType] = useState("yoga");
  const [activityDuration, setActivityDuration] = useState("");
  const [activityMET, setActivityMET] = useState("3.5");
  const [medication, setMedication] = useState({
    morning: "taken",
    afternoon: "taken",
    night: "taken",
  });

  const calculateSleepDuration = () => {
    const sleep = new Date(`2000-01-01T${sleepTime}`);
    const wake = new Date(`2000-01-02T${wakeTime}`);
    const diff = (wake.getTime() - sleep.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1);
  };

  const convertTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const calculateSleepMidpoint = (sleep: string, wake: string): number => {
    const sleepMin = convertTimeToMinutes(sleep);
    const wakeMin = convertTimeToMinutes(wake);
    const adjustedWakeMin = wakeMin < sleepMin ? wakeMin + 24 * 60 : wakeMin;
    return Math.round((sleepMin + adjustedWakeMin) / 2);
  };

  const calculateMedicationTimes = (): number[] => {
    const times = [];
    if (medication.morning === "taken") times.push(8 * 60);
    if (medication.afternoon === "taken") times.push(14 * 60);
    if (medication.night === "taken") times.push(20 * 60);
    return times;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activityDuration) {
      toast.error("Please enter activity duration");
      return;
    }

    setIsSubmitting(true);

    try {
      const medicationTimes = calculateMedicationTimes();
      const doseCount = medicationTimes.length;
      const sleepDurationHours = parseFloat(calculateSleepDuration());
      const activityDurationMin = parseInt(activityDuration);

      const payload = {
        behavioral_date: new Date().toISOString().split("T")[0],
        sleep_midpoint_min: calculateSleepMidpoint(sleepTime, wakeTime),
        sleep_duration_min: sleepDurationHours * 60,
        medication_times_min:
          medicationTimes.length > 0 ? medicationTimes : undefined,
        dose_count: doseCount,
        mean_med_time_min:
          medicationTimes.length > 0
            ? Math.round(
                medicationTimes.reduce((a, b) => a + b) /
                  medicationTimes.length,
              )
            : 0,
        activity_duration_min: activityDurationMin,
        activity_MET: parseFloat(activityMET),
        activity_load: activityDurationMin * parseFloat(activityMET),
        stress_level: parseInt(stressLevel),
        sleep_quality: parseInt(sleepQuality),
        medication_taken: doseCount > 0,
      };

      const response = await dailyLogApi.submit(payload);

      if (response.data?.predicted && response.data?.prediction) {
        const pred = response.data.prediction;
        toast.success(`Status: ${pred.risk_label}`);
        setTimeout(() => {
          navigate("/dashboard", {
            state: { newPrediction: pred },
          });
        }, 800);
      } else {
        toast.success("Daily data submitted successfully!");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to submit daily data";
      toast.error(errorMessage);
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Daily Behavior Entry
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Sleep Details Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-cyan-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Sleep Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sleep-time">Sleep Time (Last Night)</Label>
                  <Input
                    id="sleep-time"
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wake-time">Wake-Up Time (This Morning)</Label>
                  <Input
                    id="wake-time"
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <p className="text-sm text-cyan-900">
                  Sleep duration:{" "}
                  <span className="font-semibold">
                    {calculateSleepDuration()} hours
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sleep-quality">Sleep Quality (1-10)</Label>
                  <Input
                    id="sleep-quality"
                    type="number"
                    min="1"
                    max="10"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stress-level">Stress Level (1-10)</Label>
                  <Input
                    id="stress-level"
                    type="number"
                    min="1"
                    max="10"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Physical Activity Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-cyan-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Physical Activity
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>Activity Type</Label>
                  <RadioGroup
                    value={activityType}
                    onValueChange={setActivityType}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="yoga"
                        id="yoga"
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="yoga" className="cursor-pointer">
                        Yoga (3.5 MET)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="jogging"
                        id="jogging"
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="jogging" className="cursor-pointer">
                        Jogging (6.0 MET)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="walking"
                        id="walking"
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="walking" className="cursor-pointer">
                        Walking (3.0 MET)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="cycling"
                        id="cycling"
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="cycling" className="cursor-pointer">
                        Cycling (8.0 MET)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="e.g., 30"
                      value={activityDuration}
                      onChange={(e) => setActivityDuration(e.target.value)}
                      min="1"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="met">Activity MET Value</Label>
                    <Input
                      id="met"
                      type="number"
                      step="0.1"
                      value={activityMET}
                      onChange={(e) => setActivityMET(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Medication Intake Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Pill className="w-5 h-5 text-cyan-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Medication Intake
                </h3>
              </div>

              <div className="space-y-4">
                {[
                  { key: "morning", label: "Morning Dose" },
                  { key: "afternoon", label: "Afternoon Dose" },
                  { key: "night", label: "Night Dose" },
                ].map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <span className="text-gray-900 font-medium">{label}</span>
                    <RadioGroup
                      value={medication[key as keyof typeof medication]}
                      onValueChange={(value) =>
                        setMedication({ ...medication, [key]: value })
                      }
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="taken"
                          id={`${key}-taken`}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor={`${key}-taken`}
                          className="cursor-pointer text-green-700"
                        >
                          Taken
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="missed"
                          id={`${key}-missed`}
                          disabled={isSubmitting}
                        />
                        <Label
                          htmlFor={`${key}-missed`}
                          className="cursor-pointer text-red-700"
                        >
                          Missed
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                className="bg-cyan-600 hover:bg-cyan-700 px-8"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Today's Data"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Footer */}
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
