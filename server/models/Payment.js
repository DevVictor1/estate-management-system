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

    providerReceipt: {
      status: {
        type: String,
        enum: ["pending", "confirmed", "issue_reported"],
        default: "pending",
      },
      confirmedAt: {
        type: Date,
      },
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      issueReason: {
        type: String,
        enum: [
          "not_received",
          "bank_delay",
          "transaction_reversed",
          "incorrect_amount",
          "other",
        ],
      },
      issueNote: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
      issueReportedAt: {
        type: Date,
      },
      issueReportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      resolution: {
        status: {
          type: String,
          enum: ["unresolved", "resolved"],
          default: "unresolved",
        },
        outcome: {
          type: String,
          enum: [
            "payment_received",
            "bank_delay_resolved",
            "transfer_failed_or_reversed",
            "replacement_payment_required",
            "amount_issue_resolved",
            "other",
          ],
        },
        note: {
          type: String,
          trim: true,
          maxlength: 1000,
        },
        resolvedAt: {
          type: Date,
        },
        resolvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
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
