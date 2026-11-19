const mongoose = require("mongoose");

const findingSchema = new mongoose.Schema({
    issue: {
        type: String,
        required: true
    },
    vulnerabilityType: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ["Critical", "High", "Medium", "Low"],
        required: true
    },
    file: {
        type: String,
        required: true
    },
    line: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    codeSnippet: {
        type: String,
        default: ""
    },
    recommendation: {
        type: String,
        default: ""
    }
});

const scanSchema = new mongoose.Schema({
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Project",
        required: true
    },
    projectName: {
        type: String,
        default: "Unnamed Project"
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    targetFile: {
        type: String,
        default: "All files"
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Completed", "Failed"],
        default: "Completed"
    },
    summary: {
        total: { type: Number, default: 0 },
        critical: { type: Number, default: 0 },
        high: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        low: { type: Number, default: 0 }
    },
    findings: [findingSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model("Scan", scanSchema);
