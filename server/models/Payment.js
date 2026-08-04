const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    serviceProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceProvider",
      required: true,
    },

    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card", "online", "other"],
      default: "bank_transfer",
    },

    paymentType: {
      type: String,
      enum: ["advance", "partial", "final", "reimbursement"],
      default: "final",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },

    paidAt: {
      type: Date,
    },

    paymentEvidence: {
      url: {
        type: String,
        trim: true,
      },
      publicId: {
        type: String,
        select: false,
      },
      originalName: {
        type: String,
        trim: true,
      },
      mimeType: {
        type: String,
        trim: true,
      },
      size: {
        type: Number,
        min: 0,
      },
      uploadedAt: {
        type: Date,
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    referenceNumber: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ serviceProvider: 1, paymentDate: -1, status: 1 });
paymentSchema.index({ contract: 1, status: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
