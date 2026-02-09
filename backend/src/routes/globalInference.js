import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST endpoint to store global inference output
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

router.post("/", authMiddleware, async (req, res) => {
    // Prepare input for Python model
    const userInput = {
        ...req.body,
        user_id: req.user_id
    };
    // Paths
    const codeDir = path.resolve("Code");
    const inputPath = path.join(codeDir, "Json", "user_input.json");
    const outputPath = path.join(codeDir, "Json", "global_inference_output.json");
    const scriptPath = path.join(codeDir, "global_infer.py");

    try {
        // Write user input JSON
        await fs.mkdir(path.dirname(inputPath), { recursive: true });
        await fs.writeFile(inputPath, JSON.stringify(userInput, null, 2));

        // Run Python script
        await new Promise((resolve, reject) => {
            const py = spawn("python3", [scriptPath], { cwd: codeDir });
            let stderr = "";
            py.stderr.on("data", (data) => { stderr += data.toString(); });
            py.on("close", (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Python exited with code ${code}: ${stderr}`));
            });
        });

        // Read output JSON
        const outputRaw = await fs.readFile(outputPath, "utf-8");
        const output = JSON.parse(outputRaw);

        // Store in DB
        await pool.query(
            `INSERT INTO global_inference_outputs
      (user_id, layer, phase, population_glucose_deviation_z, population_deviation)
      VALUES ($1, $2, $3, $4, $5)`,
            [
                output.user_id,
                output.layer,
                output.phase,
                output.population_glucose_deviation_z,
                output.population_deviation
            ]
        );

        res.json({
            message: "Global inference output saved successfully",
            data: output
        });
    } catch (err) {
        console.error("Global inference save error:", err);
        res.status(500).json({ error: "Failed to save global inference output", details: err.message });
    }
});

// GET endpoint to retrieve latest global inference output
router.get("/latest", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
        layer, phase, population_glucose_deviation_z, population_deviation, created_at
       FROM global_inference_outputs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
            [req.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No global inference output found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Global inference fetch error:", err);
        res.status(500).json({ error: "Failed to fetch global inference output", details: err.message });
    }
});

// GET endpoint to retrieve global inference history
router.get("/", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
        layer, phase, population_glucose_deviation_z, population_deviation, created_at
       FROM global_inference_outputs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
            [req.user_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Global inference history fetch error:", err);
        res.status(500).json({ error: "Failed to fetch global inference history", details: err.message });
    }
});

export default router;
