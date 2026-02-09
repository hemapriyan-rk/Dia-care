import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET endpoint for account age information
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
        id, email, created_at,
        EXTRACT(DAY FROM NOW() - created_at)::INTEGER as days_since_account_creation,
        NOW()::DATE as current_date
       FROM users 
       WHERE id = $1`,
            [req.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        const row = result.rows[0];
        res.json({
            user_id: req.user_id,
            account_created_date: row.created_at,
            current_date: row.current_date,
            days_since_account_creation: row.days_since_account_creation
        });
    } catch (err) {
        console.error("Account age fetch error:", err);
        res.status(500).json({ error: "Failed to fetch account age", details: err.message });
    }
});

export default router;
