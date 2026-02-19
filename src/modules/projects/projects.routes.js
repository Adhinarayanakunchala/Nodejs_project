// src/modules/projects/projects.routes.js
const express = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addMember,
  removeMember,
} = require("./projects.controller");
const { protect } = require("../../middleware/auth");
const { authorize } = require("../../middleware/role");

const router = express.Router();

// All project routes require authentication
router.use(protect);

router.get("/", getProjects);
router.post("/", authorize("admin", "manager"), createProject);
router.get("/:id", getProjectById);
router.put("/:id", authorize("admin", "manager"), updateProject);
router.post("/:id/members", authorize("admin", "manager"), addMember);
router.delete("/:id/members", authorize("admin", "manager"), removeMember);

module.exports = router;
