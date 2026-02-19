// src/modules/tasks/tasks.service.js
// ─────────────────────────────────────────────────────────────────────────────
// KEY CONCEPT: Real-time integration
//   When a task status changes, we use getIO() to emit a Socket.IO event.
//   This notifies ALL clients in the project room instantly — without them
//   needing to refresh or poll the API.
// ─────────────────────────────────────────────────────────────────────────────

const Task = require("../../models/Task");
const Notification = require("../../models/Notification");
const { getIO } = require("../../config/socket");

// Create a task
const createTask = async (data, userId) => {
  const task = await Task.create({ ...data, createdBy: userId });
  return task.populate([
    { path: "project", select: "title" },
    { path: "createdBy", select: "name email" },
    { path: "assignedTo", select: "name email" },
  ]);
};

// Get tasks with filters
const getTasks = async (userId, userRole, query = {}) => {
  const { project, status, priority, assignedTo, page = 1, limit = 10 } = query;
  const filter = {};

  if (project) filter.project = project;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  // Employees only see tasks assigned to them
  if (userRole === "employee") {
    filter.assignedTo = userId;
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  const skip = (page - 1) * limit;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate("project", "title status")
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  };
};

// Get single task
const getTaskById = async (id) => {
  const task = await Task.findById(id)
    .populate("project", "title status")
    .populate("assignedTo", "name email avatar role")
    .populate("createdBy", "name email");

  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }
  return task;
};

// Update task status — TRIGGERS REAL-TIME EVENT ⚡
const updateTaskStatus = async (taskId, newStatus, updatedBy) => {
  const task = await Task.findByIdAndUpdate(
    taskId,
    { status: newStatus },
    { new: true, runValidators: true },
  )
    .populate("project", "title _id")
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");

  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // ── REAL-TIME: Emit to all clients in this project's room ─────────────────
  // getIO() gets our Socket.IO instance from config/socket.js
  // .to(`project:${id}`) targets only users who joined that room
  // .emit('task:updated', data) sends the event with the updated task data
  try {
    const io = getIO();
    io.to(`project:${task.project._id}`).emit("task:updated", {
      taskId: task._id,
      status: task.status,
      updatedBy: updatedBy.name,
      task,
    });
  } catch (e) {
    // Don't fail the request if socket emit fails
    console.warn("Socket emit failed:", e.message);
  }

  return task;
};

// Assign task to a user — TRIGGERS NOTIFICATION ⚡
const assignTask = async (taskId, assigneeId, assignedBy) => {
  const task = await Task.findByIdAndUpdate(
    taskId,
    { assignedTo: assigneeId },
    { new: true },
  )
    .populate("project", "title _id")
    .populate("assignedTo", "name email");

  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // Create a notification in DB for the assignee
  const notification = await Notification.create({
    message: `You have been assigned to task: "${task.title}"`,
    type: "task_assigned",
    recipient: assigneeId,
    relatedTask: taskId,
    relatedProject: task.project._id,
  });

  // Emit real-time notification to the specific user (by their userId room)
  try {
    const io = getIO();
    // We use the user's ID as a personal room for direct notifications
    io.to(`user:${assigneeId}`).emit("notification:new", notification);
  } catch (e) {
    console.warn("Socket emit failed:", e.message);
  }

  return task;
};

// Update full task
const updateTask = async (id, data) => {
  const task = await Task.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate("assignedTo", "name email");

  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }
  return task;
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  assignTask,
  updateTask,
};
