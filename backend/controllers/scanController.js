const Scan = require("../models/Scan");
const Project = require("../models/Project");
const { analyzeCode } = require("../services/analyzer");
const fs = require("fs");

// Execute a security scan on a project or uploaded file
exports.startScan = async (req, res) => {
    try {
        const { projectId, fileId, rawCode, filename } = req.body;

        if (!projectId && !rawCode) {
            return res.status(400).json({ message: "Either projectId or rawCode must be provided to run a scan." });
        }

        let targetProject = null;
        let allFindings = [];
        let scannedFileName = filename || "direct_input.js";

        if (projectId) {
            targetProject = await Project.findOne({
                _id: projectId,
                owner: req.user.id
            });

            if (!targetProject) {
                return res.status(404).json({ message: "Project not found or unauthorized access." });
            }

            // Case A: Scans uploaded files in the project
            if (targetProject.files && targetProject.files.length > 0) {
                // If specific fileId requested, find that file; otherwise scan all files in project
                const filesToScan = fileId
                    ? targetProject.files.filter(f => f._id.toString() === fileId.toString())
                    : targetProject.files;

                if (filesToScan.length === 0) {
                    return res.status(404).json({ message: "Selected file not found in project." });
                }

                for (const file of filesToScan) {
                    if (fs.existsSync(file.path)) {
                        const content = fs.readFileSync(file.path, "utf-8");
                        const result = analyzeCode(content, file.originalName);
                        allFindings.push(...result.findings);
                    }
                }

                scannedFileName = fileId ? filesToScan[0].originalName : `All Project Files (${filesToScan.length})`;
            } else if (!rawCode) {
                return res.status(400).json({
                    message: "Project has no uploaded files to scan. Please upload a JavaScript file first."
                });
            }
        }

        // Case B: Direct rawCode snippet scanning (or fallback when scanning provided code)
        if (rawCode) {
            const result = analyzeCode(rawCode, scannedFileName);
            allFindings.push(...result.findings);
        }

        const summary = {
            total: allFindings.length,
            critical: allFindings.filter(f => f.severity === "Critical").length,
            high: allFindings.filter(f => f.severity === "High").length,
            medium: allFindings.filter(f => f.severity === "Medium").length,
            low: allFindings.filter(f => f.severity === "Low").length
        };

        // Persist scan to database
        const scan = await Scan.create({
            project: targetProject ? targetProject._id : (await Project.findOne({ owner: req.user.id }))?._id,
            projectName: targetProject ? targetProject.name : "Ad-hoc Scan",
            user: req.user.id,
            targetFile: scannedFileName,
            status: "Completed",
            summary,
            findings: allFindings
        });

        res.status(201).json({
            message: "Security scan completed successfully",
            scan
        });
    } catch (error) {
        console.error("Start scan error:", error.message);
        res.status(500).json({ message: "Failed to perform static security scan", error: error.message });
    }
};

// Retrieve scan history for authenticated user
exports.getScans = async (req, res) => {
    try {
        const { projectId } = req.query;
        const query = { user: req.user.id };

        if (projectId) {
            query.project = projectId;
        }

        const scans = await Scan.find(query)
            .sort({ createdAt: -1 })
            .select("-__v");

        res.json({
            count: scans.length,
            scans
        });
    } catch (error) {
        console.error("Get scans error:", error.message);
        res.status(500).json({ message: "Failed to retrieve scan history" });
    }
};

// Retrieve single scan details
exports.getScanById = async (req, res) => {
    try {
        const scan = await Scan.findOne({
            _id: req.params.id,
            user: req.user.id
        }).populate("project", "name language description");

        if (!scan) {
            return res.status(404).json({ message: "Scan not found" });
        }

        res.json({ scan });
    } catch (error) {
        console.error("Get scan details error:", error.message);
        res.status(500).json({ message: "Failed to retrieve scan details" });
    }
};

// Retrieve structured report for a scan
exports.getScanReport = async (req, res) => {
    try {
        const scan = await Scan.findOne({
            _id: req.params.id,
            user: req.user.id
        }).populate("project", "name language description");

        if (!scan) {
            return res.status(404).json({ message: "Scan not found" });
        }

        const report = {
            reportId: scan._id,
            generatedAt: new Date(),
            scanDate: scan.createdAt,
            projectName: scan.projectName,
            targetFile: scan.targetFile,
            status: scan.status,
            executiveSummary: {
                totalFindings: scan.summary.total,
                critical: scan.summary.critical,
                high: scan.summary.high,
                medium: scan.summary.medium,
                low: scan.summary.low,
                riskRating: scan.summary.critical > 0 ? "CRITICAL RISK"
                    : scan.summary.high > 0 ? "HIGH RISK"
                    : scan.summary.medium > 0 ? "MODERATE RISK"
                    : scan.summary.total > 0 ? "LOW RISK" : "CLEAN"
            },
            findings: scan.findings,
            recommendationsSummary: scan.findings.map((f, i) => ({
                index: i + 1,
                issue: f.issue,
                file: f.file,
                line: f.line,
                severity: f.severity,
                recommendation: f.recommendation
            })),
            disclaimer: "This report is generated by Secure Code Review Assistant (Static Analysis MVP). Pattern-based static analysis may have false positives or negatives and should complement dynamic security testing and peer manual review."
        };

        res.json({ report });
    } catch (error) {
        console.error("Get scan report error:", error.message);
        res.status(500).json({ message: "Failed to generate security report" });
    }
};
