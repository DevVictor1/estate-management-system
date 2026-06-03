const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
} = require("../controllers/contractController");

const router = express.Router();

router.post("/", protect, authorizeRoles("admin"), createContract);
router.get("/", protect, getContracts);
router.get("/:id", protect, getContractById);
router.put("/:id", protect, authorizeRoles("admin"), updateContract);
router.delete("/:id", protect, authorizeRoles("admin"), deleteContract);

module.exports = router;
