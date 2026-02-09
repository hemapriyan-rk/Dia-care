import express from "express";
import authRoutes from "./routes/auth.js";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db.js";
import authMiddleware from "./middleware/authMiddleware.js";
import baselineRoutes from "./routes/baseline.js";
import historyRoutes from "./routes/history.js";
import dailyLogRoutes from "./routes/dailyLog.js";
import outputRoutes from "./routes/output.js";
import accountAgeRoutes from "./routes/accountAge.js";
import localHistoryRoutes from "./routes/localHistory.js";
import globalInferenceRoutes from "./routes/globalInference.js";



dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use("/auth", authRoutes);

// Data submission routes
app.use("/baseline", baselineRoutes);
app.use("/daily-log", dailyLogRoutes);
app.use("/output", outputRoutes);

// Data retrieval routes
app.use("/history", historyRoutes);
app.use("/account-age", accountAgeRoutes);
app.use("/local-history", localHistoryRoutes);
app.use("/global-inference", globalInferenceRoutes);



const PORT = process.env.PORT || 4000;

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/protected-test", authMiddleware, (req, res) => {
  res.json({ message: "Access granted", user_id: req.user_id });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ db_time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "DB connection failed" });
  }
});
