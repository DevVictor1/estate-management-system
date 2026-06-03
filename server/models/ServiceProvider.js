const mongoose = require("mongoose");

const serviceProviderSchema = new mongoose.Schema(
{
    companyName: {
        type: String,
        required: true,
        trim: true,
    },

    contactPerson: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        trim: true,
        lowercase: true,
    },

    phone: {
        type: String,
        required: true,
        trim: true,
    },

    serviceCategory: {
    type: String,
    enum: [
        "security",
        "cleaning",
        "waste_management",
        "landscaping",
        "maintenance",
        "other",
        ],
    required: true,
    },

    address: {
        type: String,
        trim: true,
    },

    verificationDocuments: [
    {
        documentName: String,
        documentUrl: String,
    },
    ],

    verificationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },

    notes: {
        type: String,
        trim: true,
    },
},
{ timestamps: true }
);

module.exports = mongoose.model("ServiceProvider", serviceProviderSchema);