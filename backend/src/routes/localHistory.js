import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST endpoint to store local output history entry
router.post("/", authMiddleware, async (req, res) => {
    const {
        behavioral_date,
        daily_deviation,
        cumulative_deviation
    } = req.body;

    const dateToUse = behavioral_date || new Date().toISOString().split("T")[0];

    try {
        await pool.query(
            `INSERT INTO local_output_history
      (user_id, behavioral_date, daily_deviation, cumulative_deviation)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING`,
            [
                req.user_id,
                dateToUse,
                daily_deviation,
                cumulative_deviation
            ]
        );

        res.json({
            message: "Local output history saved successfully",
            data: {
                user_id: req.user_id,
                behavioral_date: dateToUse
            }
        });
    } catch (err) {
        console.error("Local history save error:", err);
        res.status(500).json({ error: "Failed to save local history", details: err.message });
    }
});

// GET endpoint to retrieve local output history
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
        behavioral_date, daily_deviation, cumulative_deviation, created_at
       FROM local_output_history
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT 100`,
            [req.user_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Local history fetch error:", err);
        res.status(500).json({ error: "Failed to fetch local history", details: err.message });
    }
});

// GET endpoint to retrieve specific date's local history
router.get("/:date", authMiddleware, async (req, res) => {
    const { date } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
        behavioral_date, daily_deviation, cumulative_deviation, created_at
       FROM local_output_history
       WHERE user_id = $1 AND behavioral_date = $2`,
            [req.user_id, date]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No local history found for this date" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Local history fetch error:", err);
        res.status(500).json({ error: "Failed to fetch local history", details: err.message });
    }
});

export default router;
