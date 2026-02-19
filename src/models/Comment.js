// src/models/Comment.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Comments are stored as a SEPARATE collection (not embedded in Task)
//   because a task could have hundreds of comments — embedding them would
//   make the Task document very large and slow to load.
//   This is the "referencing" pattern vs the "embedding" pattern.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const { getNextSequence } = require("./Counter");

const commentSchema = new mongoose.Schema(
  {
    commentId: {
      type: Number,
      unique: true, // No two comments share the same commentId
      immutable: true, // Once assigned, cannot be changed
    },
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

// ── Pre-save Hook: Auto-increment commentId ───────────────────────────────────
commentSchema.pre("save", async function () {
  if (this.isNew) {
    this.commentId = await getNextSequence("commentId"); // → 1, 2, 3 ...
  }
});

module.exports = mongoose.model("Comment", commentSchema);
