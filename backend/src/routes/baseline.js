import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET endpoint for retrieving user baseline
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        avg_sleep_hours, avg_activity_score, med_adherence_pct, 
        typical_sleep_window, avg_sleep_midpoint_min, avg_sleep_duration_min,
        avg_activity_MET, avg_activity_duration_min
       FROM user_baselines 
       WHERE user_id = $1`,
      [req.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Baseline not found. Please complete initial assessment." });
    }

    // Convert NUMERIC types to numbers
    const baseline = result.rows[0];
    return res.json({
      avg_sleep_hours: baseline.avg_sleep_hours ? parseFloat(baseline.avg_sleep_hours) : 0,
      avg_activity_score: baseline.avg_activity_score ? parseFloat(baseline.avg_activity_score) : 0,
      med_adherence_pct: baseline.med_adherence_pct ? parseFloat(baseline.med_adherence_pct) : 0,
      typical_sleep_window: baseline.typical_sleep_window,
      avg_sleep_midpoint_min: baseline.avg_sleep_midpoint_min ? parseInt(baseline.avg_sleep_midpoint_min) : 0,
      avg_sleep_duration_min: baseline.avg_sleep_duration_min ? parseInt(baseline.avg_sleep_duration_min) : 0,
      avg_activity_MET: baseline.avg_activity_MET ? parseFloat(baseline.avg_activity_MET) : 0,
      avg_activity_duration_min: baseline.avg_activity_duration_min ? parseInt(baseline.avg_activity_duration_min) : 0
    });
  } catch (err) {
    console.error("Baseline fetch error:", err);
    res.status(500).json({ error: "Failed to fetch baseline", details: err.message });
  }
});

// POST endpoint for creating/updating user baseline
router.post("/", authMiddleware, async (req, res) => {
  const {
    avg_sleep_hours,
    avg_activity_score,
    med_adherence_pct,
    typical_sleep_window,
    avg_sleep_midpoint_min,
    avg_sleep_duration_min,
    avg_activity_MET,
    avg_activity_duration_min
  } = req.body;

  try {
    const existingResult = await pool.query(
      "SELECT id FROM user_baselines WHERE user_id = $1",
      [req.user_id]
    );

    if (existingResult.rows.length > 0) {
      // Update existing baseline
      await pool.query(
        `UPDATE user_baselines 
         SET avg_sleep_hours = $1, avg_activity_score = $2, med_adherence_pct = $3,
             typical_sleep_window = $4, avg_sleep_midpoint_min = $5, 
             avg_sleep_duration_min = $6, avg_activity_MET = $7, 
             avg_activity_duration_min = $8
         WHERE user_id = $9`,
        [
          avg_sleep_hours,
          avg_activity_score,
          med_adherence_pct,
          typical_sleep_window,
          avg_sleep_midpoint_min,
          avg_sleep_duration_min,
          avg_activity_MET,
          avg_activity_duration_min,
          req.user_id
        ]
      );
    } else {
      // Create new baseline
      await pool.query(
        `INSERT INTO user_baselines
         (user_id, avg_sleep_hours, avg_activity_score, med_adherence_pct, 
          typical_sleep_window, avg_sleep_midpoint_min, avg_sleep_duration_min,
          avg_activity_MET, avg_activity_duration_min)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          req.user_id,
          avg_sleep_hours,
          avg_activity_score,
          med_adherence_pct,
          typical_sleep_window,
          avg_sleep_midpoint_min,
          avg_sleep_duration_min,
          avg_activity_MET,
          avg_activity_duration_min
        ]
      );
    }

    res.json({
      message: "Baseline saved successfully",
      user_id: req.user_id
    });
  } catch (err) {
    console.error("Baseline save error:", err);
    res.status(500).json({ error: "Failed to save baseline", details: err.message });
  }
});

export default router;
