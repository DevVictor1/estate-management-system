const mongoose = require("mongoose");

const complaintAttachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      select: false,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 1,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

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

    attachments: {
        type: [complaintAttachmentSchema],
        default: [],
    },
},
    { timestamps: true }
);

complaintSchema.index({ resident: 1, createdAt: -1 });

module.exports = mongoose.model("Complaint", complaintSchema);
