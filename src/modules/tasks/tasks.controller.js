// src/modules/tasks/tasks.controller.js
const tasksService = require("./tasks.service");

const createTask = async (req, res, next) => {
  try {
    const task = await tasksService.createTask(req.body, req.user._id);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const getTasks = async (req, res, next) => {
  try {
    const result = await tasksService.getTasks(
      req.user._id,
      req.user.role,
      req.query,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  try {
    const task = await tasksService.getTaskById(req.params.id);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const task = await tasksService.updateTaskStatus(
      req.params.id,
      req.body.status,
      req.user,
    );
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const assignTask = async (req, res, next) => {
  try {
    const task = await tasksService.assignTask(
      req.params.id,
      req.body.userId,
      req.user,
    );
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await tasksService.updateTask(req.params.id, req.body);
    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  assignTask,
  updateTask,
};
