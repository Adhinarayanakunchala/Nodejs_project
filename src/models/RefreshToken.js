// src/models/RefreshToken.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS MODEL EXISTS:
//   We store refresh tokens in MongoDB instead of just trusting the token itself.
//   This gives us REVOCATION POWER — if a user logs out or we suspect theft,
//   we delete the token from DB and it can never be used again, even if it
//   hasn't expired yet.
//
//   Without DB storage: once a refresh token is issued, it works until expiry.
//   With DB storage: we can invalidate it instantly by deleting the record.
//
//   This is called a "token whitelist" approach (only tokens IN the DB are valid).
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    // The actual refresh token string (a JWT)
    token: {
      type: String,
      required: true,
      unique: true,
    },
    // Which user this token belongs to
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // When this token expires — stored so we can clean up old tokens
    expiresAt: {
      type: Date,
      required: true,
    },
    // Track where the token was issued from (optional but useful for security)
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    // Whether this token has been used to get a new access token
    // (for "rotation" — each refresh token can only be used once)
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ── TTL Index ─────────────────────────────────────────────────────────────────
// MongoDB's TTL (Time To Live) index automatically DELETES documents
// when the expiresAt date is reached. No manual cleanup needed!
// expireAfterSeconds: 0 means "delete exactly at the expiresAt time"
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for fast lookup by user (e.g., "delete all tokens for this user on logout")
refreshTokenSchema.index({ user: 1 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
