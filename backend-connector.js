/**
 * Secure Code Review Assistant - Frontend to Backend Connector
 * 
 * This companion script connects Sumani's existing UI elements (index.html)
 * to the live Express/MongoDB backend APIs (http://localhost:5000/api).
 * 
 * To activate live backend mode in index.html, add this tag right after app.js:
 *   <script src="backend-connector.js"></script>
 */

const API_BASE = "http://localhost:5000/api";

const SecureCodeAPI = {
    getToken() {
        return localStorage.getItem("auth_token") || "";
    },

    setToken(token) {
        localStorage.setItem("auth_token", token);
    },

    getHeaders(isFormData = false) {
        const headers = {};
        const token = this.getToken();
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        if (!isFormData) {
            headers["Content-Type"] = "application/json";
        }
        return headers;
    },

    // 1. Authentication
    async login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            this.setToken(data.token);
        }
        return { ok: res.ok, data };
    },

    async register(name, email, password) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        return { ok: res.ok, data };
    },

    // 2. Project Management
    async getProjects() {
        const res = await fetch(`${API_BASE}/projects`, {
            headers: this.getHeaders()
        });
        return await res.json();
    },

    async createProject(name, language = "JavaScript", description = "") {
        const res = await fetch(`${API_BASE}/projects`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({ name, language, description })
        });
        return await res.json();
    },

    async deleteProject(projectId) {
        const res = await fetch(`${API_BASE}/projects/${projectId}`, {
            method: "DELETE",
            headers: this.getHeaders()
        });
        return await res.json();
    },

    // 3. File Upload
    async uploadFile(projectId, file) {
        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("file", file);

        const res = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            headers: this.getHeaders(true),
            body: formData
        });
        return await res.json();
    },

    // 4. Security Scan
    async startScan(projectId) {
        const res = await fetch(`${API_BASE}/scans`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify({ projectId })
        });
        return await res.json();
    },

    async getScanHistory() {
        const res = await fetch(`${API_BASE}/scans`, {
            headers: this.getHeaders()
        });
        return await res.json();
    },

    async getScanReport(scanId) {
        const res = await fetch(`${API_BASE}/scans/${scanId}/report`, {
            headers: this.getHeaders()
        });
        return await res.json();
    },

    // 5. Dashboard Stats
    async getDashboardStats() {
        const res = await fetch(`${API_BASE}/dashboard/stats`, {
            headers: this.getHeaders()
        });
        return await res.json();
    }
};

// Expose on global window object for immediate usage in developer console or UI scripts
window.SecureCodeAPI = SecureCodeAPI;
