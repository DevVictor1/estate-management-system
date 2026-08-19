const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { paymentEvidenceUpload } = require("../middleware/paymentEvidenceUpload");

const {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  updatePaymentStatus,
  confirmProviderReceipt,
  reportProviderReceiptIssue,
  uploadPaymentEvidence,
  deletePaymentEvidence,
  deletePayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createPayment);
router.get("/", protect, getPayments);
router.post(
  "/:id/evidence",
  protect,
  authorizeRoles("admin"),
  paymentEvidenceUpload,
  uploadPaymentEvidence
);
router.delete(
  "/:id/evidence",
  protect,
  authorizeRoles("admin"),
  deletePaymentEvidence
);
router.get("/:id", protect, getPaymentById);
router.patch("/:id/status", protect, authorizeRoles("admin"), updatePaymentStatus);
router.patch(
  "/:id/confirm-receipt",
  protect,
  authorizeRoles("service_provider"),
  confirmProviderReceipt
);
router.patch(
  "/:id/report-receipt-issue",
  protect,
  authorizeRoles("service_provider"),
  reportProviderReceiptIssue
);
router.put("/:id", protect, authorizeRoles("admin"), updatePayment);
router.delete("/:id", protect, authorizeRoles("admin"), deletePayment);

module.exports = router;
