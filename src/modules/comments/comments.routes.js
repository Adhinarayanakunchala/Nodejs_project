// src/modules/comments/comments.routes.js
const express = require("express");
const {
  addComment,
  getComments,
  deleteComment,
} = require("./comments.controller");
const { protect } = require("../../middleware/auth");

const router = express.Router();

router.use(protect);

// Note the :taskId param — comments are always accessed via a task
router.get("/task/:taskId", getComments);
router.post("/task/:taskId", addComment);
router.delete("/:id", deleteComment);

module.exports = router;
