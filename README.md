# 🛡️ Secure Code Review Assistant

**An Automated Static Code Security Analysis Tool (SAST)**

[![Live Demo](https://img.shields.io/badge/Live-Demo-2ea44f)](https://secure-code-review-assistant-5-1.onrender.com)

## 🌐 Live Application

- **Frontend:** https://secure-code-review-assistant-5-1.onrender.com
- **Backend:** https://secure-code-review-assistant-5.onrender.com

## 📖 About the Project

Secure Code Review Assistant is an academic full-stack application developed as part of the B.Tech Computer Science and Engineering Software Engineering project.

It performs static security analysis of JavaScript source code to identify potential vulnerabilities, hardcoded credentials, dangerous function calls, and injection flaws before deployment.

The tool helps developers identify security risks and understand recommended remediation steps.

## ✨ Key Features

### 1. User Authentication
- User registration and login.
- Password hashing using bcryptjs.
- JWT-based authentication.
- Protected API routes.

### 2. Project Management
- Create, view, update, and delete projects.
- User-specific project access.
- Track uploaded files and scan records.

### 3. Secure File Upload
- Supports `.js`, `.mjs`, and `.cjs` files.
- 2 MB file-size limit.
- File-type and content validation.
- Filename sanitization and path traversal protection.

### 4. Static Code Security Analysis

The analyzer checks for:

| Vulnerability | CWE |
|---|---|
| Hardcoded passwords and secrets | CWE-798 |
| Potential SQL Injection | CWE-89 |
| Potential Command Injection | CWE-78 |
| Weak Cryptographic Algorithms | CWE-327 |
| Unsafe Dynamic Code Execution | CWE-95 |
| Unencrypted HTTP communication | CWE-319 |
| Unsafe innerHTML assignments | CWE-79 |

### 5. Scan History and Reports
- Stores scan findings.
- Displays severity levels and vulnerable code snippets.
- Provides line numbers and remediation recommendations.
- Generates structured security reports.

### 6. Dashboard and Analytics
- Total projects and scans.
- Vulnerability severity breakdown.
- Recent scan activity.
- Critical, High, Medium, and Low severity counts.

## 🛠️ Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js
- REST APIs

**Database**
- MongoDB Atlas
- Mongoose

**Security**
- bcryptjs
- JSON Web Tokens (JWT)
- Multer

**Deployment**
- Render
- GitHub

## 👥 Project Team

| Team Member | Responsibilities |
|---|---|
| Lalini Perka | Backend development, Express APIs, MongoDB integration, file uploads, security analysis engine, scan and reporting APIs |
| Sumani | Frontend development, UI layout, CSS styling, dashboard visualization, client-side interactions |

## 📁 Project Structure

```text
Secure-Code-Review-Assistant/
│
├── index.html
├── style.css
├── app.js
├── backend-connector.js
├── .gitignore
├── README.md
│
└── backend/
    ├── server.js
    ├── package.json
    ├── package-lock.json
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── services/
    └── test/
```

## ⚙️ Installation and Setup

### Prerequisites

- Node.js 18 or higher
- npm
- MongoDB Atlas account or local MongoDB

### 1. Clone the repository

```bash
git clone https://github.com/jsumanigoud-svg/Secure-Code-Review-Assistant-5..git
```

### 2. Navigate to the project

```bash
cd Secure-Code-Review-Assistant-5.
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure environment variables

Create a `.env` file inside the `backend` folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

**Important:** Never upload your `.env` file, database password, or JWT secret to GitHub.

### 5. Start the backend

```bash
npm start
```

The local backend runs at:

```text
http://localhost:5000
```

### 6. Open the frontend

Open `index.html` in a browser or use VS Code Live Server.

## 🔌 API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | User login |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create a project |
| PUT | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |
| POST | `/api/upload` | Upload
