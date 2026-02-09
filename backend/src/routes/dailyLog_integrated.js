import express from "express";
import pool from "../db.js";
import authMiddleware from "../middleware/authMiddleware.js";
import {
    runCompletePipeline,
    getModelStatus
} from "../services/pythonModels.js";

const router = express.Router();

/**
 * Helper function to discretize final score into risk categories
 * @param {number} score - Final deviation score
 * @returns {string} - Risk category: 'UP', 'STABLE', 'DOWN'
 */
function categorizeRisk(score) {
    if (score >= 1.5) return "UP";
    if (score <= -1.5) return "DOWN";
    return "STABLE";
}

/**
 * Helper function to generate explanation text
 * @param {object} output - Final model output
 * @returns {string} - Explanation of prediction
 */
function generateExplanation(output) {
    const { final_deviation, weights, days_since_account_creation } = output;

    const riskText = {
        1: "Your glucose levels show higher variability. Consider reviewing your daily routine.",
        0: "Your glucose levels are stable. Keep maintaining your current routine.",
        "-1": "Your glucose levels show improved stability. Great job!"
    };

    const weightText = days_since_account_creation <= 20
        ? "We're using population-based insights (90%) with your personal data (10%)."
        : days_since_account_creation <= 60
            ? "We're balancing population insights (60%) with your personal patterns (40%)."
            : "We're primarily using your personal patterns (100%) to predict your glucose control.";

    return `${riskText[final_deviation]} ${weightText}`;
}

// POST endpoint for submitting daily behavioral data with ML model inference
router.post("/", authMiddleware, async (req, res) => {
    const {
        behavioral_date,
        sleep_midpoint_min,
        sleep_duration_min,
        medication_times_min,
        dose_count,
        mean_med_time_min,
        activity_duration_min,
        activity_MET,
        activity_load,
        stress_level,
        sleep_quality,
        medication_taken
    } = req.body;

    const dateToUse = behavioral_date || new Date().toISOString().split("T")[0];

    try {
        // ==================== STEP 1: Store Daily Data ====================
        console.log("[Daily Log] Processing submission for user:", req.user_id, "date:", dateToUse);

        let medTimes = null;
        if (medication_times_min && Array.isArray(medication_times_min) && medication_times_min.length > 0) {
            medTimes = `{${medication_times_min.join(',')}}`;
        }

        // Insert daily behavioral log
        await pool.query(
            `INSERT INTO daily_behavior_logs
      (user_id, behavioral_date, sleep_midpoint_min, sleep_duration_min, medication_times_min, 
       dose_count, mean_med_time_min, activity_duration_min, activity_MET, activity_load, 
       stress_level, sleep_quality, medication_taken)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id, behavioral_date)
      DO UPDATE SET
        sleep_midpoint_min = EXCLUDED.sleep_midpoint_min,
        sleep_duration_min = EXCLUDED.sleep_duration_min,
        medication_times_min = EXCLUDED.medication_times_min,
        dose_count = EXCLUDED.dose_count,
        mean_med_time_min = EXCLUDED.mean_med_time_min,
        activity_duration_min = EXCLUDED.activity_duration_min,
        activity_MET = EXCLUDED.activity_MET,
        activity_load = EXCLUDED.activity_load,
        stress_level = EXCLUDED.stress_level,
        sleep_quality = EXCLUDED.sleep_quality,
        medication_taken = EXCLUDED.medication_taken`,
            [
                req.user_id,
                dateToUse,
                sleep_midpoint_min,
                sleep_duration_min,
                medTimes,
                dose_count,
                mean_med_time_min,
                activity_duration_min,
                activity_MET,
                activity_load,
                stress_level,
                sleep_quality,
                medication_taken
            ]
        );

        console.log("[Daily Log] Data stored successfully");

        // ==================== STEP 2: Fetch User Profile & Baseline ====================
        const profileResult = await pool.query(
            `SELECT age, sex FROM user_profiles WHERE user_id = $1`,
            [req.user_id]
        );

        if (profileResult.rows.length === 0) {
            return res.status(400).json({
                error: "User profile not found. Please complete profile setup.",
                data: null
            });
        }

        const userProfile = profileResult.rows[0];
        console.log("[Daily Log] User profile:", userProfile);

        const baselineResult = await pool.query(
            `SELECT * FROM user_baselines WHERE user_id = $1`,
            [req.user_id]
        );

        if (baselineResult.rows.length === 0) {
            // No baseline yet, store data but skip model inference
            console.log("[Daily Log] No baseline found, skipping model inference");

            return res.status(201).json({
                message: "Daily data saved successfully. Please complete your baseline setup for predictions.",
                data: {
                    user_id: req.user_id,
                    behavioral_date: dateToUse,
                    saved: true,
                    predicted: false,
                    reason: "Baseline not yet established"
                }
            });
        }

        const baseline = baselineResult.rows[0];
        console.log("[Daily Log] Baseline found");

        // ==================== STEP 3: Get Account Age ====================
        const accountAgeResult = await pool.query(
            `SELECT EXTRACT(DAY FROM NOW() - created_at)::int as days FROM users WHERE id = $1`,
            [req.user_id]
        );

        const accountAgeDays = accountAgeResult.rows[0].days || 0;
        console.log("[Daily Log] Account age:", accountAgeDays, "days");

        // ==================== STEP 4: Fetch Previous Local State (if exists) ====================
        const localStateResult = await pool.query(
            `SELECT * FROM local_output_history 
       WHERE user_id = $1 
       ORDER BY behavioral_date DESC 
       LIMIT 1`,
            [req.user_id]
        );

        const previousLocalState = localStateResult.rows.length > 0
            ? {
                days_observed: accountAgeDays,
                cumulative_deviation: localStateResult.rows[0].cumulative_deviation || 0,
                baseline: baseline
            }
            : null;

        // ==================== STEP 5: Invoke ML Models ====================
        console.log("[Daily Log] Starting ML pipeline...");
        console.log("[Daily Log] Model status:", getModelStatus());

        let pipelineResult;
        try {
            pipelineResult = await runCompletePipeline({
                dailyData: {
                    sleep_midpoint_min,
                    sleep_duration_min,
                    medication_times_min: medication_times_min || [],
                    dose_count,
                    mean_med_time_min,
                    activity_duration_min,
                    activity_MET,
                    activity_load,
                    stress_level,
                    sleep_quality,
                    medication_taken
                },
                baseline,
                userProfile,
                accountAgeDays,
                previousLocalState
            });
        } catch (modelError) {
            console.error("[Daily Log] Model inference failed:", modelError);

            // Continue with data storage, mark as partial
            return res.status(202).json({
                message: "Daily data saved, but model inference failed. Please try again later.",
                data: {
                    user_id: req.user_id,
                    behavioral_date: dateToUse,
                    saved: true,
                    predicted: false,
                    error: modelError.message
                }
            });
        }

        if (pipelineResult.pipeline_status === 'error') {
            console.error("[Daily Log] Pipeline failed:", pipelineResult.error);

            return res.status(202).json({
                message: "Daily data saved, but model inference failed.",
                data: {
                    user_id: req.user_id,
                    behavioral_date: dateToUse,
                    saved: true,
                    predicted: false,
                    error: pipelineResult.error
                }
            });
        }

        console.log("[Daily Log] ML pipeline completed successfully");

        // ==================== STEP 6: Store Model Outputs ====================
        const finalOutput = pipelineResult.final_output;
        const localOutput = pipelineResult.local_layer;
        const globalOutput = pipelineResult.global_layer;

        const riskZone = categorizeRisk(finalOutput.final_deviation_score);
        const explanation = generateExplanation(finalOutput);

        // Store daily output with prediction
        await pool.query(
            `INSERT INTO daily_outputs
      (user_id, behavioral_date, phase, daily_deviation, local_cumulative_deviation,
       local_signal_ready, deviation_score, deviation_direction, risk_zone, explanation_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, behavioral_date)
      DO UPDATE SET
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
                "inference",
                localOutput.local_daily_deviation || 0,
                localOutput.local_cumulative_deviation || 0,
                localOutput.local_signal_ready || false,
                finalOutput.final_deviation_score || 0,
                finalOutput.final_deviation || 0,
                riskZone,
                explanation
            ]
        );

        // Store in local history for trend tracking
        await pool.query(
            `INSERT INTO local_output_history
      (user_id, behavioral_date, daily_deviation, cumulative_deviation)
      VALUES ($1, $2, $3, $4)`,
            [
                req.user_id,
                dateToUse,
                localOutput.local_daily_deviation || 0,
                localOutput.local_cumulative_deviation || 0
            ]
        );

        // Store global inference output
        await pool.query(
            `INSERT INTO global_inference_outputs
      (user_id, layer, phase, population_glucose_deviation_z, population_deviation)
      VALUES ($1, $2, $3, $4, $5)`,
            [
                req.user_id,
                "global",
                "inference",
                globalOutput.population_glucose_deviation_z || 0,
                globalOutput.population_deviation || 0
            ]
        );

        // Store final output if final_outputs table exists
        try {
            await pool.query(
                `INSERT INTO final_outputs
        (user_id, days_since_account_creation, global_weight, local_weight,
         global_deviation, local_cumulative_deviation, final_deviation_score, final_deviation)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    req.user_id,
                    accountAgeDays,
                    finalOutput.weights?.global || 0.5,
                    finalOutput.weights?.local || 0.5,
                    globalOutput.population_deviation || 0,
                    localOutput.local_cumulative_deviation || 0,
                    finalOutput.final_deviation_score || 0,
                    finalOutput.final_deviation || 0
                ]
            );
        } catch (err) {
            console.warn("[Daily Log] Could not store in final_outputs table:", err.message);
        }

        console.log("[Daily Log] All outputs stored successfully");

        // ==================== STEP 7: Return Success Response ====================
        res.status(201).json({
            message: "Daily data submitted and analyzed successfully",
            data: {
                user_id: req.user_id,
                behavioral_date: dateToUse,
                saved: true,
                predicted: true,
                prediction: {
                    deviation_score: finalOutput.final_deviation_score,
                    risk_zone: riskZone,
                    risk_label: {
                        1: "Higher Risk",
                        0: "Stable",
                        "-1": "Lower Risk"
                    }[finalOutput.final_deviation] || "Unknown",
                    explanation: explanation,
                    model_weights: finalOutput.weights,
                    account_age_days: accountAgeDays
                },
                models: {
                    local: {
                        daily_deviation: localOutput.local_daily_deviation,
                        cumulative_deviation: localOutput.local_cumulative_deviation,
                        signal_ready: localOutput.local_signal_ready
                    },
                    global: {
                        glucose_deviation_z: globalOutput.population_glucose_deviation_z,
                        population_deviation: globalOutput.population_deviation
                    }
                }
            }
        });

    } catch (err) {
        console.error("Daily log submission error:", err);
        res.status(500).json({
            error: "Failed to process daily log submission",
            details: err.message,
            data: null
        });
    }
});

// GET endpoint to retrieve latest daily output with prediction
router.get("/latest", authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT behavioral_date, deviation_score, risk_zone, explanation_text,
              local_cumulative_deviation, local_signal_ready, created_at
       FROM daily_outputs
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT 1`,
            [req.user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "No daily output found yet",
                data: null
            });
        }

        res.json({
            message: "Latest daily output",
            data: result.rows[0]
        });
    } catch (err) {
        console.error("Daily output fetch error:", err);
        res.status(500).json({
            error: "Failed to fetch daily output",
            details: err.message
        });
    }
});

// GET endpoint to retrieve daily output history
router.get("/history", authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 30, 365);
        const offset = parseInt(req.query.offset) || 0;

        const result = await pool.query(
            `SELECT behavioral_date, deviation_score, risk_zone, local_cumulative_deviation,
              local_signal_ready, created_at
       FROM daily_outputs
       WHERE user_id = $1
       ORDER BY behavioral_date DESC
       LIMIT $2 OFFSET $3`,
            [req.user_id, limit, offset]
        );

        res.json({
            message: "Daily output history",
            count: result.rows.length,
            data: result.rows
        });
    } catch (err) {
        console.error("Daily output history fetch error:", err);
        res.status(500).json({
            error: "Failed to fetch daily output history",
            details: err.message
        });
    }
});

export default router;
