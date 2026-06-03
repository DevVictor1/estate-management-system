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

module.exports = mongoose.model("Task", taskSchema);