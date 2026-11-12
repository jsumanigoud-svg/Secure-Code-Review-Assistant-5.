const Project = require("../models/Project");
const Scan = require("../models/Scan");

// Retrieve dashboard metrics for the authenticated user
exports.getDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Total projects count
        const totalProjects = await Project.countDocuments({ owner: userId });

        // 2. Total scans and recent scans
        const scans = await Scan.find({ user: userId })
            .sort({ createdAt: -1 });

        const totalScans = scans.length;

        // 3. Aggregate vulnerabilities across all completed scans
        const severityCounts = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            total: 0
        };

        scans.forEach(scan => {
            if (scan.summary) {
                severityCounts.critical += scan.summary.critical || 0;
                severityCounts.high += scan.summary.high || 0;
                severityCounts.medium += scan.summary.medium || 0;
                severityCounts.low += scan.summary.low || 0;
                severityCounts.total += scan.summary.total || 0;
            }
        });

        // 4. Latest scan findings for direct dashboard table rendering
        const latestScan = scans.length > 0 ? scans[0] : null;

        // 5. Recent scan activity (up to 5 scans)
        const recentActivity = scans.slice(0, 5).map(s => ({
            id: s._id,
            projectName: s.projectName,
            targetFile: s.targetFile,
            date: s.createdAt,
            status: s.status,
            totalFindings: s.summary ? s.summary.total : 0,
            criticalFindings: s.summary ? s.summary.critical : 0
        }));

        res.json({
            stats: {
                totalProjects,
                totalScans,
                totalVulnerabilities: severityCounts.total,
                severityBreakdown: {
                    Critical: severityCounts.critical,
                    High: severityCounts.high,
                    Medium: severityCounts.medium,
                    Low: severityCounts.low
                }
            },
            latestScan: latestScan ? {
                id: latestScan._id,
                projectName: latestScan.projectName,
                date: latestScan.createdAt,
                summary: latestScan.summary,
                findings: latestScan.findings
            } : null,
            recentActivity
        });
    } catch (error) {
        console.error("Dashboard stats error:", error.message);
        res.status(500).json({ message: "Failed to retrieve dashboard statistics" });
    }
};
