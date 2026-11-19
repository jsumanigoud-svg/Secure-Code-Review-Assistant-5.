/**
 * fix-account.js — Account Inspection & Password Repair Utility
 * ─────────────────────────────────────────────────────────────
 * Connects to your MongoDB Atlas cluster and checks the stored user record.
 * If the password is not a bcrypt hash (plain-text), it re-hashes it safely.
 *
 * Usage:
 *   node fix-account.js <email> <newPassword>
 *
 * Examples:
 *   node fix-account.js user@example.com myNewPassword123
 *
 * This script NEVER prints your password or JWT secret to the console.
 * It only shows whether the account was found and whether the hash was fixed.
 */

require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const mongoose = require("mongoose");

const bcrypt = require("bcryptjs");

const EMAIL    = (process.argv[2] || "").trim().toLowerCase();

if (!EMAIL) {
  console.error("Usage: node fix-account.js <email>");
  process.exit(1);
}

function isBcryptHash(str) {
  return typeof str === "string" && /^\$2[aby]\$\d{2}\$.{53}$/.test(str);
}

const userSchema = new mongoose.Schema({
  name:     String,
  email:    String,
  password: String,
}, { timestamps: true });
// Avoid OverwriteModelError if any other script already defined this model
const User = mongoose.models.User || mongoose.model("User", userSchema);

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI is not set in .env");
    process.exit(1);
  }
  const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const PASSWORD = await new Promise(resolve => {
  rl.question("Enter your account password: ", resolve);
});

rl.close();

if (!PASSWORD) {
  console.error("Password cannot be empty.");
  return;
}

  console.log("\nConnecting to MongoDB Atlas...");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("Connected.\n");

  // ── 1. Find user (case-insensitive) ────────────────────────────────────────
  let user = await User.findOne({ email: EMAIL });
  if (!user) {
    user = await User.findOne({ email: { $regex: new RegExp(`^${EMAIL}$`, "i") } });
  }

  if (!user) {
    console.log("❌  No account found with email:", EMAIL);
    console.log("    Check the email address. Registered emails in DB:");
    const all = await User.find({}, { email: 1, _id: 0 }).lean();
    all.forEach(u => console.log("   -", u.email));
    await mongoose.disconnect();
    return;
  }

  console.log("✅  Account found:");
  console.log("    _id   :", user._id.toString());
  console.log("    name  :", user.name);
  console.log("    email :", user.email);

  // ── 2. Inspect stored password ─────────────────────────────────────────────
  const storedPw = user.password || "";
  const alreadyHashed = isBcryptHash(storedPw);
  console.log("\nStored password audit:");
  console.log("    length          :", storedPw.length);
  console.log("    is bcrypt hash  :", alreadyHashed);

  // ── 3. Test bcrypt compare (if already hashed) ─────────────────────────────
 
  if (alreadyHashed) {
  const matches = await bcrypt.compare(PASSWORD, storedPw);

  console.log("Password matches:", matches);

  if (matches) {
    console.log("\nLogin password verified. No repair needed.");
  } else {
    console.log("\nPassword does NOT match the stored hash.");
    console.log("No changes have been made to your account.");
    await mongoose.disconnect();
    return;
  }

} else {
  if (storedPw !== PASSWORD) {
    console.log("\nSupplied password does not match.");
    console.log("No changes have been made to your account.");
    await mongoose.disconnect();
    return;
  }

  console.log("\nPlain-text password verified. Re-hashing it...");
  const newHash = await bcrypt.hash(PASSWORD, 10);

  await User.updateOne(
    { _id: user._id },
    { password: newHash }
  );

  console.log("Password hashed and saved.");
} 

  // ── 4. Normalize email to lowercase in DB ──────────────────────────────────
  if (user.email !== user.email.toLowerCase()) {
    console.log("\n⚠️  Email in DB has uppercase letters:", user.email);
    console.log("    Normalizing to lowercase for consistent login...");
    await User.updateOne({ _id: user._id }, { email: user.email.toLowerCase() });
    console.log("✅  Email normalized to:", user.email.toLowerCase());
  }

  console.log("\nDone. Restart your backend server and try logging in.\n");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Script error:", err.message);
  process.exit(1);
});
