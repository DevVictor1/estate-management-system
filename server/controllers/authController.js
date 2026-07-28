const jwt = require("jsonwebtoken");
const ServiceProvider = require("../models/ServiceProvider");
const User = require("../models/User");
const { sendEmail } = require("../services/emailService");
const { buildVerifyEmailTemplate } = require("../emailTemplates/verifyEmail");
const {
  GENERIC_RESEND_RESPONSE,
} = require("../middleware/resendVerificationRateLimit");
const {
  isValidEmail,
  normalizeEmail,
  isEmailVerified,
  getEmailVerificationExpiresMinutes,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  getEmailVerificationUrl,
} = require("../utils/emailVerification");

const allowedServiceCategories = [
  "security",
  "cleaning",
  "waste_management",
  "landscaping",
  "maintenance",
  "other",
];

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

const getPublicUserData = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  estateName: user.estateName,
  apartmentNumber: user.apartmentNumber,
  isActive: user.isActive,
  emailVerified: isEmailVerified(user),
  emailVerifiedAt: user.emailVerifiedAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const applyEmailVerificationToken = (user) => {
  const { rawToken, tokenHash, expiresAt, expiresInMinutes } =
    generateEmailVerificationToken();

  user.emailVerificationTokenHash = tokenHash;
  user.emailVerificationExpires = expiresAt;
  user.emailVerificationSentAt = new Date();

  return {
    rawToken,
    expiresInMinutes,
  };
};

const sendVerificationEmailToUser = async (user) => {
  const verificationData = applyEmailVerificationToken(user);
  await user.save();

  const verificationUrl = getEmailVerificationUrl(verificationData.rawToken);

  if (!verificationUrl || !isValidEmail(user.email)) {
    return {
      success: false,
      error:
        "Verification email could not be sent because the verification link is unavailable.",
    };
  }

  const template = buildVerifyEmailTemplate({
    userName: user.fullName,
    verificationUrl,
    expiresInMinutes: verificationData.expiresInMinutes,
  });

  return sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

const GENERIC_RESEND_MESSAGE = GENERIC_RESEND_RESPONSE.message;
const RESEND_COOLDOWN_MS = 60 * 1000;

const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role,
      estateName,
      apartmentNumber,
      serviceCategory,
      customServiceCategory,
      address,
    } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Admin accounts must never be created through the public registration flow.
    const safeRole = role === "service_provider" ? "service_provider" : "resident";

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const user = await User.create({
      fullName,
      email: normalizedEmail,
      phone,
      password,
      role: safeRole,
      estateName,
      apartmentNumber,
      emailVerified: false,
    });

    if (safeRole === "service_provider") {
      try {
        const safeServiceCategory = allowedServiceCategories.includes(serviceCategory)
          ? serviceCategory
          : "other";

        // Service provider accounts start in a pending state until an admin approves them.
        await ServiceProvider.create({
          companyName: fullName,
          contactPerson: fullName,
          email: normalizedEmail,
          phone,
          serviceCategory: safeServiceCategory,
          address,
          verificationStatus: "pending",
          notes:
            safeServiceCategory === "other" && customServiceCategory
              ? customServiceCategory
              : undefined,
        });
      } catch (providerError) {
        await User.findByIdAndDelete(user._id);

        return res.status(500).json({
          success: false,
          message: "Failed to complete service provider registration",
        });
      }
    }

    let verificationEmailSent = false;
    const emailResult = await sendVerificationEmailToUser(user);

    if (!emailResult.success) {
      console.warn(
        "User registered, but verification email could not be sent."
      );
    } else {
      verificationEmailSent = true;
    }

    res.status(201).json({
      success: true,
      message: verificationEmailSent
        ? "Account created successfully. We sent a verification link to your email address."
        : "Account created successfully, but we could not send the verification email right now.",
      emailVerificationRequired: true,
      verificationEmailSent,
      data: getPublicUserData(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to register user",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!isEmailVerified(user)) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before signing in.",
        code: "EMAIL_NOT_VERIFIED",
        emailVerificationRequired: true,
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is missing. Please add it to your .env file.",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: getPublicUserData(user),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to login user",
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "User profile fetched successfully",
    data: getPublicUserData(req.user),
  });
};

const verifyEmail = async (req, res) => {
  try {
    const rawToken = String(req.query.token || "").trim();

    if (!rawToken) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has expired.",
      });
    }

    const tokenHash = hashEmailVerificationToken(rawToken);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select(
      "+emailVerificationTokenHash +emailVerificationExpires +emailVerificationSentAt"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This verification link is invalid or has expired.",
      });
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationSentAt = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Your email has been verified successfully.",
      data: {
        _id: user._id,
        email: user.email,
        emailVerified: true,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to verify email address.",
    });
  }
};

const resendVerification = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!isValidEmail(normalizedEmail)) {
      return res.status(200).json(GENERIC_RESEND_RESPONSE);
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+emailVerificationTokenHash +emailVerificationExpires +emailVerificationSentAt"
    );

    if (!user || isEmailVerified(user)) {
      return res.status(200).json(GENERIC_RESEND_RESPONSE);
    }

    const lastSentAt = user.emailVerificationSentAt
      ? new Date(user.emailVerificationSentAt).getTime()
      : 0;

    if (lastSentAt && Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
      return res.status(200).json(GENERIC_RESEND_RESPONSE);
    }

    const emailResult = await sendVerificationEmailToUser(user);

    if (!emailResult.success) {
      console.warn(
        "Verification email resend was requested, but the email could not be sent."
      );
    }

    return res.status(200).json({
      success: true,
      message: GENERIC_RESEND_MESSAGE,
    });
  } catch (error) {
    return res.status(200).json(GENERIC_RESEND_RESPONSE);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  verifyEmail,
  resendVerification,
};
