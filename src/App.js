import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import PhotoCard from "./components/PhotoCard";
import DownloadPage from "./components/DownloadPage";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardHeader, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const PhotoUpload = ({ clientId }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");

  // Handle file selection
  const handleFileSelect = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    // Prepare the form data
    const formData = new FormData();
    formData.append("photo", selectedFile);
    formData.append("clientId", clientId); // send clientId to associate the photo with a client

    try {
      setUploadStatus("Uploading...");

      // HIGH-2 fix: use the validated /api/upload route (supports multi-file + clientId validation)
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setUploadStatus("Upload successful!");

      } else {
        setUploadStatus("Upload failed.");
        console.error("Error uploading photo:", result.error);
      }
    } catch (error) {
      setUploadStatus("Error uploading photo.");
      console.error("Network error:", error);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileSelect} />
      <button onClick={handleUpload}>Upload</button>
      <p>{uploadStatus}</p>
    </div>
  );
};

const PhotoHub = () => {
  // HIGH-3 fix: add setPhotos setter (was discarded before) and fetch photos when clientId changes
  const [photos, setPhotos] = useState([]);
  const [clientId, setClientId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // HIGH-3 fix: fetch photos from API whenever clientId changes
  useEffect(() => {
    if (!clientId.trim()) return;
    fetch(`${API_BASE}/api/photos?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data) => setPhotos(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching photos:", err));
  }, [clientId]);

  const generateQRCode = () => {
    if (clientId.trim()) {
      const generatedQrCode = `${window.location.origin}/download/${clientId}`;
      setQrCode(generatedQrCode);
    }
  };
  
  const handlePhotoSelect = (photoId) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handlePayment = async () => {
    try {
      const stripe = await stripePromise;
      const response = await fetch("/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPhotosCount: selectedPhotos.length,
        }),
      });
      if (!response.ok) throw new Error("Failed to create checkout session");
      const session = await response.json();
      const result = await stripe.redirectToCheckout({ sessionId: session.id });
      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      alert("Payment failed: " + error.message);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("success")) {
      setPaymentCompleted(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white">
      <motion.div
        className="container mx-auto"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-center mb-8">Photo Hub</h1>

        {/* Photographer Section */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold">Photographer Dashboard</h2>
          </CardHeader>
          <CardContent>
            <Input id="client-id" placeholder="Enter client ID" value={clientId} onChange={(e) => { setClientId(e.target.value); }} />
            <PhotoUpload clientId={clientId} />
            <Button onClick={generateQRCode} className="mt-2">Generate QR Code</Button>
            {qrCode && (
              <div className="mt-4">
                <p>QR Code:</p>
                <QRCodeCanvas value={qrCode} size={128} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Photos */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-2xl font-bold">Uploaded Photos</h2>
          </CardHeader>
          <CardContent>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* LOW-1 fix: use photo._id (MongoDB field) instead of photo.id virtual */}
                {photos.map((photo) => (
                  <PhotoCard key={photo._id} photo={photo} onSelect={handlePhotoSelect} isSelected={selectedPhotos.includes(photo._id)} />
                ))}
              </div>
            ) : <p className="text-gray-200">No photos uploaded yet.</p>}
          </CardContent>
        </Card>

        {/* Payment Section */}
        {selectedPhotos.length > 0 && !paymentCompleted && (
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold">Payment</h2>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Selected {selectedPhotos.length} photos. Total: ${(selectedPhotos.length * 5).toFixed(2)}</p>
              <Button onClick={handlePayment}>Proceed to Payment</Button>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<PhotoHub />} />
      <Route path="/download/:clientId" element={<DownloadPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;