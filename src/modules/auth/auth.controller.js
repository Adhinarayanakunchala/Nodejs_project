// src/modules/auth/auth.controller.js
// Handles HTTP request/response. Validation is done inline before calling service.
const authService = require("./auth.service");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // ── Manual Validation ─────────────────────────────────────────────────────
    // Simple checks — easy to understand and works with any Express version
    const errors = [];
    if (!name || name.trim() === "") errors.push("Name is required");
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      errors.push("Valid email is required");
    if (!password || password.length < 6)
      errors.push("Password must be at least 6 characters");
    if (role && !["admin", "manager", "employee"].includes(role))
      errors.push("Invalid role");

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const result = await authService.register({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role,
    });
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── Manual Validation ─────────────────────────────────────────────────────
    const errors = [];
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      errors.push("Valid email is required");
    if (!password) errors.push("Password is required");

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const result = await authService.login({
      email: email.toLowerCase(),
      password,
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private (requires JWT token)
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe };
