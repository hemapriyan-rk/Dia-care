import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  console.log("METHOD:", req.method);
  console.log("HEADERS:", req.headers["content-type"]);
  console.log("BODY:", req.body);

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: "Missing credentials",
      received_body: req.body ?? null
    });
  }

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { user_id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    await pool.query(
      "UPDATE users SET last_login = NOW() WHERE id = $1",
      [user.id]
    );

    res.json({
      token,
      user_id: user.id
    });

  } catch (err) {
    console.error("LOGIN ERROR FULL:", err);
    res.status(500).json({
      error: "Login failed",
      message: err.message
    });
  }

});

// Register new user
router.post("/register", async (req, res) => {
  const { email, password, passwordConfirm } = req.body || {};

  if (!email || !password || !passwordConfirm) {
    return res.status(400).json({
      error: "Missing required fields: email, password, passwordConfirm"
    });
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({
      error: "Passwords do not match"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters"
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: "Invalid email format"
    });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Email already registered"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user ONLY (no profile or baseline yet)
    const newUserResult = await pool.query(
      "INSERT INTO users (email, password_hash, is_active, created_at, last_login) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id",
      [email, hashedPassword, true]
    );

    const userId = newUserResult.rows[0].id;

    // Generate JWT token for frontend to use for profile setup
    const token = jwt.sign(
      { user_id: userId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Response indicates user needs to complete profile setup
    res.status(201).json({
      token,
      user_id: userId,
      message: "User created successfully. Please complete your profile.",
      requires_profile_setup: true
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({
      error: "Registration failed",
      message: err.message
    });
  }
});

export default router;
