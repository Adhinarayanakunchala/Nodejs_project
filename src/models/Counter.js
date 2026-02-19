// src/models/Counter.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   MongoDB has no built-in AUTO_INCREMENT like SQL databases.
//   This Counter collection acts as a sequence tracker.
//
//   HOW IT WORKS:
//   - One document per entity (e.g. { _id: 'userId', seq: 5 })
//   - Every time we create a new User, we call getNextSequence('userId')
//   - That atomically increments seq by 1 and returns the NEW value
//   - Atomic = thread-safe, no two users ever get the same number
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: {
    type: String, // e.g. 'userId', 'taskId'
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const Counter = mongoose.model("Counter", counterSchema);

// ── getNextSequence ───────────────────────────────────────────────────────────
// Uses findOneAndUpdate with:
//   upsert: true  → creates the counter doc if it doesn't exist yet
//   new: true     → returns the UPDATED document (with the incremented value)
//   $inc          → atomically adds 1 — safe even with concurrent requests
//
// Usage: const nextId = await getNextSequence('userId'); // → 1, 2, 3 ...
const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  return counter.seq;
};

module.exports = { Counter, getNextSequence };
