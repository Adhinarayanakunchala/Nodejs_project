// src/models/Project.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Defines the Project document structure.
//   Key concept: "ref" creates a REFERENCE to another collection.
//   mongoose.Types.ObjectId is MongoDB's unique ID type (like a foreign key in SQL).
//   We use .populate() later to replace IDs with actual user/task documents.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["planning", "active", "on-hold", "completed"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    // createdBy stores the ObjectId of the user who created this project
    // ref: 'User' tells Mongoose which collection to look up when we .populate()
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // members is an ARRAY of ObjectIds — multiple users can be in a project
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // toJSON: virtuals lets virtual fields appear when converting to JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Virtual Field ─────────────────────────────────────────────────────────────
// Virtuals are computed fields — they don't get stored in MongoDB
// but appear when you call .toJSON() or .toObject()
// Here we compute memberCount from the members array length
projectSchema.virtual("memberCount").get(function () {
  return this.members.length;
});

module.exports = mongoose.model("Project", projectSchema);
