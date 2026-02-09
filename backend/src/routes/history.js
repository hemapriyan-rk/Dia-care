import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET endpoint for daily outputs history
router.get("/", authMiddleware, async (req, res) => {
  const { limit = 30, offset = 0 } = req.query;

  try {
    const result = await pool.query(
      `SELECT 
        id, behavioral_date, sleep_duration_min, activity_duration_min, activity_MET,
        medication_taken, stress_level, sleep_quality, created_at
       FROM daily_behavior_logs
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT $2 OFFSET $3`,
      [req.user_id, limit, offset]
    );

    // Convert NUMERIC types to numbers
    const rows = result.rows.map(row => ({
      ...row,
      sleep_duration_min: row.sleep_duration_min ? parseFloat(row.sleep_duration_min) : 0,
      activity_duration_min: row.activity_duration_min ? parseInt(row.activity_duration_min) : 0,
      activity_MET: row.activity_MET ? parseFloat(row.activity_MET) : 0,
      stress_level: row.stress_level ? parseInt(row.stress_level) : 0,
      sleep_quality: row.sleep_quality ? parseInt(row.sleep_quality) : 0
    }));

    res.json(rows);
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ error: "Failed to fetch history", details: err.message });
  }
});

// GET endpoint for local output history (cumulative deviations over time)
router.get("/local-history", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        behavioral_date, daily_deviation, cumulative_deviation, created_at
       FROM local_output_history
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT 30`,
      [req.user_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Local history fetch error:", err);
    res.status(500).json({ error: "Failed to fetch local history", details: err.message });
  }
});

// GET endpoint for history within a date range
router.get("/range/:startDate/:endDate", authMiddleware, async (req, res) => {
  const { startDate, endDate } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        behavioral_date, phase, daily_deviation, local_cumulative_deviation, 
        local_signal_ready, deviation_score, deviation_direction, risk_zone, 
        explanation_text, created_at
       FROM daily_outputs
       WHERE user_id = $1 AND behavioral_date BETWEEN $2 AND $3
       ORDER BY behavioral_date DESC`,
      [req.user_id, startDate, endDate]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Range history fetch error:", err);
    res.status(500).json({ error: "Failed to fetch range history", details: err.message });
  }
});

export default router;
