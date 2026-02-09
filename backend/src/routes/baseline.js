import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT avg_sleep_hours, avg_activity_score, med_adherence_pct, typical_sleep_window FROM user_baselines WHERE user_id = $1",
      [req.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Baseline not found" });
    }

    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch baseline" });
  }
});

export default router;
