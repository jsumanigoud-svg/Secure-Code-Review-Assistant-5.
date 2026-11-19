const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const scanController = require("../controllers/scanController");

// All scan routes require authentication
router.use(authMiddleware);

router.post("/", scanController.startScan);
router.get("/", scanController.getScans);
router.get("/:id", scanController.getScanById);
router.get("/:id/report", scanController.getScanReport);

module.exports = router;
