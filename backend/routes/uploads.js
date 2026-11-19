const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const uploadController = require("../controllers/uploadController");
const multer = require("multer");

// Middleware to handle multer-specific errors gracefully
const handleUpload = (req, res, next) => {
    // Accept either "file" or "codeFile" (as used in frontend)
    const uploadSingle = upload.fields([
        { name: "file", maxCount: 1 },
        { name: "codeFile", maxCount: 1 }
    ]);

    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "File exceeds 2MB limit. Please upload a smaller file." });
            }
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }

        // Normalize req.file to point to whichever field was passed
        if (req.files) {
            if (req.files.file && req.files.file[0]) {
                req.file = req.files.file[0];
            } else if (req.files.codeFile && req.files.codeFile[0]) {
                req.file = req.files.codeFile[0];
            }
        }

        next();
    });
};

router.post("/", authMiddleware, handleUpload, uploadController.uploadFile);
router.post("/:projectId", authMiddleware, handleUpload, uploadController.uploadFile);

module.exports = router;
