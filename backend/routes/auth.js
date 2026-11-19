
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Escape special characters before using an email in a regular expression
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Register user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword
    });

    console.log("[AUTH] New user registered:", normalizedEmail);

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id
    });
  } catch (error) {
    console.error("[AUTH] Registration error:", error.message);
    res.status(500).json({ message: "Registration failed" });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: { $regex: new RegExp("^" + escapeRegex(normalizedEmail) + "$", "i") }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Always verify passwords using bcrypt. Never compare plain-text passwords.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[AUTH] JWT_SECRET is not configured");
      return res.status(500).json({ message: "Login configuration error" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log("[AUTH] Login successful for:", user.email);

    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("[AUTH] Login error:", error.message);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
