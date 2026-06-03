const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
{
    title: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        required: true,
        trim: true,
    },

    resident: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },

    serviceProvider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
    },

    category: {
        type: String,
    enum: [
        "security",
        "cleaning",
        "waste_management",
        "landscaping",
        "maintenance",
        "payment",
        "other",
    ],
        default: "other",
    },

    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
    },

    status: {
        type: String,
        enum: ["open", "assigned", "in_progress", "resolved", "closed"],
        default: "open",
    },

    resolutionNote: {
        type: String,
        trim: true,
    },

    resolvedAt: {
        type: Date,
    },
},
    { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);