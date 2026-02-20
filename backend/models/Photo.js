const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },             // Cloudinary secure_url
  cloudinaryPublicId: { type: String },              // Cloudinary public_id
  clientId: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Photo", photoSchema);
