const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        trim: true,
    },

    serviceProvider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
        required: true,
    },

    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    complaint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
        default: null,
    },

    deadline: {
        type: Date,
        required: true,
    },

    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
    },

    status: {
        type: String,
        enum: ["pending", "in_progress", "completed", "overdue", "cancelled"],
        default: "pending",
    },

    completionNote: {
        type: String,
        trim: true,
    },

    completedAt: {
        type: Date,
    },
},
{ timestamps: true }
);

taskSchema.index({ serviceProvider: 1, status: 1 });
taskSchema.index({ serviceProvider: 1, completedAt: -1 });

module.exports = mongoose.model("Task", taskSchema);
