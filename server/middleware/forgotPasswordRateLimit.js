const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const forgotPasswordRequestLog = new Map();

const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  success: true,
  message:
    "If an account exists for that email, a password reset link has been sent.",
};

const forgotPasswordRateLimit = (req, res, next) => {
  const requestIp =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown";
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const existingTimestamps = forgotPasswordRequestLog.get(requestIp) || [];
  const recentTimestamps = existingTimestamps.filter(
    (timestamp) => timestamp > windowStart
  );

  if (recentTimestamps.length >= MAX_REQUESTS) {
    return res.status(200).json(GENERIC_FORGOT_PASSWORD_RESPONSE);
  }

  recentTimestamps.push(now);
  forgotPasswordRequestLog.set(requestIp, recentTimestamps);

  next();
};

module.exports = {
  forgotPasswordRateLimit,
  GENERIC_FORGOT_PASSWORD_RESPONSE,
};
