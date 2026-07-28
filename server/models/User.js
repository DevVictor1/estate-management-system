const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
    fullName: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    phone: {
        type: String,
        trim: true,
    },

    password: {
        type: String,
        required: true,
    },

    role: {
        type: String,
        enum: ["admin", "resident", "service_provider"],
        default: "resident",
    },

    estateName: {
        type: String,
        trim: true,
    },

    apartmentNumber: {
        type: String,
        trim: true,
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    emailVerified: {
        type: Boolean,
        default: false,
    },

    emailVerifiedAt: {
        type: Date,
    },

    emailVerificationTokenHash: {
        type: String,
        select: false,
    },

    emailVerificationExpires: {
        type: Date,
        select: false,
    },

    emailVerificationSentAt: {
        type: Date,
        select: false,
    },
},
{ timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
