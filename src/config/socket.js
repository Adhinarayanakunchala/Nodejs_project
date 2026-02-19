// src/config/socket.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Socket.IO needs access to the HTTP server (not just Express app).
//   We initialize it here and export a helper to get the io instance
//   from anywhere in the app without passing it around manually.
//
// FEATURES IN THIS FILE:
//   1. JWT Token Authentication  — only authenticated users can connect
//   2. Online Users Tracking     — real-time list of who is online
//   3. Heartbeat (30s ping/pong) — detects stale/zombie connections
//   4. Typing Events             — real-world chat "user is typing..." indicators
//   5. Room Management           — join/leave project and personal rooms
//   6. Error Handling            — socket-level errors are caught and logged
//   7. Structured Logging        — every event is logged via logger utility
// ─────────────────────────────────────────────────────────────────────────────

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

let io; // Will hold our Socket.IO instance after initSocket() is called

// ── Online Users Registry ─────────────────────────────────────────────────────
// Maps socketId → { userId, name }
// Used to broadcast the full list of online users to all clients.
// A Map is used instead of a plain object so we get O(1) add/delete.
const onlineUsers = new Map();

// ── Helper: Broadcast current online users to everyone ───────────────────────
// Called on every connect and disconnect so all clients stay in sync.
const broadcastOnlineUsers = () => {
  // Convert the Map to an array of { userId, name } objects
  const userList = Array.from(onlineUsers.values());
  io.emit("onlineUsers", userList);
  logger.socket(`📋 Online users broadcast — ${userList.length} connected`);
};

// ── initSocket ────────────────────────────────────────────────────────────────
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all origins in development
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000, // Wait 60s before declaring a connection dead
    pingInterval: 25000, // Socket.IO built-in ping every 25s (separate from our heartbeat)
  });

  // ── Socket.IO Authentication Middleware ────────────────────────────────────
  // io.use() runs BEFORE the connection event.
  // If this middleware calls next(new Error(...)), the socket is rejected.
  // The client must pass: { auth: { token: "Bearer <jwt>" } } in handshake options.
  io.use((socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token;

      // Token must be provided
      if (!authHeader) {
        logger.socket(
          `🚫 Socket rejected (no token) — handshake from ${socket.handshake.address}`,
        );
        return next(
          new Error("Authentication token required. Please login first."),
        );
      }

      // Accept "Bearer <token>" or raw "<token>"
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

      // Verify token with the same secret used to sign it
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach decoded user payload to socket for use in event handlers
      socket.user = decoded; // { id, name, role, iat, exp }

      logger.socket(
        `✅ Socket authenticated — userId: ${decoded.id} | socketId: ${socket.id}`,
      );
      next(); // Allow the connection
    } catch (error) {
      logger.socket(
        `🚫 Socket rejected (invalid/expired token) — ${error.message}`,
      );
      next(new Error("Invalid or expired token. Please login again."));
    }
  });

  // ── Connection Handler ──────────────────────────────────────────────────────
  // At this point the socket is authenticated (io.use() passed).
  // socket.user is guaranteed to be present.
  io.on("connection", (socket) => {
    const { id: userId, name: userName } = socket.user;

    logger.socket(
      `⚡ Connected — userId: ${userId} | name: ${userName} | socketId: ${socket.id}`,
    );

    // Register this socket in the online users map
    onlineUsers.set(socket.id, { userId, name: userName });
    broadcastOnlineUsers();

    // ── Heartbeat (every 30 seconds) ─────────────────────────────────────────
    // WHY: Browser tabs can freeze, networks can drop silently.
    // A heartbeat lets us detect and clean up zombie connections.
    //
    // Flow:
    //   Server emits 'ping' every 30 seconds →
    //   Client should emit 'pong' back →
    //   If the client doesn't respond, the underlying Socket.IO pingTimeout
    //   will eventually disconnect it automatically.
    const heartbeatInterval = setInterval(() => {
      socket.emit("ping", { timestamp: Date.now() });
      logger.socket(
        `💓 Heartbeat ping → userId: ${userId} | socketId: ${socket.id}`,
      );
    }, 30000); // 30,000 ms = 30 seconds

    // Client acknowledges the heartbeat
    socket.on("pong", (data) => {
      logger.socket(
        `💓 Heartbeat pong ← userId: ${userId} | latency: ${Date.now() - (data?.timestamp || Date.now())}ms`,
      );
    });

    // ── Room Management: Projects ─────────────────────────────────────────────
    // 'joinProject' — client sends this to subscribe to a project's real-time updates
    // Everyone in the same project room receives task create/update/delete events
    socket.on("joinProject", (projectId) => {
      const room = `project:${projectId}`;
      socket.join(room);
      logger.socket(`📌 Join room — userId: ${userId} → ${room}`);
    });

    // 'leaveProject' — client sends this when navigating away from the project view
    socket.on("leaveProject", (projectId) => {
      const room = `project:${projectId}`;
      socket.leave(room);
      logger.socket(`📤 Leave room — userId: ${userId} → ${room}`);
    });

    // ── Room Management: Personal Notifications ───────────────────────────────
    // 'joinUser' — client joins their own personal room for direct notifications
    // e.g., "You were assigned a task" is emitted to user:{userId} only
    socket.on("joinUser", (targetUserId) => {
      const room = `user:${targetUserId}`;
      socket.join(room);
      logger.socket(`👤 Join personal room — userId: ${userId} → ${room}`);
    });

    // 'leaveUser' — call this on logout to stop receiving personal notifications
    socket.on("leaveUser", (targetUserId) => {
      const room = `user:${targetUserId}`;
      socket.leave(room);
      logger.socket(`👤 Leave personal room — userId: ${userId} → ${room}`);
    });

    // ── Typing Events ─────────────────────────────────────────────────────────
    // WHY: Real-world chat apps (Slack, WhatsApp, Teams) show "User is typing..."
    // The client emits 'startTyping' with a roomId when the user starts typing.
    // We broadcast to everyone in that room EXCEPT the sender (broadcastOperator).
    //
    // Client sends:   { roomId: "project:abc123" }
    // Others receive: { userId, name, roomId }
    socket.on("startTyping", ({ roomId }) => {
      logger.socket(
        `✏️  Typing started — userId: ${userId} in room: ${roomId}`,
      );
      socket.to(roomId).emit("userTyping", {
        userId,
        name: userName,
        roomId,
      });
    });

    // Client sends this when they stop typing (debounced on the frontend usually)
    socket.on("stopTyping", ({ roomId }) => {
      logger.socket(
        `✏️  Typing stopped — userId: ${userId} in room: ${roomId}`,
      );
      socket.to(roomId).emit("userStoppedTyping", {
        userId,
        roomId,
      });
    });

    // ── Socket-Level Error Handler ────────────────────────────────────────────
    // Catches any unhandled errors emitted on this specific socket connection.
    // Without this, socket errors can silently crash the event loop.
    socket.on("error", (err) => {
      logger.error(
        `Socket error — userId: ${userId} | socketId: ${socket.id} | ${err.message}`,
        err,
      );
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    // Fires when the client closes the browser, navigates away, or loses connection.
    socket.on("disconnect", (reason) => {
      // Stop the heartbeat interval for this socket to prevent memory leaks
      clearInterval(heartbeatInterval);

      // Remove from online registry
      onlineUsers.delete(socket.id);

      logger.socket(
        `🔌 Disconnected — userId: ${userId} | socketId: ${socket.id} | reason: ${reason}`,
      );

      // Notify remaining clients that this user went offline
      broadcastOnlineUsers();
    });
  });

  return io;
};

// ── getIO ─────────────────────────────────────────────────────────────────────
// Lets other files (like task controller) emit events to rooms
// without needing to import the HTTP server.
// Throws clearly if called before initSocket() so the bug is immediately visible.
const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized yet! Call initSocket(httpServer) first.",
    );
  }
  return io;
};

module.exports = { initSocket, getIO };
