const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
} = require("../controllers/complaintController");

const router = express.Router();

router.post("/", protect, createComplaint);
router.get("/", protect, getComplaints);
router.get("/:id", protect, getComplaintById);
router.put("/:id", protect, authorizeRoles("admin"), updateComplaint);
router.delete("/:id", protect, authorizeRoles("admin"), deleteComplaint);

module.exports = router;
