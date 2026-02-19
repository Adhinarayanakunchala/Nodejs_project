// server.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   This is the ENTRY POINT of our application.
//   It does 3 things in order:
//     1. Load environment variables from .env
//     2. Connect to MongoDB
//     3. Start the HTTP server + attach Socket.IO
//
//   We keep this separate from app.js so our Express app stays testable
//   without needing a real running server.
// ─────────────────────────────────────────────────────────────────────────────

// Step 1: Load .env variables FIRST — before anything else
// This makes process.env.MONGO_URI, process.env.PORT etc. available
require("dotenv").config();

const http = require("http"); // Node's built-in HTTP module
const app = require("./src/app"); // Our Express app
const connectDB = require("./src/config/db");
const { initSocket } = require("./src/config/socket");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5000;

// Step 2: Connect to MongoDB
// We use an async IIFE (Immediately Invoked Function Expression) to use await at top level
(async () => {
  try {
    await connectDB();

    // Step 3: Create HTTP server from Express app
    // We need a raw HTTP server (not just app.listen) because Socket.IO
    // needs to attach to the same HTTP server
    const server = http.createServer(app);

    // Step 4: Attach Socket.IO to the HTTP server
    initSocket(server);

    // Step 5: Start listening for requests
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📡 Socket.IO ready for real-time connections`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
      logger.info(
        `🛡️  Rate limiting: 100 req/15min (global) | 10 req/15min (auth)`,
      );
    });

    // Handle unexpected process-level errors — prevents silent server crashes
    process.on("unhandledRejection", (reason, promise) => {
      logger.error(`Unhandled Promise Rejection at: ${promise}`, reason);
    });

    process.on("uncaughtException", (err) => {
      logger.error(`Uncaught Exception — shutting down gracefully`, err);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
})();
