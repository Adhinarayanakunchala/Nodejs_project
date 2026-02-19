// src/models/Notification.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Notifications are stored in DB so users can see them even after reconnecting.
//   Socket.IO delivers them in real-time, but the DB is the source of truth.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["task_assigned", "task_updated", "comment_added", "project_added"],
      required: true,
    },
    // Who should receive this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional: link to the related task or project
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Index for fast lookup of unread notifications per user
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
