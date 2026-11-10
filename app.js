
// Secure Code Review Assistant
// Frontend demonstration logic

let projects = JSON.parse(localStorage.getItem("projects")) || [];
let scans = JSON.parse(localStorage.getItem("scans")) || [];
let uploadedFiles = JSON.parse(localStorage.getItem("uploadedFiles")) || {};

let currentFindings = [];

// Demo vulnerability data.
// Replace this with the backend scan API later.
const demoFindings = [
    {
        issue: "SQL Injection",
        file: "app.js",
        line: 27,
        severity: "Critical",
        description: "Potential unsafe SQL query construction."
    },
    {
        issue: "Hardcoded Password",
        file: "login.js",
        line: 14,
        severity: "High",
        description: "A password appears to be stored directly in code."
    },
    {
        issue: "Missing Input Validation",
        file: "server.js",
        line: 42,
        severity: "Medium",
        description: "User input requires validation."
    },
    {
        issue: "Insecure HTTP Reference",
        file: "config.js",
        line: 10,
        severity: "Low",
        description: "An HTTP URL is used instead of HTTPS."
    }
];

// Login demo
function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    updateDashboard();
}

function logout() {
    document.getElementById("app").classList.add("hidden");
    document.getElementById("loginPage").classList.remove("hidden");
}

// Navigation
document.querySelectorAll(".nav").forEach(button => {
    button.addEventListener("click", () => {
        const page = button.dataset.page;

        document.querySelectorAll(".page").forEach(p =>
            p.classList.remove("active")
        );

        document.querySelectorAll(".nav").forEach(b =>
            b.classList.remove("active")
        );

        document.getElementById(page).classList.add("active");
        button.classList.add("active");

        if (page === "dashboard") updateDashboard();
        if (page === "projects") renderProjects();
        if (page === "upload") updateProjectSelects();
        if (page === "scan") updateProjectSelects();
        if (page === "results") renderResults();
        if (page === "history") renderHistory();
        if (page === "reports") renderReport();
    });
});

// Save data
function saveData() {
    localStorage.setItem("projects", JSON.stringify(projects));
    localStorage.setItem("scans", JSON.stringify(scans));
    localStorage.setItem("uploadedFiles", JSON.stringify(uploadedFiles));
}

// Project management
function addProject() {
    const name = document.getElementById("projectName").value.trim();
    const language = document.getElementById("projectLanguage").value;

    if (!name || !language) {
        alert("Enter project name and select a language.");
        return;
    }

    if (projects.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert("This project already exists.");
        return;
    }

    projects.push({
        id: Date.now(),
        name,
        language,
        date: new Date().toLocaleDateString()
    });

    saveData();

    document.getElementById("projectName").value = "";
    document.getElementById("projectLanguage").value = "";

    renderProjects();
    updateDashboard();

    alert("Project created successfully!");
}

function deleteProject(id) {
    if (!confirm("Are you sure you want to delete this project?")) return;

    projects = projects.filter(p => p.id !== id);
    delete uploadedFiles[id];

    saveData();
    renderProjects();
    updateDashboard();
}

function renderProjects() {
    const list = document.getElementById("projectList");

    if (projects.length === 0) {
        list.innerHTML = "<p>No projects created yet.</p>";
        return;
    }

    list.innerHTML = projects.map(project => `
        <div class="project-card">
            <div>
                <h3>${escapeHTML(project.name)}</h3>
                <p>${escapeHTML(project.language)} · ${escapeHTML(project.date)}</p>
            </div>
            <button class="delete"
                onclick="deleteProject(${project.id})">
                Delete
            </button>
        </div>
    `).join("");
}

// Escape user-provided text before inserting it into HTML
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Project dropdowns
function updateProjectSelects() {
    ["uploadProject", "scanProject"].forEach(id => {
        const select = document.getElementById(id);
        const previous = select.value;

        select.innerHTML = '<option value="">Select Project</option>';

        projects.forEach(project => {
            const option = document.createElement("option");
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });

        if (projects.some(p => String(p.id) === previous)) {
            select.value = previous;
        }
    });
}

// File upload demonstration
document.getElementById("codeFile").addEventListener("change", event => {
    const files = Array.from(event.target.files);

    document.getElementById("selectedFiles").textContent =
        files.length
            ? files.map(f => f.name).join(", ")
            : "No files selected";
});

function uploadFiles() {
    const projectId = document.getElementById("uploadProject").value;
    const files = Array.from(document.getElementById("codeFile").files);

    if (!projectId) {
        alert("Please select a project.");
        return;
    }

    if (!files.length) {
        alert("Please select source code files.");
        return;
    }

    uploadedFiles[projectId] = uploadedFiles[projectId] || [];

    files.forEach(file => {
        if (!uploadedFiles[projectId].includes(file.name)) {
            uploadedFiles[projectId].push(file.name);
        }
    });

    saveData();

    alert("File selection saved in this browser's demo data. Actual server upload is not connected.");
}

// Security scan demonstration
function startScan() {
    const projectId = document.getElementById("scanProject").value;

    if (!projectId) {
        alert("Please select a project.");
        return;
    }

    if (!uploadedFiles[projectId]?.length) {
        alert("Upload source code files before scanning.");
        return;
    }

    const button = document.getElementById("scanButton");
    const area = document.getElementById("scanProgress");
    const bar = document.getElementById("progressBar");
    const message = document.getElementById("scanMessage");

    button.disabled = true;
    area.classList.remove("hidden");

    let progress = 0;

    const timer = setInterval(() => {
        progress += 20;
        bar.style.width = progress + "%";
        message.textContent = "Demo scan progress: " + progress + "%";

        if (progress >= 100) {
            clearInterval(timer);

            const project = projects.find(p => p.id === Number(projectId));

            // Sample findings only; not actual file analysis.
            currentFindings = demoFindings.map(f => ({ ...f }));

            scans.unshift({
                id: Date.now(),
                project: project.name,
                date: new Date().toLocaleString(),
                findings: currentFindings
            });

            saveData();

            message.textContent =
                "Demo scan completed. Sample findings generated.";

            button.disabled = false;
            updateDashboard();
            renderResults();
            renderHistory();
        }
    }, 500);
}

// Vulnerability results
function renderResults() {
    const latest = scans[0];
    const findings = latest ? latest.findings : [];

    const counts = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0
    };

    findings.forEach(f => counts[f.severity]++);

    document.getElementById("resultCritical").textContent = counts.Critical;
    document.getElementById("resultHigh").textContent = counts.High;
    document.getElementById("resultMedium").textContent = counts.Medium;
    document.getElementById("resultLow").textContent = counts.Low;

    const table = document.getElementById("vulnerabilityTable");

    if (!findings.length) {
        table.innerHTML = '<tr><td colspan="5">No scan results available.</td></tr>';
        return;
    }

    table.innerHTML = findings.map(f => `
        <tr>
            <td>${escapeHTML(f.issue)}</td>
            <td>${escapeHTML(f.file)}</td>
            <td>${f.line}</td>
            <td><span class="severity ${f.severity}">${f.severity}</span></td>
            <td>${escapeHTML(f.description)}</td>
        </tr>
    `).join("");
}

// Scan history
function renderHistory() {
    const table = document.getElementById("historyTable");

    if (!scans.length) {
        table.innerHTML = '<tr><td colspan="4">No scan history available.</td></tr>';
        return;
    }

    table.innerHTML = scans.map(scan => `
        <tr>
            <td>${escapeHTML(scan.project)}</td>
            <td>${escapeHTML(scan.date)}</td>
            <td>Completed (Demo)</td>
            <td>${scan.findings.length}</td>
        </tr>
    `).join("");
}

// Dashboard
function updateDashboard() {
    const latest = scans[0];
    const findings = latest ? latest.findings : [];

    const counts = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0
    };

    findings.forEach(f => counts[f.severity]++);

    document.getElementById("totalProjects").textContent = projects.length;
    document.getElementById("totalScans").textContent = scans.length;
    document.getElementById("criticalCount").textContent = counts.Critical;
    document.getElementById("highCount").textContent = counts.High;

    const chart = document.getElementById("severityChart");

    chart.innerHTML = Object.entries(counts).map(([name, count]) => `
        <div class="chart-row">
            <span>${name}</span>
            <div class="bar-track">
                <div class="bar"
                     style="width:${count * 25}%; background:${
                         {Critical:"#ef4444",High:"#f97316",
                          Medium:"#eab308",Low:"#22c55e"}[name]
                     }"></div>
            </div>
            <span>${count}</span>
        </div>
    `).join("");

    const activity = document.getElementById("recentActivity");

    activity.innerHTML = scans.length
        ? scans.slice(0, 4).map(s => `
            <p class="activity-item">
                ${escapeHTML(s.project)} – Demo scan completed
            </p>
        `).join("")
        : "<p>No recent activity.</p>";
}

// Report
function renderReport() {
    const latest = scans[0];
    const content = document.getElementById("reportContent");

    if (!latest) {
        content.innerHTML = "<p>No completed scans available.</p>";
        return;
    }

    const counts = {
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0
    };

    latest.findings.forEach(f => counts[f.severity]++);

    content.innerHTML = `
        <h3>${escapeHTML(latest.project)}</h3>
        <p>Scan Date: ${escapeHTML(latest.date)}</p>
        <p>Total Vulnerabilities: ${latest.findings.length}</p>
        <p>Critical: ${counts.Critical}</p>
        <p>High: ${counts.High}</p>
        <p>Medium: ${counts.Medium}</p>
        <p>Low: ${counts.Low}</p>
        <p><strong>Note:</strong> This is a demonstration report using sample findings.</p>
    `;
}

// Initial rendering
renderProjects();
updateProjectSelects();
updateDashboard();
renderResults();
renderHistory();
renderReport();
