const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  resendVerificationRateLimit,
} = require("../middleware/resendVerificationRateLimit");
const {
  forgotPasswordRateLimit,
} = require("../middleware/forgotPasswordRateLimit");

const {
  registerUser,
  loginUser,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPasswordRateLimit, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmail);
router.post(
  "/resend-verification",
  resendVerificationRateLimit,
  resendVerification
);
router.get("/me", protect, getMe);

module.exports = router;
