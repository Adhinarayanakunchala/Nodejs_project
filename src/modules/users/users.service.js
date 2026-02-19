// src/modules/users/users.service.js
const User = require("../../models/User");

// Get all users — Admin only
const getAllUsers = async (query = {}) => {
  const { role, search, page = 1, limit = 10 } = query;

  // Build a dynamic filter object
  const filter = { isActive: true };
  if (role) filter.role = role;
  if (search) {
    // $regex allows partial matching, $options: 'i' makes it case-insensitive
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Pagination: skip = (page - 1) * limit
  // e.g., page 2, limit 10 → skip 10 documents
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  };
};

// Get single user by ID
const getUserById = async (id) => {
  const user = await User.findById(id).select("-password");
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

// Update user
const updateUser = async (id, updateData) => {
  // { new: true } returns the updated document (not the old one)
  // runValidators: true runs schema validators on update
  const user = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

// Soft delete — we don't actually delete, just set isActive: false
// This preserves data integrity (tasks still reference this user)
const deleteUser = async (id) => {
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true },
  );
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return { message: "User deactivated successfully" };
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser };
