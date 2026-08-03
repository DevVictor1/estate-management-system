const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createQuotation,
  getQuotations,
  getQuotationById,
  reviewQuotation,
  createContractFromQuotation,
} = require("../controllers/quotationController");

const router = express.Router();

router.post("/", protect, authorizeRoles("service_provider"), createQuotation);
router.get("/", protect, authorizeRoles("admin", "service_provider"), getQuotations);
router.get("/:id", protect, authorizeRoles("admin", "service_provider"), getQuotationById);
router.patch(
  "/:id/review",
  protect,
  authorizeRoles("admin"),
  reviewQuotation
);
router.post(
  "/:id/create-contract",
  protect,
  authorizeRoles("admin"),
  createContractFromQuotation
);

module.exports = router;
