const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const https = require("https");
const path = require("path");
const archiver = require("archiver");
// Lazy Stripe init — only throws if the payment routes are actually called without the key set
let _stripe = null;
const getStripe = () => {
  if (!_stripe) _stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};
const Photo = require("../models/Photo");
const Session = require("../models/Session");

const router = express.Router();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "photo-hub",
    allowed_formats: ["jpeg", "jpg", "png", "gif", "webp"],
    transformation: [{ quality: "auto" }],
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
      cb(new Error("Only image files are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

// Upload photos (up to 20 files at once)
router.post("/upload", upload.array("photo", 20), async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ error: "Client ID required" });
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  const uploadedPhotos = req.files.map((file) => ({
    clientId,
    name: file.originalname,
    url: file.path,           // Cloudinary secure_url
    cloudinaryPublicId: file.filename, // Cloudinary public_id
  }));

  try {
    const savedPhotos = await Photo.insertMany(uploadedPhotos);
    res.status(201).json(savedPhotos);
  } catch (error) {
    console.error("Save photos error:", error);
    res.status(500).json({ error: "Error saving photos" });
  }
});

// Get photo metadata by clientId (no auth needed — clientId is the secret)
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

// Create Stripe checkout session for a clientId
router.post("/create-checkout-session", async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ error: "Client ID required" });

  const photoCount = await Photo.countDocuments({ clientId });
  if (photoCount === 0) {
    return res.status(404).json({ error: "No photos found for this session" });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Photo Package – ${photoCount} photo${photoCount !== 1 ? "s" : ""}`,
              description: `Session ID: ${clientId}`,
            },
            unit_amount: 500, // $5.00 per photo
          },
          quantity: photoCount,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/download/${clientId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/download/${clientId}?payment=cancelled`,
      metadata: { clientId },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Verify Stripe payment (called after redirect back from Stripe)
router.get("/verify-payment", async (req, res) => {
  const { stripeSessionId, clientId } = req.query;
  if (!stripeSessionId || !clientId) {
    return res.status(400).json({ error: "Missing stripeSessionId or clientId" });
  }

  try {
    const stripeSession = await getStripe().checkout.sessions.retrieve(stripeSessionId);
    const isPaid =
      stripeSession.payment_status === "paid" &&
      stripeSession.metadata.clientId === clientId;

    if (isPaid) {
      await Session.findOneAndUpdate(
        { clientId },
        { paid: true, stripeSessionId },
        { upsert: true, new: true }
      );
    }

    res.json({ paid: isPaid });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// Check payment status for a clientId
router.get("/payment-status", async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: "Client ID required" });

  try {
    const session = await Session.findOne({ clientId });
    res.json({ paid: session?.paid || false });
  } catch (error) {
    res.status(500).json({ error: "Error checking payment status" });
  }
});

// Helper: fetch a remote URL as a Node.js stream (handles HTTPS only)
function fetchAsStream(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Follow redirect once
        return fetchAsStream(response.headers.location).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
      }
      resolve(response);
    }).on("error", reject);
  });
}

// Download all photos as a ZIP file (requires payment)
router.get("/download-all/:clientId", async (req, res) => {
  const { clientId } = req.params;

  // Verify payment
  const session = await Session.findOne({ clientId });
  if (!session?.paid) {
    return res.status(403).json({ error: "Payment required before downloading" });
  }

  const photos = await Photo.find({ clientId });
  if (!photos.length) {
    return res.status(404).json({ error: "No photos found for this session" });
  }

  res.setHeader("Content-Disposition", `attachment; filename="photos-${clientId}.zip"`);
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 6 } });

  archive.on("error", (err) => {
    console.error("Archive error:", err);
    if (!res.headersSent) res.status(500).end();
  });

  archive.pipe(res);

  // Fetch and add each photo to the zip sequentially
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const filename = `${String(i + 1).padStart(3, "0")}-${photo.name}`;
    try {
      const stream = await fetchAsStream(photo.url);
      archive.append(stream, { name: filename });
      // Wait for the stream to finish before fetching the next one
      await new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
      });
    } catch (err) {
      console.error(`Failed to add ${photo.name} to zip:`, err.message);
    }
  }

  await archive.finalize();
});

module.exports = router;
