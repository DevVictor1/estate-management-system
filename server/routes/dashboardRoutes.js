const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  getDashboardStats,
  getDashboardAnalytics,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/stats", protect, authorizeRoles("admin"), getDashboardStats);
router.get(
  "/analytics",
  protect,
  authorizeRoles("admin", "resident", "service_provider"),
  getDashboardAnalytics
);

module.exports = router;
