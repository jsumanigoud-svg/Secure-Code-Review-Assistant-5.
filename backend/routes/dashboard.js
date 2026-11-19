const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const dashboardController = require("../controllers/dashboardController");

// Dashboard route requires authentication
router.use(authMiddleware);

router.get("/stats", dashboardController.getDashboardStats);

module.exports = router;
