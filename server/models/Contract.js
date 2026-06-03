const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
{
    serviceProvider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
        required: true,
    },

    contractTitle: {
        type: String,
        required: true,
        trim: true,
    },

    contractFileUrl: {
        type: String,
        trim: true,
    },

    startDate: {
        type: Date,
        required: true,
    },

    endDate: {
        type: Date,
        required: true,
    },

    paymentTerms: {
        type: String,
        trim: true,
    },

    contractValue: {
        type: Number,
        default: 0,
    },

    status: {
        type: String,
        enum: ["active", "expired", "terminated", "pending_renewal"],
        default: "active",
    },

    renewalReminderSent: {
        type: Boolean,
        default: false,
    },

    notes: {
        type: String,
        trim: true,
    },
},
{ timestamps: true }
);

module.exports = mongoose.model("Contract", contractSchema);