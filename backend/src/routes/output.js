import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Helper function to calculate risk zone based on deviation score
function calculateRiskZone(deviationScore) {
  if (deviationScore > 0.7) return "Red";
  if (deviationScore > 0.4) return "Amber";
  return "Green";
}

// POST endpoint to store AI model output results
router.post("/", authMiddleware, async (req, res) => {
  const {
    behavioral_date,
    phase,
    daily_deviation,
    local_cumulative_deviation,
    local_signal_ready,
    deviation_score,
    deviation_direction,
    explanation_text
  } = req.body;

  const dateToUse = behavioral_date || new Date().toISOString().split("T")[0];
  const riskZone = calculateRiskZone(deviation_score || 0);

  try {
    await pool.query(
      `INSERT INTO daily_outputs
      (user_id, behavioral_date, phase, daily_deviation, local_cumulative_deviation, local_signal_ready, deviation_score, deviation_direction, risk_zone, explanation_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, behavioral_date)
      DO UPDATE SET
        phase = EXCLUDED.phase,
        daily_deviation = EXCLUDED.daily_deviation,
        local_cumulative_deviation = EXCLUDED.local_cumulative_deviation,
        local_signal_ready = EXCLUDED.local_signal_ready,
        deviation_score = EXCLUDED.deviation_score,
        deviation_direction = EXCLUDED.deviation_direction,
        risk_zone = EXCLUDED.risk_zone,
        explanation_text = EXCLUDED.explanation_text`,
      [
        req.user_id,
        dateToUse,
        phase,
        daily_deviation,
        local_cumulative_deviation,
        local_signal_ready,
        deviation_score,
        deviation_direction,
        riskZone,
        explanation_text
      ]
    );

    res.json({
      message: "Output saved successfully",
      data: {
        user_id: req.user_id,
        behavioral_date: dateToUse,
        risk_zone: riskZone
      }
    });
  } catch (err) {
    console.error("Output save error:", err);
    res.status(500).json({ error: "Failed to save output", details: err.message });
  }
});

// GET endpoint for latest output (must come before /:date)
router.get("/latest", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        behavioral_date, phase, daily_deviation, local_cumulative_deviation, 
        local_signal_ready, deviation_score, deviation_direction, risk_zone, 
        explanation_text, created_at
       FROM daily_outputs 
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT 1`,
      [req.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No output found" });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("Output fetch error:", err);
    res.status(500).json({ error: "Failed to fetch output", details: err.message });
  }
});

// GET endpoint for today's output
router.get("/today", authMiddleware, async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    const result = await pool.query(
      `SELECT 
        behavioral_date, phase, daily_deviation, local_cumulative_deviation, 
        local_signal_ready, deviation_score, deviation_direction, risk_zone, 
        explanation_text, created_at
       FROM daily_outputs 
       WHERE user_id = $1 AND behavioral_date = $2`,
      [req.user_id, today]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No output found for today" });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("Output fetch error:", err);
    res.status(500).json({ error: "Failed to fetch output", details: err.message });
  }
});

// GET endpoint for prediction history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 365);
    const result = await pool.query(
      `SELECT 
        behavioral_date, phase, daily_deviation, local_cumulative_deviation, 
        local_signal_ready, deviation_score, deviation_direction, risk_zone, 
        explanation_text, created_at
       FROM daily_outputs 
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT $2`,
      [req.user_id, limit]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error("Output history fetch error:", err);
    res.status(500).json({ error: "Failed to fetch output history", details: err.message });
  }
});

// GET endpoint for specific date's output
router.get("/:date", authMiddleware, async (req, res) => {
  const { date } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        behavioral_date, phase, daily_deviation, local_cumulative_deviation, 
        local_signal_ready, deviation_score, deviation_direction, risk_zone, 
        explanation_text, created_at
       FROM daily_outputs 
       WHERE user_id = $1 AND behavioral_date = $2`,
      [req.user_id, date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No output found for this date" });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("Output fetch error:", err);
    res.status(500).json({ error: "Failed to fetch output", details: err.message });
  }
});

// POST endpoint to store final AI model output
router.post("/final", authMiddleware, async (req, res) => {
  const {
    days_since_account_creation,
    global_weight,
    local_weight,
    global_deviation,
    local_cumulative_deviation,
    final_deviation_score,
    final_deviation
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO final_outputs
      (user_id, days_since_account_creation, global_weight, local_weight, global_deviation, local_cumulative_deviation, final_deviation_score, final_deviation)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING`,
      [
        req.user_id,
        days_since_account_creation,
        global_weight,
        local_weight,
        global_deviation,
        local_cumulative_deviation,
        final_deviation_score,
        final_deviation
      ]
    );

    res.json({
      message: "Final output saved successfully",
      final_deviation_score
    });
  } catch (err) {
    console.error("Final output save error:", err);
    res.status(500).json({ error: "Failed to save final output", details: err.message });
  }
});

// GET endpoint for final output
router.get("/final/latest", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        days_since_account_creation, global_weight, local_weight, 
        global_deviation, local_cumulative_deviation, final_deviation_score, 
        final_deviation, created_at
       FROM final_outputs 
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No final output found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Final output fetch error:", err);
    res.status(500).json({ error: "Failed to fetch final output", details: err.message });
  }
});

export default router;
