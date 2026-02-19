require('dotenv').config();  // Ensure dotenv is loaded first

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Photo = require("./models/Photo");
const photoRoutes = require('./routes/photoRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

const uri = process.env.MONGO_URI;

// Ensure uploads directory exists on first run (LOW-3 fix)
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// HIGH-1 fix: use absolute path so static serving matches multer's destination
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose.connect(uri)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));

// Register photo routes (multi-file upload: POST /api/upload, photo listing: GET /api/photos)
app.use('/api', photoRoutes);

// Multer storage configuration (for file uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, "uploads"));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
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

// Photo upload endpoint
app.post("/upload", upload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const photo = new Photo({
        name: req.file.originalname,  // Original name of the file
        url: `/uploads/${req.file.filename}`, // The path where the file is stored
        clientId: req.body.clientId,  // clientId sent from the frontend
      });
  
      // Save the photo to the database
      await photo.save();
  
      res.status(200).json({ message: "Photo uploaded successfully!", photo });
    } catch (error) {
      console.error("❌ Error uploading photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });