// src/config/db.js
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE EXISTS:
//   Instead of connecting to MongoDB in every file, we create ONE connection
//   here and reuse it everywhere. This is called "connection pooling" — Mongoose
//   handles it automatically under the hood.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // mongoose.connect() returns a Promise, so we use await
    // process.env.MONGO_URI reads the value from our .env file (loaded by dotenv)
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // conn.connection.host tells us which MongoDB server we connected to
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error and exit the process
    // process.exit(1) means "exit with failure" — stops the server from running
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Export the function so server.js can call it
module.exports = connectDB;
