// src/models/User.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   A Mongoose "Schema" defines the shape of documents in a MongoDB collection.
//   Think of it like a blueprint — every user document must follow this structure.
//   Mongoose also adds validation, default values, and hooks (like pre-save).
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { getNextSequence } = require("./Counter");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      unique: true, // Guarantees no two users share the same userId
      immutable: true, // Once set, it can never be changed (like a real ID)
    },
    name: {
      type: String,
      required: [true, "Name is required"], // Custom error message
      trim: true, // Removes leading/trailing spaces
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // Creates a unique index in MongoDB
      lowercase: true, // Always stores email in lowercase
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // IMPORTANT: password won't be returned in queries by default
    },
    role: {
      type: String,
      enum: ["admin", "manager", "employee"], // Only these 3 values allowed
      default: "employee",
    },
    avatar: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    // timestamps: true automatically adds createdAt and updatedAt fields
    timestamps: true,
  },
);

// ── Pre-save Hook: Auto-increment userId ──────────────────────────────────────
// this.isNew = true only on first save (User.create / new User().save)
// We fetch the next sequence from the Counter collection and assign it.
// This is atomic — even if 100 users register at the same time, each gets
// a unique number (MongoDB's findOneAndUpdate + $inc guarantees this).
userSchema.pre("save", async function () {
  if (this.isNew) {
    this.userId = await getNextSequence("userId"); // → 1, 2, 3, 4 ...
  }
});

// ── Pre-save Hook: Password Hashing ───────────────────────────────────────────
// This runs BEFORE every .save() call
// We hash the password here so we never store plain text passwords
// isModified('password') = only re-hash if password actually changed
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  // bcrypt.genSalt(10) creates a "salt" — random data added to password before hashing
  // 10 = cost factor (higher = more secure but slower)
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance Method ───────────────────────────────────────────────────────────
// We add a custom method to every User document
// This lets us do: user.comparePassword('plaintext') → returns true/false
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// mongoose.model('User', userSchema) creates a Model
// The model is what we use to query: User.find(), User.create(), etc.
// MongoDB will store documents in a collection called 'users' (auto-pluralized)
module.exports = mongoose.model("User", userSchema);
