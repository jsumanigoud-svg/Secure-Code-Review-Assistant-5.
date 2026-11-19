const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const projectController = require("../controllers/projectController");

// All project routes require authentication
router.use(authMiddleware);

router.post("/", projectController.createProject);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProjectById);
router.put("/:id", projectController.updateProject);
router.delete("/:id", projectController.deleteProject);

module.exports = router;
