const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config");
const authMiddleware = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const uploadRoutes = require("./routes/uploads");
const scanRoutes = require("./routes/scans");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Welcome route
app.get("/", (req, res) => {
    res.send("Secure Code Review Assistant Backend is Running!");
});

// Test API
app.get("/api/test", (req, res) => {
    res.json({
        message: "Backend API is working successfully!"
    });
});

// Protected API route
app.get("/api/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You are authorized!",
        user: req.user
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err.message);
    res.status(err.status || 500).json({
        message: err.message || "Internal server error"
    });
});

// Start server after database connection
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
};

if (require.main === module) {
    startServer();
}

module.exports = app;
