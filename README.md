# Secure Code Review Assistant – A Static Code Security Analysis Tool

An academic, full-stack static application security testing (SAST) tool developed for B.Tech CSE Software Engineering. The assistant analyzes JavaScript source code to identify security vulnerabilities, hardcoded secrets, dangerous function calls, and injection flaws before deployment.

---

## 👥 Project Team & Responsibilities
- **Backend Developer (Lalini Perka):**
  - Express.js REST API architecture
  - MongoDB Atlas database schemas and integration
  - Secure file upload pipeline with Multer and validation
  - Rule-based static code security analysis engine
  - Scan history, reporting, and dashboard analytics APIs
- **Frontend / UI Developer (Sumani):**
  - UI layout, CSS styling (`style.css`), and view management (`index.html`)
  - Client-side interactions and dashboard visualization (`app.js`)

---

## 🌟 Key Features

### 1. User Authentication & Session Security
- User registration and login with input validation.
- Secure password hashing using **bcryptjs** (10 salt rounds).
- Stateless authorization via JSON Web Tokens (**JWT**).
- Route-level security middleware protecting all project, upload, scan, and metric endpoints.

### 2. Project Management API
- Full CRUD operations: Create, List, Retrieve, Update, and Delete projects.
- Strict user-isolation: Authenticated users can only view and manage their own projects.
- Associated file metadata tracking and automated cascade cleanup on project deletion.

### 3. Secure File Upload Pipeline
- Accepts JavaScript files (`.js`, `.mjs`, `.cjs`) with strict MIME-type validation.
- File size limit enforced at 2 MB.
- Content validation: Binary executable detection (null-byte inspection) to prevent file-type spoofing.
- Path traversal defense: Filename sanitization and unique timestamp prefixes prevent directory traversal attacks.

### 4. Rule-Based JavaScript Static Analysis Engine
Scans source code line-by-line without executing untrusted code:
- **Hardcoded Secrets & API Keys (CWE-798):** Identifies plaintext passwords, API keys, JWT tokens, AWS access keys, and private keys.
- **Potential SQL Injection (CWE-89):** Flags dynamic SQL queries constructed via string concatenation or template literal variable interpolation.
- **Potential Command Injection (CWE-78):** Detects execution of system commands via `child_process.exec()` or `execSync()` with dynamic arguments.
- **Weak Cryptographic Algorithms (CWE-327):** Warns against deprecated collision-prone hashes (MD5 and SHA-1).
- **Unsafe Dynamic Code Execution (CWE-95):** Identifies `eval()`, `new Function()`, and implicit string evaluation in `setTimeout()` / `setInterval()`.
- **Additional Security Risks:** Detects unencrypted HTTP URLs (CWE-319), unvalidated `innerHTML` DOM assignments (CWE-79), and disabled TLS verification (`NODE_TLS_REJECT_UNAUTHORIZED = '0'`).

### 5. Scan History & Structured Reporting
- Persistent storage of scan findings with CWE identifiers, line numbers, vulnerable code snippets, and remediation steps.
- Executive scan reports with risk ratings (Critical, High, Moderate, Low, Clean) and print-friendly formatting.

### 6. Dashboard Metrics & Analytics
- Real-time aggregation of total projects, total scans, and total vulnerabilities.
- Vulnerability breakdown grouped by severity level (Critical, High, Medium, Low).
- Recent activity log for rapid audit tracking.

---

## 📁 Repository Structure

```text
SecureCodeReview-Team/
│
├── index.html                      # Sumani's dashboard UI & application views
├── style.css                       # Responsive CSS styles and dark mode theme
├── app.js                          # Client-side UI logic and event listeners
├── .gitignore                      # Excludes .env, node_modules/, and uploads/
├── README.md                       # Complete project documentation
│
└── backend/
    ├── server.js                   # Express application entry point & route mounting
    ├── config.js                   # MongoDB Atlas Mongoose connection
    ├── package.json                # Backend scripts and dependencies
    │
    ├── models/
    │   ├── User.js                 # User credentials and profile schema
    │   ├── Project.js              # Project metadata and uploaded file references
    │   └── Scan.js                 # Scan records, summary counts, and findings
    │
    ├── middleware/
    │   ├── auth.js                 # JWT bearer token verification
    │   └── upload.js               # Multer upload limits and file filters
    │
    ├── controllers/
    │   ├── projectController.js    # Project CRUD business logic
    │   ├── uploadController.js     # Secure upload processing & content checks
    │   ├── scanController.js       # Static analysis execution & reports
    │   └── dashboardController.js  # Analytics and severity aggregation
    │
    ├── routes/
    │   ├── auth.js                 # /api/auth (register, login)
    │   ├── projects.js             # /api/projects (CRUD endpoints)
    │   ├── uploads.js              # /api/upload (JS file upload)
    │   ├── scans.js                # /api/scans (scan execution, history, reports)
    │   └── dashboard.js            # /api/dashboard (stats and metrics)
    │
    ├── services/
    │   └── analyzer.js             # Static Code Security Analysis Engine
    │
    └── test/
        ├── test-analyzer.js        # Unit tests for static analyzer rules
        └── test-integration.js     # End-to-end API integration test suite
```

---

## ⚙️ Environment Configuration

Create a `.env` file inside the `backend/` directory (`backend/.env`). **Never commit this file to version control.**

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key_here
```

*(Note: Both `.env` and `uploads/` are strictly ignored by `.gitignore` to prevent sensitive credentials or user code from leaking).*

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)
- Active MongoDB Atlas cluster or local MongoDB instance

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Run Automated Verification Tests
```bash
# Run Static Analyzer Unit Tests
node test/test-analyzer.js

# Run Full Backend Integration Suite (Requires active MongoDB in .env)
node test/test-integration.js
```

### 3. Start the Backend Server
```bash
# Production mode
npm start

# Development mode (with nodemon auto-reload)
npm run dev
```
The backend starts at `http://localhost:5000`.

### 4. Open the Frontend
Open `index.html` directly in any modern web browser or serve it using an HTTP server (e.g., Live Server in VS Code or `npx serve .`).

---

## 📡 API Endpoint Reference

All endpoints except `/api/auth/*`, `/`, and `/api/test` require the HTTP header:
`Authorization: Bearer <JWT_TOKEN>`

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | `{ "name": "...", "email": "...", "password": "..." }` |
| `POST` | `/api/auth/login` | Authenticate user & get JWT | `{ "email": "...", "password": "..." }` |

### Project Management (`/api/projects`)
| Method | Endpoint | Description | Payload / Response |
|---|---|---|---|
| `POST` | `/api/projects` | Create a new project | `{ "name": "My App", "language": "JavaScript", "description": "..." }` |
| `GET` | `/api/projects` | List all projects owned by user | Returns array of projects with file counts |
| `GET` | `/api/projects/:id` | Get details of a single project | Returns project object |
| `PUT` | `/api/projects/:id` | Update project metadata | `{ "name": "...", "description": "..." }` |
| `DELETE` | `/api/projects/:id` | Delete project and uploaded files | Cascades delete to scan records |

### File Upload (`/api/upload`)
| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `POST` | `/api/upload` | Upload `.js` source file | `multipart/form-data` with `projectId` and `file` or `codeFile` |

### Security Scans (`/api/scans`)
| Method | Endpoint | Description | Payload / Response |
|---|---|---|---|
| `POST` | `/api/scans` | Execute static security scan | `{ "projectId": "<ID>" }` or `{ "rawCode": "..." }` |
| `GET` | `/api/scans` | Retrieve user's scan history | Query param: `?projectId=<ID>` (optional) |
| `GET` | `/api/scans/:id` | Get detailed findings of a scan | Returns findings list with line numbers and snippets |
| `GET` | `/api/scans/:id/report`| Get executive structured report | Formatted report with risk rating & remediation summary |

### Dashboard Analytics (`/api/dashboard`)
| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregated dashboard metrics | Total projects, total scans, total issues, severity breakdown, recent scans |

---

## 🔍 Example Scanning Workflow

1. **User Registration & Login:** User logs in via `/api/auth/login` and receives a JWT token.
2. **Project Creation:** User creates a project (e.g., "Payment Gateway") via `POST /api/projects`.
3. **Upload JavaScript File:** User selects a file (e.g., `checkout.js`) and uploads it via `POST /api/upload` associated with the project.
4. **Trigger Security Analysis:** User clicks "Start Security Scan", calling `POST /api/scans` with the `projectId`.
5. **Review Findings:** The rule engine inspects the file, detects vulnerabilities (such as SQL injection on line 24 or hardcoded credentials on line 8), and displays findings on the UI table.
6. **Download / Print Report:** User views the structured executive report with recommended fixes and can print or save it for audit documentation.

---

## ⚠️ Known Limitations (Academic Scope)

As this is an academic Static Application Security Testing (SAST) prototype:
1. **No Runtime / Dynamic Taint Analysis:** The analyzer operates strictly on static source code patterns (regex and lexical checks). It does not track runtime variable values across complex scopes or inter-procedural flows.
2. **Code Obfuscation:** Heavily obfuscated, dynamically compiled, or minified JavaScript code may bypass regex pattern matching.
3. **Language Scope:** The security analysis engine is optimized specifically for JavaScript (`.js`, `.mjs`, `.cjs`). Supporting additional languages (Python, Java, C++) requires adding language-specific parsers.
4. **False Positives / Negatives:** Regular expression static checks may produce occasional false positives (e.g., test mocks with dummy passwords) or false negatives. Static analysis should be complemented by peer code review and dynamic testing (DAST).
