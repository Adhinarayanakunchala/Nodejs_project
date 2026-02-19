// src/middleware/auth.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   This is a "middleware" — a function that runs BETWEEN the request arriving
//   and the route handler executing. It checks if the user has a valid JWT token.
//
//   Flow: Request → auth middleware → (if valid) → route handler
//                                  → (if invalid) → 401 Unauthorized response
//
//   HOW JWT WORKS:
//   1. User logs in → server creates a token: jwt.sign({ userId }, secret)
//   2. Client stores the token and sends it in every request header:
//      Authorization: Bearer <token>
//   3. Server verifies the token: jwt.verify(token, secret)
//   4. If valid, we know WHO is making the request
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

const protect = async (req, res, next) => {
  try {
    let token;

    // Check if Authorization header exists and starts with 'Bearer'
    // Header format: "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Split "Bearer <token>" and take the second part (the actual token)
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      logger.warn(
        `Auth failed — no token provided | ${req.method} ${req.originalUrl}`,
      );
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    // jwt.verify() decodes the token and verifies it wasn't tampered with
    // If the token is expired or invalid, it throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded.id is the userId we stored when creating the token
    // We fetch the user from DB to make sure they still exist and are active
    // select('-password') excludes the password field from the result
    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      logger.warn(
        `Auth failed — user not found or deactivated | userId: ${decoded.id} | ${req.method} ${req.originalUrl}`,
      );
      return res.status(401).json({
        success: false,
        message: "User not found or account deactivated.",
      });
    }

    // Attach the user to req so route handlers can access it via req.user
    req.user = user;

    // Call next() to pass control to the next middleware or route handler
    next();
  } catch (error) {
    logger.warn(
      `Auth failed — invalid/expired token | ${req.method} ${req.originalUrl} | ${error.message}`,
    );
    return res.status(401).json({
      success: false,
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

module.exports = { protect };
