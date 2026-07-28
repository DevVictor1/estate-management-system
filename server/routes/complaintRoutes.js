const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { complaintUpload } = require("../middleware/complaintUpload");

const {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
} = require("../controllers/complaintController");

const router = express.Router();

router.post(
  "/",
  protect,
  authorizeRoles("admin", "resident"),
  complaintUpload,
  createComplaint
);
router.get("/", protect, authorizeRoles("admin", "resident"), getComplaints);
router.get("/:id", protect, authorizeRoles("admin", "resident"), getComplaintById);
router.put("/:id", protect, authorizeRoles("admin"), updateComplaint);
router.delete("/:id", protect, authorizeRoles("admin"), deleteComplaint);

module.exports = router;
