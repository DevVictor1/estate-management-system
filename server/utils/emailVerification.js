const crypto = require("crypto");

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();

const isEmailVerified = (user) => user?.emailVerified !== false;

const getEmailVerificationExpiresMinutes = () => {
  const parsedValue = Number.parseInt(
    process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES,
    10
  );

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return 60;
};

const generateEmailVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresInMinutes = getEmailVerificationExpiresMinutes();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  return {
    rawToken,
    tokenHash,
    expiresAt,
    expiresInMinutes,
  };
};

const hashEmailVerificationToken = (token = "") =>
  crypto.createHash("sha256").update(String(token || "")).digest("hex");

const getEmailVerificationUrl = (rawToken) => {
  const clientUrl = String(process.env.CLIENT_URL || "").trim();

  if (!rawToken || !/^https?:\/\//i.test(clientUrl)) {
    return "";
  }

  return `${clientUrl.replace(/\/+$/, "")}/verify-email?token=${encodeURIComponent(
    rawToken
  )}`;
};

module.exports = {
  isValidEmail,
  normalizeEmail,
  isEmailVerified,
  getEmailVerificationExpiresMinutes,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  getEmailVerificationUrl,
};
