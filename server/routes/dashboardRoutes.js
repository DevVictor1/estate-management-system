const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  getDashboardStats,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/stats", protect, authorizeRoles("admin"), getDashboardStats);

module.exports = router;
