// src/app.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   We separate the Express "app" from the HTTP "server" (in server.js).
//   This makes it easy to test the app without starting a real server.
//   app.js = all middleware + routes wired together
//   server.js = starts listening on a port + attaches Socket.IO
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const logger = require("./utils/logger");
const { globalLimiter } = require("./middleware/rateLimiter");

const app = express();

// ── Security Middleware ───────────────────────────────────────────────────────
// helmet() sets secure HTTP headers automatically (prevents common attacks)
app.use(helmet());

// cors() allows our frontend (on a different port/domain) to call this API
app.use(cors());

// ── Global Rate Limiter ───────────────────────────────────────────────────────
// Applied FIRST before any route — limits 100 req/15min per IP across all endpoints
// Prevents API abuse, DDoS scraping, and credential stuffing
app.use(globalLimiter);

// ── Logging Middleware ────────────────────────────────────────────────────────
// morgan('dev') logs every HTTP request in the terminal: method, path, status, time
// Example: GET /api/tasks 200 12.345 ms
app.use(morgan("dev"));

// ── Body Parsing Middleware ───────────────────────────────────────────────────
// express.json() lets us read JSON from request bodies (req.body)
// Without this, req.body would always be undefined
app.use(express.json());

// express.urlencoded() lets us read form-encoded data (HTML forms)
app.use(express.urlencoded({ extended: true }));

// ── Static Files ──────────────────────────────────────────────────────────────
// Serve uploaded files publicly at /uploads/filename
// e.g., http://localhost:5000/uploads/myfile.pdf
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Routes ────────────────────────────────────────────────────────────────────
// Each module has its own router — we mount them here with a base path
app.use("/api/auth", require("./modules/auth/auth.routes"));
app.use("/api/users", require("./modules/users/users.routes"));
app.use("/api/projects", require("./modules/projects/projects.routes"));
app.use("/api/tasks", require("./modules/tasks/tasks.routes"));
app.use("/api/comments", require("./modules/comments/comments.routes"));
app.use("/api/dashboard", require("./modules/dashboard/dashboard.routes"));

// ── Health Check ──────────────────────────────────────────────────────────────
// Simple endpoint to verify the server is running
app.get("/", (req, res) => {
  res.json({ message: "🚀 Work Management API is running!", status: "OK" });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
// If no route matched, send a 404 response
app.use((req, res) => {
  logger.warn(`404 Not Found — ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// Express calls this middleware when next(error) is called anywhere in the app.
// The 4-parameter signature (err, req, res, next) is REQUIRED for Express to
// recognise it as an error handler — do NOT remove 'next' even if unused.
//
// What we log for every error:
//   [ERROR] POST /api/auth/login → 500
//   Full stack trace (collapsed in production)
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Log the full error context so issues are easy to trace in the terminal
  logger.error(
    `${req.method} ${req.originalUrl} → ${statusCode} | ${err.message}`,
    err,
  );

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only expose stack trace in development — never in production
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
