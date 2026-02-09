import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  const {
    sleep_hours,
    sleep_quality,
    activity_level,
    medication_taken,
    stress_level
  } = req.body;

  const today = new Date().toISOString().split("T")[0];

  try {
    await pool.query(
      `INSERT INTO daily_behavior_logs
      (user_id, log_date, sleep_hours, sleep_quality, activity_level, medication_taken, stress_level)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (user_id, log_date)
      DO UPDATE SET
        sleep_hours = EXCLUDED.sleep_hours,
        sleep_quality = EXCLUDED.sleep_quality,
        activity_level = EXCLUDED.activity_level,
        medication_taken = EXCLUDED.medication_taken,
        stress_level = EXCLUDED.stress_level`,
      [
        req.user_id,
        today,
        sleep_hours,
        sleep_quality,
        activity_level,
        medication_taken,
        stress_level
      ]
    );

    res.json({ message: "Daily log saved" });
  } catch {
    res.status(500).json({ error: "Failed to save daily log" });
  }
});

export default router;
