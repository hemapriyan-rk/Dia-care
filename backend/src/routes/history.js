import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT log_date, deviation_score, risk_zone
       FROM daily_outputs
       WHERE user_id=$1
       ORDER BY log_date DESC
       LIMIT 30`,
      [req.user_id]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

export default router;
