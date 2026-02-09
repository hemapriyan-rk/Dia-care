import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function mockDeviation() {
  const score = Math.floor(Math.random() * 40) + 30;

  let risk_zone = "Green";
  if (score > 70) risk_zone = "Red";
  else if (score > 50) risk_zone = "Amber";

  return {
    deviation_score: score,
    deviation_direction: score > 50 ? "↑" : "↓",
    risk_zone,
    explanation_text: "Deviation based on today's behavior compared to baseline."
  };
}

router.get("/today", authMiddleware, async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    const result = await pool.query(
      "SELECT deviation_score, deviation_direction, risk_zone, explanation_text FROM daily_outputs WHERE user_id=$1 AND log_date=$2",
      [req.user_id, today]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No output yet" });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch output" });
  }
});

router.post("/recalculate", authMiddleware, async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const output = mockDeviation();

  try {
    await pool.query(
      `INSERT INTO daily_outputs
      (user_id, log_date, deviation_score, deviation_direction, risk_zone, explanation_text)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (user_id, log_date)
      DO UPDATE SET
        deviation_score=EXCLUDED.deviation_score,
        deviation_direction=EXCLUDED.deviation_direction,
        risk_zone=EXCLUDED.risk_zone,
        explanation_text=EXCLUDED.explanation_text`,
      [
        req.user_id,
        today,
        output.deviation_score,
        output.deviation_direction,
        output.risk_zone,
        output.explanation_text
      ]
    );

    res.json(output);
  } catch {
    res.status(500).json({ error: "Failed to calculate output" });
  }
});

export default router;
