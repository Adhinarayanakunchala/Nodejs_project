// src/modules/comments/comments.service.js
const Comment = require("../../models/Comment");
const { getIO } = require("../../config/socket");
const Task = require("../../models/Task");

// Add a comment to a task
const addComment = async (taskId, content, authorId) => {
  const comment = await Comment.create({
    content,
    task: taskId,
    author: authorId,
  });

  // Populate author info for the response
  await comment.populate("author", "name email avatar");

  // Emit real-time event so all users viewing this task see the new comment
  try {
    const task = await Task.findById(taskId).select("project");
    if (task) {
      const io = getIO();
      io.to(`project:${task.project}`).emit("comment:new", {
        taskId,
        comment,
      });
    }
  } catch (e) {
    console.warn("Socket emit failed:", e.message);
  }

  return comment;
};

// Get all comments for a task
const getComments = async (taskId) => {
  const comments = await Comment.find({ task: taskId })
    .populate("author", "name email avatar role")
    .sort({ createdAt: 1 }); // Oldest first (like a chat)
  return comments;
};

// Delete a comment (only author or admin)
const deleteComment = async (commentId, userId, userRole) => {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const error = new Error("Comment not found");
    error.statusCode = 404;
    throw error;
  }

  // Only the author or admin can delete
  if (comment.author.toString() !== userId.toString() && userRole !== "admin") {
    const error = new Error("Not authorized to delete this comment");
    error.statusCode = 403;
    throw error;
  }

  await comment.deleteOne();
  return { message: "Comment deleted" };
};

module.exports = { addComment, getComments, deleteComment };
