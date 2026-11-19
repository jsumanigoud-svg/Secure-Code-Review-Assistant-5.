const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists securely inside backend/uploads
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed extensions and MIME types for secure JS code analysis
const ALLOWED_EXTENSIONS = [".js", ".mjs", ".cjs"];
const ALLOWED_MIME_TYPES = [
    "text/javascript",
    "application/javascript",
    "application/x-javascript",
    "text/plain",
    "application/octet-stream"
];

// Maximum file size: 2 Megabytes
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Prevent path traversal by stripping directory segments
        const safeBaseName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${safeBaseName}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(new Error("Invalid file extension. Only JavaScript files (.js, .mjs, .cjs) are accepted for security analysis."));
    }

    if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new Error(`Invalid MIME type '${file.mimetype}'. Only JavaScript source files are accepted.`));
    }

    cb(null, true);
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE
    },
    fileFilter
});

module.exports = {
    upload,
    uploadDir,
    MAX_FILE_SIZE
};
