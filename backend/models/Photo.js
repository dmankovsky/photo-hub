// /models/Photo.js
const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },   // URL of the uploaded photo
  clientId: { type: String, required: true }, // Associated client ID
  uploadedAt: { type: Date, default: Date.now }, // Automatically set upload time
});

const Photo = mongoose.model("Photo", photoSchema);

module.exports = Photo;
