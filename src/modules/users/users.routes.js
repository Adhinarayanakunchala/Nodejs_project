// src/modules/users/users.routes.js
const express = require("express");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("./users.controller");
const { protect } = require("../../middleware/auth");
const { authorize } = require("../../middleware/role");

const router = express.Router();

// All routes below require authentication (protect runs first)
// Then authorize checks if the role is allowed

router.get("/", protect, authorize("admin"), getAllUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;
