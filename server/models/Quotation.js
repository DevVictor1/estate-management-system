const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    labourCost: {
      type: Number,
      required: true,
      min: 0,
    },
    materialsCost: {
      type: Number,
      required: true,
      min: 0,
    },
    otherCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDurationValue: {
      type: Number,
      required: true,
      min: 1,
    },
    estimatedDurationUnit: {
      type: String,
      enum: ["hours", "days", "weeks"],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "revision_requested",
      ],
      default: "submitted",
      required: true,
      index: true,
    },
    adminComment: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    revisionNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    createdContract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
    },
  },
  { timestamps: true }
);

quotationSchema.index(
  { task: 1, serviceProvider: 1, revisionNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
