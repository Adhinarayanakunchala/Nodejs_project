// src/models/Task.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Tasks are the core of our work management system.
//   Each task belongs to a project and can be assigned to a user.
//   Key concept: We store attachments as an EMBEDDED ARRAY of objects
//   (not a separate collection) because attachments only make sense
//   in the context of a task — this is called "embedding" in MongoDB.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const { getNextSequence } = require("./Counter");

const taskSchema = new mongoose.Schema(
  {
    taskId: {
      type: Number,
      unique: true, // No two tasks share the same taskId
      immutable: true, // Once assigned, cannot be changed
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    // Which project this task belongs to
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Task must belong to a project"],
    },
    // Who created this task
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who is assigned to work on this task (optional)
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    // Embedded array of attachment objects
    // We embed them here instead of a separate collection because
    // they're always accessed together with the task
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// ── Pre-save Hook: Auto-increment taskId ─────────────────────────────────────
taskSchema.pre("save", async function () {
  if (this.isNew) {
    this.taskId = await getNextSequence("taskId"); // → 1, 2, 3 ...
  }
});

// ── Index ─────────────────────────────────────────────────────────────────────
// Indexes speed up queries. We often query tasks by project and status,
// so we create a compound index on both fields.
// This is like creating an index in a book — faster lookups.
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("Task", taskSchema);
