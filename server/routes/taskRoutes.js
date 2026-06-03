const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createTask);
router.get("/", protect, getTasks);
router.get("/:id", protect, getTaskById);
router.put("/:id", protect, authorizeRoles("admin"), updateTask);
router.delete("/:id", protect, authorizeRoles("admin"), deleteTask);

module.exports = router;
