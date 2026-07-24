const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateOwnTaskStatus,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createTask);
router.get("/", protect, getTasks);
router.get("/:id", protect, getTaskById);
router.patch(
  "/:id/status",
  protect,
  authorizeRoles("service_provider"),
  updateOwnTaskStatus
);
router.put("/:id", protect, authorizeRoles("admin"), updateTask);
router.delete("/:id", protect, authorizeRoles("admin"), deleteTask);

module.exports = router;
