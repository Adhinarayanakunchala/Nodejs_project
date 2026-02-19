// src/modules/projects/projects.controller.js
const projectsService = require("./projects.service");

const createProject = async (req, res, next) => {
  try {
    const project = await projectsService.createProject(req.body, req.user._id);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const result = await projectsService.getProjects(
      req.user._id,
      req.user.role,
      req.query,
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectById(req.params.id);
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const project = await projectsService.updateProject(
      req.params.id,
      req.body,
    );
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

const addMember = async (req, res, next) => {
  try {
    const project = await projectsService.addMember(
      req.params.id,
      req.body.userId,
    );
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const project = await projectsService.removeMember(
      req.params.id,
      req.body.userId,
    );
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addMember,
  removeMember,
};
