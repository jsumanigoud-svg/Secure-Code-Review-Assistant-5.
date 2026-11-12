const assert = require("assert");
const { analyzeCode, RULES } = require("../services/analyzer");

console.log("=== Testing Static Code Security Analysis Engine ===");

// Sample vulnerable JavaScript code covering all academic detection targets
const sampleVulnerableCode = `
// Sample vulnerable JavaScript file for static analysis testing
const express = require("express");
const crypto = require("crypto");
const { exec } = require("child_process");

// 1. Hardcoded Secret / Password
const apiKey = "sk_live_9485739485739485739485";
const dbPassword = "SuperSecretPassword123!";
const awsToken = "AKIAIOSFODNN7EXAMPLE";

// 2. Potential SQL Injection
function getUser(req, res) {
    const userId = req.query.id;
    const sql = "SELECT * FROM users WHERE id = " + userId;
    db.query(sql);
}

// 3. Potential Command Injection
function pingServer(host) {
    exec("ping -c 1 " + host, (err, stdout) => {
        console.log(stdout);
    });
}

// 4. Weak Cryptographic Hash (MD5, SHA-1)
function hashPassword(password) {
    const md5Hash = crypto.createHash("md5").update(password).digest("hex");
    const sha1Hash = crypto.createHash('sha1').update(password).digest("hex");
    return md5Hash;
}

// 5. Unsafe Code Execution (eval, Function, string timer)
function calculate(expression) {
    return eval(expression);
}

function runDynamicCode(codeStr) {
    const fn = new Function("a", "b", codeStr);
    setTimeout("console.log('timer triggered')", 1000);
}

// 6. Other Security Risks (Insecure HTTP, DOM XSS, Disabled TLS)
const insecureUrl = "http://api.external-service.com/data";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
document.getElementById("output").innerHTML = "<b>" + userInput + "</b>";
`;

const result = analyzeCode(sampleVulnerableCode, "vulnerable-sample.js");

console.log("Findings Detected:", result.summary.total);
console.log("Summary Breakdown:", result.summary);

// Verifications
assert.ok(result.summary.total >= 8, `Expected at least 8 findings, got ${result.summary.total}`);
assert.ok(result.summary.critical >= 3, `Expected at least 3 critical issues, got ${result.summary.critical}`);
assert.ok(result.summary.high >= 2, `Expected at least 2 high issues, got ${result.summary.high}`);
assert.ok(result.summary.medium >= 2, `Expected at least 2 medium issues, got ${result.summary.medium}`);
assert.ok(result.summary.low >= 1, `Expected at least 1 low issue, got ${result.summary.low}`);

// Check specific vulnerability types
const issueTypes = result.findings.map(f => f.issue);
assert.ok(issueTypes.some(t => t.includes("Password") || t.includes("Secret")), "Password/Secret not found");
assert.ok(issueTypes.some(t => t.includes("SQL Injection")), "SQL Injection not found");
assert.ok(issueTypes.some(t => t.includes("Command Injection")), "Command Injection not found");
assert.ok(issueTypes.some(t => t.includes("Weak Cryptographic Algorithm")), "Weak Cryptographic Algorithm not found");
assert.ok(issueTypes.some(t => t.includes("eval")), "eval() detection not found");
assert.ok(issueTypes.some(t => t.includes("HTTP")), "Insecure HTTP detection not found");

console.log("Sample finding output:");
console.log(JSON.stringify(result.findings[0], null, 2));

console.log("\nALL STATIC ANALYZER UNIT TESTS PASSED!");
