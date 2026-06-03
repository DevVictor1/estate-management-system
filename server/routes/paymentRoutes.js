const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createPayment);
router.get("/", protect, getPayments);
router.get("/:id", protect, getPaymentById);
router.put("/:id", protect, authorizeRoles("admin"), updatePayment);
router.delete("/:id", protect, authorizeRoles("admin"), deletePayment);

module.exports = router;
