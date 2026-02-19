// src/utils/logger.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   A single, consistent logger for the entire app.
//   Using console.log() everywhere makes it hard to filter or grep logs.
//   This logger prefixes every message with:
//     - A timestamp  → tells you WHEN something happened
//     - A level tag  → tells you HOW SERIOUS it is
//   Color codes make different levels instantly visible in the terminal.
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

// Returns the current time as a readable string, e.g. "2026-02-19 10:34:05"
const timestamp = () => {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
};

// Format: [2026-02-19 10:34:05] [LEVEL] message
const format = (level, color, message) => {
  return `${COLORS.dim}[${timestamp()}]${COLORS.reset} ${color}[${level}]${COLORS.reset} ${message}`;
};

const logger = {
  // General informational messages (server started, DB connected, etc.)
  info: (message) => {
    console.log(format("INFO", COLORS.green, message));
  },

  // Non-fatal warnings (bad input, deprecated usage, suspicious activity)
  warn: (message) => {
    console.warn(format("WARN", COLORS.yellow, message));
  },

  // Errors — something failed, needs attention
  // Accepts an optional Error object to print the stack trace
  error: (message, err = null) => {
    console.error(format("ERROR", COLORS.red, message));
    if (err && err.stack) {
      console.error(`${COLORS.dim}${err.stack}${COLORS.reset}`);
    }
  },

  // Socket.IO specific events (connect, disconnect, join room, etc.)
  socket: (message) => {
    console.log(format("SOCKET", COLORS.cyan, message));
  },

  // Rate limit violations — client hit the request cap
  rateLimit: (message) => {
    console.warn(format("RATE-LIMIT", COLORS.magenta, message));
  },

  // HTTP request details — method, path, status code
  http: (message) => {
    console.log(format("HTTP", COLORS.blue, message));
  },
};

module.exports = logger;
