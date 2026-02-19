// src/modules/projects/projects.service.js
// ─────────────────────────────────────────────────────────────────────────────
// KEY CONCEPT: .populate()
//   When we store a user's ObjectId in project.createdBy, MongoDB only stores
//   the ID. .populate('createdBy') replaces that ID with the actual User document.
//   This is like a JOIN in SQL, but done at the application level.
// ─────────────────────────────────────────────────────────────────────────────

const Project = require("../../models/Project");

// Create a new project
const createProject = async (data, userId) => {
  // Add the logged-in user as creator and first member
  const project = await Project.create({
    ...data,
    createdBy: userId,
    members: [userId], // Creator is automatically a member
  });

  // Populate createdBy to return user info instead of just the ID
  return project.populate("createdBy", "name email role");
};

// Get all projects — filtered by role
const getProjects = async (userId, userRole, query = {}) => {
  const { status, page = 1, limit = 10 } = query;
  const filter = {};

  // Admins see all projects; others only see projects they're members of
  if (userRole !== "admin") {
    filter.members = userId; // MongoDB: find docs where members array contains userId
  }

  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("createdBy", "name email")
      .populate("members", "name email role")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Project.countDocuments(filter),
  ]);

  return {
    projects,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  };
};

// Get single project with full details
const getProjectById = async (id) => {
  const project = await Project.findById(id)
    .populate("createdBy", "name email role")
    .populate("members", "name email role avatar");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  return project;
};

// Update project
const updateProject = async (id, data) => {
  const project = await Project.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "name email");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  return project;
};

// Add a member to a project
const addMember = async (projectId, memberId) => {
  // $addToSet adds memberId to members array ONLY if it's not already there
  // (prevents duplicates — unlike $push which always adds)
  const project = await Project.findByIdAndUpdate(
    projectId,
    { $addToSet: { members: memberId } },
    { new: true },
  ).populate("members", "name email role");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  return project;
};

// Remove a member from a project
const removeMember = async (projectId, memberId) => {
  // $pull removes a value from an array
  const project = await Project.findByIdAndUpdate(
    projectId,
    { $pull: { members: memberId } },
    { new: true },
  ).populate("members", "name email role");

  if (!project) {
    const error = new Error("Project not found");
    error.statusCode = 404;
    throw error;
  }
  return project;
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addMember,
  removeMember,
};
