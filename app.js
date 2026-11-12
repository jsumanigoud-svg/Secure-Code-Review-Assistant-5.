/**
 * Secure Code Review Assistant - Frontend Application Logic
 * Full-stack integration connecting Sumani's UI to the Express/MongoDB backend APIs.
 */

const API_BASE = "http://localhost:5000/api";

// Global in-memory cache for the current session
let userProjects = [];
let latestScan = null;
let currentScanId = null;
let isRegisterMode = false;

// Helper: Retrieve authentication token from localStorage
function getAuthToken() {
    return localStorage.getItem("token") || "";
}

// Helper: Retrieve standard headers with Bearer authorization
function getAuthHeaders(isFormData = false) {
    const headers = {};
    const token = getAuthToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}

// Helper: Escape HTML to prevent XSS during rendering
function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, match => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[match]);
}

// Initialize application state on page load
document.addEventListener("DOMContentLoaded", () => {
    checkAuthStatus();

    const fileInput = document.getElementById("codeFile");
    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            const nameEl = document.getElementById("fileName");
            if (nameEl) {
                nameEl.textContent = file ? `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` : "No file selected";
            }
        });
    }

    // Load initial dashboard if token exists
    if (getAuthToken()) {
        fetchDashboardStats();
        fetchProjects();
    }
});

// Authentication status checker
function checkAuthStatus() {
    const token = getAuthToken();
    const userName = localStorage.getItem("userName") || "User";
    const greetingEl = document.getElementById("userGreeting");
    const navAuth = document.getElementById("navAuth");

    if (token) {
        if (greetingEl) greetingEl.textContent = `Welcome, ${userName}`;
        if (navAuth) navAuth.textContent = "Logout";
    } else {
        if (greetingEl) greetingEl.textContent = "Welcome, Guest";
        if (navAuth) navAuth.textContent = "Login";
    }
}

// Sidebar page switching navigation
function showPage(pageId, button) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));

    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add("active");
    }

    document.querySelectorAll(".sidebar button").forEach(btn => btn.classList.remove("active"));
    if (button) {
        button.classList.add("active");
    } else {
        const navMap = {
            dashboard: "navDashboard",
            projects: "navProjects",
            upload: "navUpload",
            scan: "navScan",
            results: "navResults",
            history: "navHistory",
            report: "navReport",
            login: "navAuth"
        };
        const defaultNav = document.getElementById(navMap[pageId]);
        if (defaultNav) defaultNav.classList.add("active");
    }

    // Trigger automatic data loading on page navigation
    if (pageId === "dashboard") {
        fetchDashboardStats();
    } else if (pageId === "projects") {
        fetchProjects();
    } else if (pageId === "upload" || pageId === "scan") {
        populateProjectDropdowns();
    } else if (pageId === "results") {
        renderResultsView();
    } else if (pageId === "history") {
        fetchScanHistory();
    } else if (pageId === "report") {
        renderReportView();
    }
}

// Authentication navigation handler (Login/Logout)
function handleAuthNav(button) {
    if (getAuthToken()) {
        // Logout user
        localStorage.removeItem("token");
        localStorage.removeItem("userName");
        checkAuthStatus();
        alert("You have been logged out.");
        showPage("login", button);
    } else {
        showPage("login", button);
    }
}

// Toggle between Login and Register views
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById("authTitle");
    const heading = document.getElementById("authHeading");
    const nameGroup = document.getElementById("authNameGroup");
    const submitBtn = document.getElementById("authSubmitBtn");
    const togglePrompt = document.getElementById("authTogglePrompt");
    const toggleLink = document.getElementById("authToggleLink");
    const msg = document.getElementById("authMessage");

    if (msg) msg.textContent = "";

    if (isRegisterMode) {
        if (title) title.textContent = "Register";
        if (heading) heading.textContent = "Create an Account";
        if (nameGroup) nameGroup.style.display = "block";
        if (submitBtn) submitBtn.textContent = "Register";
        if (togglePrompt) togglePrompt.textContent = "Already have an account?";
        if (toggleLink) toggleLink.textContent = "Login here";
    } else {
        if (title) title.textContent = "Login";
        if (heading) heading.textContent = "Secure Code Review Assistant";
        if (nameGroup) nameGroup.style.display = "none";
        if (submitBtn) submitBtn.textContent = "Login";
        if (togglePrompt) togglePrompt.textContent = "Don't have an account?";
        if (toggleLink) toggleLink.textContent = "Register here";
    }
}

// Handle Login / Registration form submission
async function handleAuthSubmit() {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const name = document.getElementById("authName") ? document.getElementById("authName").value.trim() : "";
    const msg = document.getElementById("authMessage");
    const submitBtn = document.getElementById("authSubmitBtn");

    if (!email || !password) {
        if (msg) {
            msg.style.color = "#f87171";
            msg.textContent = "Please enter both email and password.";
        }
        return;
    }

    if (isRegisterMode && !name) {
        if (msg) {
            msg.style.color = "#f87171";
            msg.textContent = "Please enter your name.";
        }
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = isRegisterMode ? "Registering..." : "Logging in...";
    if (msg) {
        msg.style.color = "#38bdf8";
        msg.textContent = "Processing authentication...";
    }

    try {
        if (isRegisterMode) {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Registration failed");
            }

            msg.style.color = "#4ade80";
            msg.textContent = "Registered successfully! Switching to login...";
            setTimeout(() => {
                toggleAuthMode();
                document.getElementById("authEmail").value = email;
            }, 1200);

        } else {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Invalid credentials");
            }

            localStorage.setItem("token", data.token);
            // Derive a friendly display name from email or response
            const displayName = email.split("@")[0];
            localStorage.setItem("userName", displayName);

            checkAuthStatus();
            msg.style.color = "#4ade80";
            msg.textContent = "Login successful! Redirecting to Dashboard...";

            setTimeout(() => {
                const dashBtn = document.getElementById("navDashboard");
                showPage("dashboard", dashBtn);
                fetchDashboardStats();
                fetchProjects();
            }, 800);
        }
    } catch (err) {
        if (msg) {
            msg.style.color = "#f87171";
            msg.textContent = err.message;
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isRegisterMode ? "Register" : "Login";
    }
}

// Dashboard statistics loader
async function fetchDashboardStats() {
    if (!getAuthToken()) {
        const activity = document.getElementById("dashRecentActivity");
        if (activity) activity.innerHTML = `<p style="color:#f87171">Please log in to view your dashboard metrics.</p>`;
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: getAuthHeaders()
        });

        if (res.status === 401) {
            localStorage.removeItem("token");
            checkAuthStatus();
            return;
        }

        const data = await res.json();
        const stats = data.stats || {};

        document.getElementById("dashTotalProjects").textContent = stats.totalProjects || 0;
        document.getElementById("dashTotalScans").textContent = stats.totalScans || 0;
        document.getElementById("dashCriticalIssues").textContent = (stats.severityBreakdown && stats.severityBreakdown.Critical) || 0;
        document.getElementById("dashHighIssues").textContent = (stats.severityBreakdown && stats.severityBreakdown.High) || 0;

        if (data.latestScan) {
            latestScan = data.latestScan;
        }

        const activityContainer = document.getElementById("dashRecentActivity");
        if (activityContainer) {
            if (data.recentActivity && data.recentActivity.length > 0) {
                activityContainer.innerHTML = data.recentActivity.map(item => `
                    <p style="margin-top:12px; font-size:14px;">
                        <strong>${escapeHTML(item.projectName)}</strong> (${escapeHTML(item.targetFile)}) – 
                        <span class="status-badge">${escapeHTML(item.status)}</span>
                        ${item.totalFindings > 0 ? `<span style="color:#fb923c; margin-left:8px;">${item.totalFindings} vulnerabilities found</span>` : `<span style="color:#4ade80; margin-left:8px;">Clean</span>`}
                    </p>
                `).join("");
            } else {
                activityContainer.innerHTML = `<p style="color:#94a3b8">No recent scans recorded. Create a project and start a scan.</p>`;
            }
        }
    } catch (err) {
        console.error("Dashboard stats fetch error:", err);
    }
}

// Project management: List projects
async function fetchProjects() {
    if (!getAuthToken()) return;

    const listEl = document.getElementById("projectList");
    if (!listEl) return;

    try {
        const res = await fetch(`${API_BASE}/projects`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        userProjects = data.projects || [];
        populateProjectDropdowns();

        if (userProjects.length === 0) {
            listEl.innerHTML = `<p style="color:#94a3b8">No projects created yet. Use the form above to create your first project.</p>`;
            return;
        }

        listEl.innerHTML = userProjects.map(proj => {
            const fileCount = proj.files ? proj.files.length : 0;
            const created = new Date(proj.createdAt).toLocaleDateString();
            return `
                <div class="project-item">
                    <div>
                        <h4 style="color:#38bdf8; font-size:16px;">${escapeHTML(proj.name)}</h4>
                        <p style="color:#94a3b8; font-size:13px; margin-top:4px;">
                            ${escapeHTML(proj.language)} · ${fileCount} uploaded file(s) · Created: ${created}
                        </p>
                        ${proj.description ? `<p style="color:#cbd5e1; font-size:12px; margin-top:4px;">${escapeHTML(proj.description)}</p>` : ""}
                    </div>
                    <div>
                        <button class="action-danger" onclick="deleteProject('${proj._id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Error fetching projects:", err);
        listEl.innerHTML = `<p style="color:#f87171">Failed to load projects: ${escapeHTML(err.message)}</p>`;
    }
}

// Project management: Create project
async function addProject() {
    if (!getAuthToken()) {
        alert("Please log in first to create a project.");
        showPage("login", document.getElementById("navAuth"));
        return;
    }

    const nameInput = document.getElementById("projectName");
    const langInput = document.getElementById("language");
    const descInput = document.getElementById("projectDescription");
    const msgEl = document.getElementById("projectMessage");
    const btn = document.getElementById("createProjectBtn");

    const name = nameInput.value.trim();
    const language = langInput.value;
    const description = descInput ? descInput.value.trim() : "";

    if (!name) {
        if (msgEl) {
            msgEl.style.color = "#f87171";
            msgEl.textContent = "Please enter a project name.";
        }
        return;
    }

    btn.disabled = true;
    btn.textContent = "Creating...";

    try {
        const res = await fetch(`${API_BASE}/projects`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, language, description })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to create project");
        }

        nameInput.value = "";
        if (descInput) descInput.value = "";
        if (msgEl) {
            msgEl.style.color = "#4ade80";
            msgEl.textContent = "Project created successfully!";
        }

        await fetchProjects();
        fetchDashboardStats();
    } catch (err) {
        if (msgEl) {
            msgEl.style.color = "#f87171";
            msgEl.textContent = err.message;
        }
    } finally {
        btn.disabled = false;
        btn.textContent = "Create Project";
    }
}

// Project management: Delete project
async function deleteProject(id) {
    if (!confirm("Are you sure you want to delete this project and all associated files and scans?")) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/projects/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to delete project");
        }

        await fetchProjects();
        fetchDashboardStats();
    } catch (err) {
        alert("Error deleting project: " + err.message);
    }
}

// Populate Project Select Dropdowns on Upload & Scan pages
function populateProjectDropdowns() {
    const uploadSelect = document.getElementById("uploadProjectSelect");
    const scanSelect = document.getElementById("scanProjectSelect");

    const selects = [uploadSelect, scanSelect].filter(Boolean);

    selects.forEach(select => {
        const previousVal = select.value;
        select.innerHTML = `<option value="">-- Select Project --</option>`;

        userProjects.forEach(proj => {
            const opt = document.createElement("option");
            opt.value = proj._id;
            const fileCount = proj.files ? proj.files.length : 0;
            opt.textContent = `${proj.name} (${fileCount} files)`;
            select.appendChild(opt);
        });

        if (userProjects.some(p => p._id === previousVal)) {
            select.value = previousVal;
        }
    });
}

// File Upload
async function uploadFile() {
    if (!getAuthToken()) {
        alert("Please log in first.");
        showPage("login", document.getElementById("navAuth"));
        return;
    }

    const projectSelect = document.getElementById("uploadProjectSelect");
    const fileInput = document.getElementById("codeFile");
    const statusEl = document.getElementById("uploadStatus");
    const uploadBtn = document.getElementById("uploadBtn");

    const projectId = projectSelect.value;
    const file = fileInput.files[0];

    if (!projectId) {
        alert("Please select a target project from the dropdown.");
        return;
    }

    if (!file) {
        alert("Please select a JavaScript source code file (.js, .mjs, .cjs).");
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = "Uploading...";
    statusEl.style.color = "#38bdf8";
    statusEl.textContent = "Uploading and validating JavaScript file...";

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("codeFile", file);

    try {
        const res = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${getAuthToken()}`
            },
            body: formData
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "File upload rejected");
        }

        statusEl.style.color = "#4ade80";
        statusEl.textContent = `Success: '${data.file.originalName}' uploaded to project '${data.projectName}'.`;

        fileInput.value = "";
        document.getElementById("fileName").textContent = "No file selected";

        await fetchProjects();
    } catch (err) {
        statusEl.style.color = "#f87171";
        statusEl.textContent = `Upload Error: ${err.message}`;
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload File";
    }
}

// Security Scan: Trigger Scan
async function startScan() {
    if (!getAuthToken()) {
        alert("Please log in first.");
        showPage("login", document.getElementById("navAuth"));
        return;
    }

    const select = document.getElementById("scanProjectSelect");
    const statusEl = document.getElementById("scanStatus");
    const scanBtn = document.getElementById("scanBtn");
    const projectId = select.value;

    if (!projectId) {
        alert("Please select a project to scan.");
        return;
    }

    scanBtn.disabled = true;
    statusEl.style.color = "#38bdf8";
    statusEl.textContent = "Analyzing source code with static analysis engine...";

    try {
        const res = await fetch(`${API_BASE}/scans`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ projectId })
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Security scan failed");
        }

        latestScan = data.scan;
        currentScanId = data.scan._id;

        statusEl.style.color = "#4ade80";
        statusEl.textContent = `Scan completed! Found ${data.scan.summary.total} potential issues. Loading results...`;

        fetchDashboardStats();

        // Automatically transition to Scan Results view to display findings
        setTimeout(() => {
            const resBtn = document.getElementById("navResults");
            showPage("results", resBtn);
        }, 800);

    } catch (err) {
        statusEl.style.color = "#f87171";
        statusEl.textContent = `Scan Error: ${err.message}`;
    } finally {
        scanBtn.disabled = false;
    }
}

// Render Results View
function renderResultsView() {
    const findingsTable = document.getElementById("vulnerabilitiesTableBody");
    const projectHeader = document.getElementById("resultsProjectName");

    if (!latestScan) {
        document.getElementById("resCritical").textContent = "0";
        document.getElementById("resHigh").textContent = "0";
        document.getElementById("resMedium").textContent = "0";
        document.getElementById("resLow").textContent = "0";
        if (findingsTable) {
            findingsTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8">No recent scan executed. Run a security scan to inspect findings.</td></tr>`;
        }
        return;
    }

    const summary = latestScan.summary || { critical: 0, high: 0, medium: 0, low: 0 };
    document.getElementById("resCritical").textContent = summary.critical || 0;
    document.getElementById("resHigh").textContent = summary.high || 0;
    document.getElementById("resMedium").textContent = summary.medium || 0;
    document.getElementById("resLow").textContent = summary.low || 0;

    if (projectHeader) {
        projectHeader.textContent = `Project: ${latestScan.projectName || "Target"} (${latestScan.targetFile || "All Files"})`;
    }

    const findings = latestScan.findings || [];
    if (findings.length === 0) {
        findingsTable.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#4ade80">✓ No vulnerabilities detected! Code passed all static security checks.</td></tr>`;
        return;
    }

    findingsTable.innerHTML = findings.map(f => {
        const severityClass = (f.severity || "low").toLowerCase();
        return `
            <tr>
                <td>
                    <strong>${escapeHTML(f.issue)}</strong>
                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${escapeHTML(f.vulnerabilityType)}</div>
                </td>
                <td>${escapeHTML(f.file)}</td>
                <td>Line ${f.line}</td>
                <td class="${severityClass}">${escapeHTML(f.severity)}</td>
                <td style="font-size:13px; max-width:300px;">
                    <div>${escapeHTML(f.recommendation || f.description)}</div>
                    ${f.codeSnippet ? `<code style="display:block; background:#0f172a; padding:4px 6px; border-radius:4px; font-size:11px; margin-top:4px; color:#cbd5e1;">${escapeHTML(f.codeSnippet)}</code>` : ""}
                </td>
            </tr>
        `;
    }).join("");
}

// Scan History View
async function fetchScanHistory() {
    if (!getAuthToken()) return;

    const tableBody = document.getElementById("historyTableBody");
    if (!tableBody) return;

    try {
        const res = await fetch(`${API_BASE}/scans`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        const scans = data.scans || [];

        if (scans.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8">No past security scans found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = scans.map(s => {
            const dateStr = new Date(s.createdAt).toLocaleString();
            const total = s.summary ? s.summary.total : 0;
            return `
                <tr>
                    <td><strong>${escapeHTML(s.projectName)}</strong></td>
                    <td>${escapeHTML(s.targetFile)}</td>
                    <td>${dateStr}</td>
                    <td>${total} issue(s)</td>
                    <td><span class="status-badge">${escapeHTML(s.status)}</span></td>
                    <td>
                        <button class="action-secondary" onclick="viewHistoricalScan('${s._id}')">View</button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#f87171">Error loading scan history: ${escapeHTML(err.message)}</td></tr>`;
    }
}

// Load a specific historical scan and switch to results
async function viewHistoricalScan(scanId) {
    try {
        const res = await fetch(`${API_BASE}/scans/${scanId}`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        if (data.scan) {
            latestScan = data.scan;
            currentScanId = data.scan._id;
            const resBtn = document.getElementById("navResults");
            showPage("results", resBtn);
        }
    } catch (err) {
        alert("Failed to load historical scan: " + err.message);
    }
}

// Render Security Report View
async function renderReportView() {
    const detailsContainer = document.getElementById("reportDetails");
    if (!detailsContainer) return;

    const scanIdToLoad = currentScanId || (latestScan ? latestScan._id : null);

    if (!scanIdToLoad) {
        detailsContainer.innerHTML = `<p style="color:#94a3b8">No scan selected. Complete a scan or select one from Scan History to inspect the executive report.</p>`;
        return;
    }

    detailsContainer.innerHTML = `<p style="color:#38bdf8">Generating executive security report...</p>`;

    try {
        const res = await fetch(`${API_BASE}/scans/${scanIdToLoad}/report`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();
        const report = data.report;

        if (!report) {
            throw new Error("Report data not found");
        }

        const exec = report.executiveSummary;
        const scanDate = new Date(report.scanDate).toLocaleString();

        detailsContainer.innerHTML = `
            <div style="background:#0f172a; padding:20px; border-radius:8px; margin-bottom:20px;">
                <h3 style="color:#38bdf8; margin-bottom:10px;">Executive Summary: ${escapeHTML(report.projectName)}</h3>
                <p><strong>Target:</strong> ${escapeHTML(report.targetFile)}</p>
                <p><strong>Scan Timestamp:</strong> ${scanDate}</p>
                <p><strong>Overall Risk Rating:</strong> <span style="font-weight:bold; color:${exec.critical > 0 ? '#f87171' : exec.high > 0 ? '#fb923c' : '#4ade80'}">${escapeHTML(exec.riskRating)}</span></p>
                <p><strong>Total Vulnerabilities:</strong> ${exec.totalFindings} (Critical: ${exec.critical}, High: ${exec.high}, Medium: ${exec.medium}, Low: ${exec.low})</p>
            </div>

            <h3 style="margin-top:20px; color:#38bdf8;">Prioritized Remediation Action Items</h3>
            <div style="margin-top:10px;">
                ${report.recommendationsSummary && report.recommendationsSummary.length > 0 ? report.recommendationsSummary.map(item => `
                    <div style="background:#0f172a; padding:12px 16px; border-radius:6px; margin-bottom:10px; border-left:3px solid ${item.severity === 'Critical' ? '#f87171' : item.severity === 'High' ? '#fb923c' : '#facc15'};">
                        <strong>#${item.index}. ${escapeHTML(item.issue)}</strong> [${escapeHTML(item.severity)}] in <em>${escapeHTML(item.file)}:L${item.line}</em>
                        <p style="margin-top:4px; font-size:13px; color:#cbd5e1;">${escapeHTML(item.recommendation)}</p>
                    </div>
                `).join("") : "<p style='color:#4ade80'>No remediation required. Zero vulnerabilities detected.</p>"}
            </div>

            <div style="margin-top:25px; padding:15px; background:#182438; border-radius:6px; font-size:12px; color:#94a3b8;">
                <strong>Academic Scope & Disclaimer:</strong> ${escapeHTML(report.disclaimer)}
            </div>
        `;

    } catch (err) {
        detailsContainer.innerHTML = `<p style="color:#f87171">Failed to generate report: ${escapeHTML(err.message)}</p>`;
    }
}
