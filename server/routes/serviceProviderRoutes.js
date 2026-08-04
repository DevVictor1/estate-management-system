const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  createServiceProvider,
  getServiceProviders,
  getServiceProviderById,
  updateServiceProvider,
  getMyPaymentDetails,
  updateMyPaymentDetails,
  deleteServiceProvider,
} = require("../controllers/serviceProviderController");

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createServiceProvider);
router.get("/", protect, getServiceProviders);
router.get(
  "/me/payment-details",
  protect,
  authorizeRoles("service_provider"),
  getMyPaymentDetails
);
router.patch(
  "/me/payment-details",
  protect,
  authorizeRoles("service_provider"),
  updateMyPaymentDetails
);
router.get("/:id", protect, getServiceProviderById);
router.put("/:id", protect, authorizeRoles("admin"), updateServiceProvider);
router.delete("/:id", protect, authorizeRoles("admin"), deleteServiceProvider);

module.exports = router;
