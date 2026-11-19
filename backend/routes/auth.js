
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the string looks like a valid bcrypt hash ($2a$, $2b$, $2y$).
 * Used to detect accounts whose password was stored as plain-text.
 */
function isBcryptHash(str) {
  return typeof str === "string" && /^\$2[aby]\$\d{2}\$.{53}$/.test(str);
}

// Guard: fail fast at startup if JWT_SECRET is missing
if (!process.env.JWT_SECRET) {
  console.error("[AUTH] FATAL: JWT_SECRET is not set in .env — login will not work!");
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Normalize email: lowercase + trim to prevent duplicate registrations
    // that differ only by case (e.g. User@Mail.com vs user@mail.com)
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

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Normalize email to lowercase — matches accounts stored by the fixed
    // register route AND handles old accounts that may have mixed-case emails
    const normalizedEmail = email.trim().toLowerCase();

    // Try exact lowercase match first, then fall back to case-insensitive regex
    // so accounts registered before this fix (with any casing) still work
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") } });
    }

    if (!user) {
      console.log("[AUTH] Login failed — email not found:", normalizedEmail);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ── Password verification ───────────────────────────────────────────────
    // Detect plain-text passwords: if the stored value is NOT a bcrypt hash
    // (e.g. the account was created manually or before hashing was added),
    // do a plain-text comparison and re-hash the password on the spot so
    // the account self-heals without data loss.
    let isMatch = false;

    if (!isBcryptHash(user.password)) {
      console.warn("[AUTH] WARNING: stored password for", user.email,
        "is not a bcrypt hash (length:", user.password ? user.password.length : 0,
        "prefix:", user.password ? user.password.substring(0, 4) : "null",
        "). Attempting plain-text comparison and auto-rehash.");

      isMatch = (user.password === password);

      if (isMatch) {
        // Re-hash the password now so future logins use bcrypt
        const rehashed = await bcrypt.hash(password, 10);
        await User.updateOne({ _id: user._id }, { password: rehashed });
        console.log("[AUTH] Auto-rehash complete for:", user.email);
      }
    } else {
      isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      console.log("[AUTH] Login failed — password mismatch for:", user.email);
      return res.status(400).json({ message: "Invalid email or password" });
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
