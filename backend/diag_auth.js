/**
 * AUTH DIAGNOSTIC SCRIPT
 * Connects to real MongoDB, reads the stored user record, and tests
 * bcrypt compare + JWT sign/verify without exposing passwords or secrets.
 * Run: node diag_auth.js <email> <password>
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
  console.error("Usage: node diag_auth.js <email> <password>");
  process.exit(1);
}

// ── 1. Environment checks ────────────────────────────────────────────────────
console.log("\n=== ENVIRONMENT ===");
console.log("MONGO_URI set  :", !!process.env.MONGO_URI);
console.log("JWT_SECRET set :", !!process.env.JWT_SECRET);
console.log("JWT_SECRET len :", (process.env.JWT_SECRET || "").length);
console.log("PORT           :", process.env.PORT || "(not set, defaults to 5000)");

// ── 2. bcryptjs module export check ─────────────────────────────────────────
console.log("\n=== BCRYPTJS MODULE ===");
console.log("typeof bcrypt        :", typeof bcrypt);
console.log("bcrypt.hash()        :", typeof bcrypt.hash);
console.log("bcrypt.compare()     :", typeof bcrypt.compare);
console.log("bcrypt.hashSync()    :", typeof bcrypt.hashSync);
console.log("bcrypt.compareSync() :", typeof bcrypt.compareSync);

// ── 3. Schema definition ─────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name:     { type: String },
  email:    { type: String },
  password: { type: String },
}, { timestamps: true });
const User = mongoose.model("User", userSchema);

async function run() {
  // ── 4. Database connection ─────────────────────────────────────────────────
  console.log("\n=== DATABASE ===");
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    console.log("MongoDB connected  : YES");
  } catch (err) {
    console.error("MongoDB connect FAILED:", err.message);
    process.exit(1);
  }

  // ── 5. User lookup ──────────────────────────────────────────────────────────
  console.log("\n=== USER LOOKUP ===");
  const user = await User.findOne({ email: EMAIL }).lean();
  if (!user) {
    console.log("User found         : NO — email not in DB:", EMAIL);
    await mongoose.disconnect();
    process.exit(0);
  }
  console.log("User found         : YES");
  console.log("User._id           :", user._id.toString());
  console.log("User.name          :", user.name);
  console.log("User.email         :", user.email);

  const storedHash = user.password || "";
  console.log("password field set :", !!storedHash);
  console.log("password length    :", storedHash.length);
  console.log("hash starts with   :", storedHash.substring(0, 7));   // e.g. "$2b$10$"
  const looksLikeBcrypt = /^\$2[aby]\$\d+\$/.test(storedHash);
  console.log("looks like bcrypt  :", looksLikeBcrypt);

  if (!looksLikeBcrypt) {
    console.error("\n⚠️  STORED PASSWORD IS NOT A BCRYPT HASH.");
    console.error("    This account was created before hashing was in place, OR");
    console.error("    was inserted manually with a plain-text password.");
    console.error("    bcrypt.compare() will always return false for a plain-text stored value.");
  }

  // ── 6. bcrypt.compare test ─────────────────────────────────────────────────
  console.log("\n=== PASSWORD COMPARE ===");
  let isMatch = false;
  try {
    isMatch = await bcrypt.compare(PASSWORD, storedHash);
    console.log("bcrypt.compare result :", isMatch);
  } catch (err) {
    console.error("bcrypt.compare THREW  :", err.message);
  }

  if (!isMatch) {
    // Extra: test if the stored value IS the plain-text password
    const storedIsPlainText = (storedHash === PASSWORD);
    console.log("stored == plain-text  :", storedIsPlainText);
    if (storedIsPlainText) {
      console.error("\n⚠️  PASSWORD WAS STORED AS PLAIN TEXT (no hashing).");
      console.error("    bcrypt.compare() cannot verify a plain-text stored value.");
    } else {
      console.error("\n⚠️  bcrypt.compare returned false.");
      console.error("    Either the password you typed is wrong, or the hash is corrupted.");
    }
  } else {
    console.log("✅ Password matches the stored hash.");
  }

  // ── 7. JWT generation test ────────────────────────────────────────────────
  console.log("\n=== JWT ===");
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET missing — jwt.sign would throw!");
  } else {
    try {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("jwt.sign OK   :", !!token);
      console.log("jwt.verify OK :", decoded.id === user._id.toString());
      console.log("token prefix  :", token.substring(0, 20) + "...");
    } catch (err) {
      console.error("JWT error:", err.message);
    }
  }

  // ── 8. Summary ──────────────────────────────────────────────────────────────
  console.log("\n=== SUMMARY ===");
  if (isMatch && process.env.JWT_SECRET) {
    console.log("✅ Login SHOULD SUCCEED for this account with these credentials.");
  } else {
    console.log("❌ Login will FAIL. See warnings above.");
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Unexpected error:", err.message);
  process.exit(1);
});
