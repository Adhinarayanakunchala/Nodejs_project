// src/modules/comments/comments.controller.js
const commentsService = require("./comments.service");

const addComment = async (req, res, next) => {
  try {
    const comment = await commentsService.addComment(
      req.params.taskId,
      req.body.content,
      req.user._id,
    );
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  try {
    const comments = await commentsService.getComments(req.params.taskId);
    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const result = await commentsService.deleteComment(
      req.params.id,
      req.user._id,
      req.user.role,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = { addComment, getComments, deleteComment };
