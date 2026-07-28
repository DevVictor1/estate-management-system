const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  resendVerificationRateLimit,
} = require("../middleware/resendVerificationRateLimit");

const {
  registerUser,
  loginUser,
  getMe,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.post(
  "/resend-verification",
  resendVerificationRateLimit,
  resendVerification
);
router.get("/me", protect, getMe);

module.exports = router;
