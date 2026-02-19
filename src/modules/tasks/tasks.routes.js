// src/modules/tasks/tasks.routes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  createTask,
  getTasks,
  getTaskById,
  updateTaskStatus,
  assignTask,
  updateTask,
} = require("./tasks.controller");
const { protect } = require("../../middleware/auth");
const { authorize } = require("../../middleware/role");

const router = express.Router();

// ── Multer Configuration ──────────────────────────────────────────────────────
// multer handles multipart/form-data (file uploads)
// diskStorage lets us control WHERE and WHAT NAME files are saved as
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // cb(error, destination) — null means no error
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Create unique filename: timestamp-originalname
    // This prevents overwriting files with the same name
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

// fileFilter limits which file types are accepted
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  if (extname) {
    cb(null, true); // Accept file
  } else {
    cb(new Error("File type not supported"), false); // Reject file
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
});

// ── Routes ────────────────────────────────────────────────────────────────────
router.use(protect);

router.get("/", getTasks);
router.post("/", authorize("admin", "manager"), createTask);
router.get("/:id", getTaskById);
router.put("/:id", authorize("admin", "manager"), updateTask);

// Status update — employees can update their own task status
router.patch("/:id/status", updateTaskStatus);

// Assign task — managers/admins only
router.post("/:id/assign", authorize("admin", "manager"), assignTask);

// File upload — upload.single('file') processes one file from the 'file' field
router.post(
  "/:id/attachments",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      // Add attachment info to the task's attachments array using $push
      const Task = require("../../models/Task");
      const task = await Task.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            attachments: {
              filename: req.file.filename,
              originalName: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
            },
          },
        },
        { new: true },
      );

      res.status(200).json({ success: true, data: task });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
