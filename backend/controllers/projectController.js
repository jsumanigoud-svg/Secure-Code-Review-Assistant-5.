const Project = require("../models/Project");
const Scan = require("../models/Scan");
const fs = require("fs");

// Create a new project
exports.createProject = async (req, res) => {
    try {
        const { name, language, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Project name is required" });
        }

        // Check duplicate project name for the same user
        const existing = await Project.findOne({
            owner: req.user.id,
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
        });

        if (existing) {
            return res.status(400).json({ message: "A project with this name already exists" });
        }

        const project = await Project.create({
            name: name.trim(),
            language: language ? language.trim() : "JavaScript",
            description: description ? description.trim() : "",
            owner: req.user.id,
            files: []
        });

        res.status(201).json({
            message: "Project created successfully",
            project
        });
    } catch (error) {
        console.error("Create project error:", error.message);
        res.status(500).json({ message: "Failed to create project", error: error.message });
    }
};

// List all projects owned by the authenticated user
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find({ owner: req.user.id })
            .sort({ createdAt: -1 });

        res.json({
            count: projects.length,
            projects
        });
    } catch (error) {
        console.error("Get projects error:", error.message);
        res.status(500).json({ message: "Failed to retrieve projects" });
    }
};

// Get single project details
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        res.json({ project });
    } catch (error) {
        console.error("Get project details error:", error.message);
        res.status(500).json({ message: "Failed to retrieve project details" });
    }
};

// Update project
exports.updateProject = async (req, res) => {
    try {
        const { name, language, description } = req.body;

        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        if (name && name.trim()) {
            // Check uniqueness if name changed
            if (name.trim().toLowerCase() !== project.name.toLowerCase()) {
                const duplicate = await Project.findOne({
                    owner: req.user.id,
                    name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
                });
                if (duplicate) {
                    return res.status(400).json({ message: "A project with this name already exists" });
                }
            }
            project.name = name.trim();
        }

        if (language) project.language = language.trim();
        if (description !== undefined) project.description = description.trim();

        await project.save();

        res.json({
            message: "Project updated successfully",
            project
        });
    } catch (error) {
        console.error("Update project error:", error.message);
        res.status(500).json({ message: "Failed to update project" });
    }
};

// Delete project and associated scans
exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            owner: req.user.id
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Clean up stored files on disk
        if (project.files && project.files.length > 0) {
            project.files.forEach(f => {
                if (f.path && fs.existsSync(f.path)) {
                    try {
                        fs.unlinkSync(f.path);
                    } catch (err) {
                        console.warn("Could not delete file:", f.path);
                    }
                }
            });
        }

        await Project.deleteOne({ _id: project._id });
        await Scan.deleteMany({ project: project._id });

        res.json({ message: "Project and associated records deleted successfully" });
    } catch (error) {
        console.error("Delete project error:", error.message);
        res.status(500).json({ message: "Failed to delete project" });
    }
};
