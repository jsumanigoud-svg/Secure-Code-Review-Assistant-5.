const authMiddleware = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

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

// Start server after database connection
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
};

startServer();
