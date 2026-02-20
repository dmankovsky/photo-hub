const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  paid: { type: Boolean, default: false },
  stripeSessionId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", sessionSchema);
