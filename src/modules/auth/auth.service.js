// src/modules/auth/auth.service.js
// ─────────────────────────────────────────────────────────────────────────────
// HOW JWT WORKS (Standard Single Token):
//
//   1. User logs in → server creates ONE token: jwt.sign({ id }, secret, { expiresIn: '7d' })
//   2. Client stores the token (localStorage or memory)
//   3. Every request sends: Authorization: Bearer <token>
//   4. Server verifies: jwt.verify(token, secret)
//   5. After 7 days → token expires → user must login again
//
//   Simple, secure, and works great for most apps.
//   The token expiry can be set to anything: '7d', '15d', '30d'
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const User = require("../../models/User");

// ── Generate JWT Token ────────────────────────────────────────────────────────
// jwt.sign() creates a signed token with:
//   payload  → { id: userId } — data we embed in the token
//   secret   → JWT_SECRET from .env — used to sign & verify (keep this private!)
//   options  → { expiresIn } — how long before the token stops working
//
// The token is a 3-part string: header.payload.signature
// Anyone can READ the payload (it's base64 encoded, not encrypted)
// But only the server can VERIFY it (because only we know the secret)
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ── Register ──────────────────────────────────────────────────────────────────
const register = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 400;
    throw error;
  }

  // Password gets hashed automatically by the pre-save hook in User.js
  const user = await User.create({ name, email, password, role });

  const token = generateToken(user._id);

  return {
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// ── Login ─────────────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  // select('+password') overrides the select:false on the password field
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // Use the instance method from User.js to compare hashed passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("Account has been deactivated");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id);

  return {
    token,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

// ── Get Me ────────────────────────────────────────────────────────────────────
const getMe = async (userId) => {
  return User.findById(userId).select("-password");
};

module.exports = { register, login, getMe };
