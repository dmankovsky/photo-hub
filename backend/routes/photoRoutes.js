const express = require("express");
const multer = require("multer");
const path = require("path");
const Photo = require("../models/Photo");

const router = express.Router();

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: "backend/uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeValid = allowedTypes.test(file.mimetype);
    if (extValid && mimeValid) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Upload photos
// HIGH-2 fix: field name "photo" matches the FormData key used in the frontend
router.post("/upload", upload.array("photo", 10), async (req, res) => {
  const { clientId } = req.body;

  if (!clientId) return res.status(400).json({ error: "Client ID required" });

  // HIGH-4 fix: guard against undefined/empty req.files before calling .map()
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const uploadedPhotos = req.files.map((file) => ({
    clientId,
    name: file.filename,
    url: `/uploads/${file.filename}`,
  }));

  try {
    const savedPhotos = await Photo.insertMany(uploadedPhotos);
    res.status(201).json(savedPhotos);
  } catch (error) {
    res.status(500).json({ error: "Error saving photos" });
  }
});

// Retrieve photos by clientId
router.get("/photos", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: "Client ID required" });

  try {
    const photos = await Photo.find({ clientId });
    res.status(200).json(photos);
  } catch (error) {
    res.status(500).json({ error: "Error fetching photos" });
  }
});

module.exports = router;
