const Project = require("../models/Project");
const fs = require("fs");
const path = require("path");

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded. Please select a valid JavaScript file." });
        }

        const projectId = req.body.projectId || req.params.projectId;
        if (!projectId) {
            // Remove uploaded file if projectId missing
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ message: "Project ID is required to associate the uploaded file." });
        }

        // Verify that the project exists and belongs to the authenticated user
        const project = await Project.findOne({
            _id: projectId,
            owner: req.user.id
        });

        if (!project) {
            if (req.file.path && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ message: "Project not found or you are not authorized to upload to it." });
        }

        // Validate file content: verify it is text readable and not a binary disguised as .js
        const buffer = fs.readFileSync(req.file.path);
        // Check for null bytes (typical indicator of binary executables)
        if (buffer.indexOf(0x00) !== -1) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: "Uploaded file contains binary content. Only plain JavaScript source code is accepted." });
        }

        // Sanitize original name to prevent directory traversal in metadata
        const sanitizedOriginalName = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");

        const fileMetadata = {
            filename: req.file.filename,
            originalName: sanitizedOriginalName,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype || "text/javascript",
            uploadedAt: new Date()
        };

        project.files.push(fileMetadata);
        await project.save();

        res.status(201).json({
            message: "File uploaded successfully",
            file: fileMetadata,
            projectId: project._id,
            projectName: project.name
        });
    } catch (error) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        console.error("Upload controller error:", error.message);
        res.status(500).json({ message: "File upload failed", error: error.message });
    }
};
