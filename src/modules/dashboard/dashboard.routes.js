// src/modules/dashboard/dashboard.routes.js
const express = require("express");
const { protect } = require("../../middleware/auth");
const { authorize } = require("../../middleware/role");
const Task = require("../../models/Task");
const Project = require("../../models/Project");
const User = require("../../models/User");
const Notification = require("../../models/Notification");

const router = express.Router();

// @desc    Get dashboard statistics
// @route   GET /api/dashboard
// @access  Private
router.get("/", protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // ── Build filters based on role ───────────────────────────────────────────
    const projectFilter = userRole === "admin" ? {} : { members: userId };
    const taskFilter = userRole === "employee" ? { assignedTo: userId } : {};

    // ── Run all queries in PARALLEL using Promise.all ─────────────────────────
    // Promise.all([p1, p2, p3]) runs all promises at the same time
    // and waits for ALL of them to finish — much faster than sequential awaits
    const [
      totalProjects,
      totalTasks,
      totalUsers,
      tasksByStatus,
      recentTasks,
      unreadNotifications,
    ] = await Promise.all([
      Project.countDocuments(projectFilter),
      Task.countDocuments(taskFilter),
      userRole === "admin" ? User.countDocuments({ isActive: true }) : null,

      // Aggregate: group tasks by status and count each group
      // This is MongoDB's aggregation pipeline — like GROUP BY in SQL
      Task.aggregate([
        { $match: taskFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Get 5 most recently updated tasks
      Task.find(taskFilter)
        .populate("assignedTo", "name")
        .populate("project", "title")
        .sort({ updatedAt: -1 })
        .limit(5),

      // Count unread notifications for this user
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    // Transform aggregation result into a cleaner object
    // e.g., [{ _id: 'todo', count: 5 }] → { todo: 5 }
    const statusCounts = tasksByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalProjects,
          totalTasks,
          totalUsers,
          unreadNotifications,
        },
        tasksByStatus: {
          todo: statusCounts.todo || 0,
          "in-progress": statusCounts["in-progress"] || 0,
          review: statusCounts.review || 0,
          done: statusCounts.done || 0,
        },
        recentTasks,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user notifications
// @route   GET /api/dashboard/notifications
router.get("/notifications", protect, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark notification as read
// @route   PATCH /api/dashboard/notifications/:id/read
router.patch("/notifications/:id/read", protect, async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res
      .status(200)
      .json({ success: true, message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
