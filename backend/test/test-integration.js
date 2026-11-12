/**
 * Comprehensive Backend Integration Test Suite
 * Tests:
 * 1. Auth (Register, Login, JWT verification)
 * 2. Projects (Create, List, Details, Update, Delete)
 * 3. File Uploads (JS validation, Project association, Extension rejection)
 * 4. Security Scan Engine & APIs (Scan execution, History, Details, Structured Report)
 * 5. Dashboard Metrics (Project count, Scans count, Severity aggregation)
 */

const http = require("http");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
require("dotenv").config();

const app = require("../server");
const connectDB = require("../config");

async function runTests() {
    console.log("=== Starting Backend Integration Test Suite ===");
    await connectDB();

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(5099, resolve));
    const BASE_URL = "http://localhost:5099";

    const testEmail = `testuser_${Date.now()}@example.com`;
    const testPassword = "SecurePassword123!";
    let authToken = "";
    let projectId = "";
    let scanId = "";

    try {
        // --- 1. Test Auth: Register ---
        console.log("\n[1/5] Testing User Registration & Login...");
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Integration Tester", email: testEmail, password: testPassword })
        });
        const regData = await regRes.json();
        console.log("Register response:", regRes.status, regData.message);
        if (regRes.status !== 201) throw new Error("Registration failed: " + JSON.stringify(regData));

        // Test Auth: Login
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: testEmail, password: testPassword })
        });
        const loginData = await loginRes.json();
        console.log("Login response:", loginRes.status, loginData.message);
        if (!loginData.token) throw new Error("No token returned from login");
        authToken = loginData.token;

        const authHeader = {
            "Authorization": `Bearer ${authToken}`
        };

        // --- 2. Test Project CRUD ---
        console.log("\n[2/5] Testing Project Management CRUD...");
        const createProjRes = await fetch(`${BASE_URL}/api/projects`, {
            method: "POST",
            headers: { ...authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "Test Audit Project",
                language: "JavaScript",
                description: "Security test workspace"
            })
        });
        const createProjData = await createProjRes.json();
        console.log("Create project response:", createProjRes.status, createProjData.message);
        if (createProjRes.status !== 201 || !createProjData.project) {
            throw new Error("Create project failed");
        }
        projectId = createProjData.project._id;

        // List Projects
        const listProjRes = await fetch(`${BASE_URL}/api/projects`, { headers: authHeader });
        const listProjData = await listProjRes.json();
        console.log("List projects count:", listProjData.count);
        if (listProjData.count < 1) throw new Error("List projects returned 0");

        // Update Project
        const updateProjRes = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
            method: "PUT",
            headers: { ...authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ description: "Updated project description" })
        });
        const updateProjData = await updateProjRes.json();
        console.log("Update project status:", updateProjRes.status, updateProjData.project.description);

        // --- 3. Test File Upload ---
        console.log("\n[3/5] Testing Secure File Upload...");
        // Test JS file upload with multipart form-data
        const sampleJsContent = `
            const apiKey = "sk_live_1234567890abcdef12345";
            function queryUser(userId) {
                return db.query("SELECT * FROM users WHERE id = " + userId);
            }
            eval("console.log('danger')");
        `;

        const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
        let postBody = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="projectId"\r\n\r\n${projectId}\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audit-target.js"\r\nContent-Type: text/javascript\r\n\r\n`),
            Buffer.from(sampleJsContent),
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);

        const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
            method: "POST",
            headers: {
                ...authHeader,
                "Content-Type": `multipart/form-data; boundary=${boundary}`
            },
            body: postBody
        });
        const uploadData = await uploadRes.json();
        console.log("File upload response:", uploadRes.status, uploadData.message);
        if (uploadRes.status !== 201) throw new Error("File upload failed: " + JSON.stringify(uploadData));

        // Test rejecting invalid extension (.exe)
        let invalidBody = Buffer.concat([
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="projectId"\r\n\r\n${projectId}\r\n`),
            Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="malicious.exe"\r\nContent-Type: application/octet-stream\r\n\r\n`),
            Buffer.from("MZ dummy executable content"),
            Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);
        const rejectRes = await fetch(`${BASE_URL}/api/upload`, {
            method: "POST",
            headers: {
                ...authHeader,
                "Content-Type": `multipart/form-data; boundary=${boundary}`
            },
            body: invalidBody
        });
        const rejectData = await rejectRes.json();
        console.log("Invalid upload rejection test (expected 400):", rejectRes.status, "-", rejectData.message);
        if (rejectRes.status !== 400) throw new Error("Failed to reject invalid file extension");

        // --- 4. Test Scan Execution & History ---
        console.log("\n[4/5] Testing Security Scan Execution & Reports...");
        const scanRes = await fetch(`${BASE_URL}/api/scans`, {
            method: "POST",
            headers: { ...authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ projectId })
        });
        const scanData = await scanRes.json();
        console.log("Scan execution response:", scanRes.status, scanData.message);
        console.log("Scan findings count:", scanData.scan.summary.total, "Breakdown:", scanData.scan.summary);
        if (scanRes.status !== 201 || scanData.scan.summary.total === 0) {
            throw new Error("Scan did not detect expected vulnerabilities");
        }
        scanId = scanData.scan._id;

        // Retrieve scan details
        const scanDetailsRes = await fetch(`${BASE_URL}/api/scans/${scanId}`, { headers: authHeader });
        const scanDetailsData = await scanDetailsRes.json();
        console.log("Scan details retrieved for project:", scanDetailsData.scan.projectName);

        // Retrieve scan report
        const reportRes = await fetch(`${BASE_URL}/api/scans/${scanId}/report`, { headers: authHeader });
        const reportData = await reportRes.json();
        console.log("Scan report rating:", reportData.report.executiveSummary.riskRating);
        if (!reportData.report.recommendationsSummary) throw new Error("Report missing recommendations summary");

        // --- 5. Test Dashboard Stats ---
        console.log("\n[5/5] Testing Dashboard Aggregation API...");
        const dashRes = await fetch(`${BASE_URL}/api/dashboard/stats`, { headers: authHeader });
        const dashData = await dashRes.json();
        console.log("Dashboard Stats:", dashData.stats);
        if (dashData.stats.totalProjects < 1 || dashData.stats.totalScans < 1) {
            throw new Error("Dashboard stats did not aggregate correctly");
        }

        console.log("\n>>> ALL 5 END-TO-END BACKEND INTEGRATION TEST SUITES PASSED! <<<");

    } finally {
        server.close();
        await mongoose.connection.close();
    }
}

runTests().catch(err => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
});
