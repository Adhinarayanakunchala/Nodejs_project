// src/models/Comment.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Comments are stored as a SEPARATE collection (not embedded in Task)
//   because a task could have hundreds of comments — embedding them would
//   make the Task document very large and slow to load.
//   This is the "referencing" pattern vs the "embedding" pattern.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
    },
    // Which task this comment belongs to
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    // Who wrote this comment
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Comment", commentSchema);
