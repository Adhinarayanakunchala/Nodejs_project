// src/modules/auth/auth.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Routes:
//   POST /api/auth/register  → create account, returns JWT token
//   POST /api/auth/login     → login, returns JWT token
//   GET  /api/auth/me        → get current user (protected)
//
// NOTE: We use simple manual validation instead of express-validator
// to avoid Express 5 compatibility issues. This is cleaner and easier to understand.
//
// RATE LIMITING:
//   authLimiter is applied BEFORE register and login to prevent brute-force attacks.
//   Limit: 10 requests per 15 minutes per IP on these two routes.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const { register, login, getMe } = require("./auth.controller");
const { protect } = require("../../middleware/auth");
const { authLimiter } = require("../../middleware/rateLimiter");

const router = express.Router();

// ── Routes ────────────────────────────────────────────────────────────────────
// authLimiter runs first — rejects the request with 429 if IP has exceeded 10 attempts
// This protects login/register from credential stuffing and brute-force attacks
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);

module.exports = router;
