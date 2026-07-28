const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const resendVerificationRequestLog = new Map();

const GENERIC_RESEND_RESPONSE = {
  success: true,
  message:
    "If an unverified account exists for that email, a new verification message has been sent.",
};

const resendVerificationRateLimit = (req, res, next) => {
  const requestIp =
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown";
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const existingTimestamps = resendVerificationRequestLog.get(requestIp) || [];
  const recentTimestamps = existingTimestamps.filter(
    (timestamp) => timestamp > windowStart
  );

  if (recentTimestamps.length >= MAX_REQUESTS) {
    return res.status(200).json(GENERIC_RESEND_RESPONSE);
  }

  recentTimestamps.push(now);
  resendVerificationRequestLog.set(requestIp, recentTimestamps);

  next();
};

module.exports = {
  resendVerificationRateLimit,
  GENERIC_RESEND_RESPONSE,
};
