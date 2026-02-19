// src/middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Without rate limiting, anyone can hammer our API with thousands of
//   requests per second — crashing the server or brute-forcing passwords.
//
//   We define TWO limiters:
//   1. globalLimiter   → Applied to ALL routes (general protection)
//   2. authLimiter     → Applied ONLY to /api/auth/login and /api/auth/register
//                        (stricter because brute-force attacks target login)
//
//   Both limiters use the client's IP address to track request counts.
//   When a client exceeds the limit, they get a 429 Too Many Requests response.
// ─────────────────────────────────────────────────────────────────────────────

const rateLimit = require("express-rate-limit");
const logger = require("../utils/logger");

// ── 1. Global Rate Limiter ────────────────────────────────────────────────────
// Applies to every route. Generous enough for normal users but blocks abuse.
// 100 requests per 15 minutes per IP.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 100, // Max 100 requests per windowMs per IP
  standardHeaders: true, // Send X-RateLimit-* headers in the response
  legacyHeaders: false, // Disable X-RateLimit-Limit (deprecated header)

  // Custom handler: runs when a client exceeds the limit
  // We log the violation and return a consistent JSON error response
  handler: (req, res) => {
    logger.rateLimit(
      `Global limit exceeded — IP: ${req.ip} | ${req.method} ${req.originalUrl}`,
    );
    res.status(429).json({
      success: false,
      message:
        "Too many requests. Please slow down and try again in 15 minutes.",
    });
  },
});

// ── 2. Auth Rate Limiter ──────────────────────────────────────────────────────
// Applied ONLY on login/register routes. Much stricter.
// 10 requests per 15 minutes per IP — stops password brute-force attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login/register attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res) => {
    logger.rateLimit(
      `Auth limit exceeded — IP: ${req.ip} | ${req.method} ${req.originalUrl} — Possible brute-force attempt`,
    );
    res.status(429).json({
      success: false,
      message:
        "Too many login/register attempts. Please wait 15 minutes before trying again.",
    });
  },
});

module.exports = { globalLimiter, authLimiter };
