const mongoose = require("mongoose");

const paymentDetailsSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    accountName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    accountNumber: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    accountType: {
      type: String,
      enum: ["savings", "current", "corporate", "other"],
    },
    preferredPaymentMethod: {
      type: String,
      enum: ["bank_transfer", "cash", "cheque", "wallet", "other"],
      default: "bank_transfer",
    },
    paystackRecipientCode: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    updatedAt: {
      type: Date,
    },
  },
  { _id: false }
);

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

    paymentDetails: paymentDetailsSchema,
},
{ timestamps: true }
);

serviceProviderSchema.index({ email: 1 });

module.exports = mongoose.model("ServiceProvider", serviceProviderSchema);
