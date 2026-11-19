const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    mimetype: {
        type: String,
        default: "text/javascript"
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Project name is required"],
        trim: true
    },
    language: {
        type: String,
        default: "JavaScript",
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    files: [fileSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model("Project", projectSchema);
