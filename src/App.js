import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { motion } from "framer-motion";
import DownloadPage from "./components/DownloadPage";
import { Card, CardHeader, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";

const generateRandomId = () => String(Math.floor(100000 + Math.random() * 900000));

const PhotoHub = () => {
  const [clientId, setClientId] = useState(generateRandomId);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files));
    setUploadStatus("");
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadStatus("Please select at least one photo.");
      return;
    }

    setUploading(true);
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("clientId", clientId);
    selectedFiles.forEach((file) => formData.append("photo", file));

    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (response.ok) {
        const count = result.length;
        setUploadStatus(`${count} photo${count !== 1 ? "s" : ""} uploaded successfully!`);
        setUploadedCount((prev) => prev + count);
        setQrValue(`${window.location.origin}/download/${clientId}`);
        setSelectedFiles([]);
        // Reset file input
        const input = document.getElementById("photo-input");
        if (input) input.value = "";
      } else {
        setUploadStatus(`Upload failed: ${result.error}`);
      }
    } catch {
      setUploadStatus("Network error. Please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateNew = () => {
    setClientId(generateRandomId());
    setSelectedFiles([]);
    setUploadStatus("");
    setQrValue("");
    setUploadedCount(0);
    const input = document.getElementById("photo-input");
    if (input) input.value = "";
  };

  const downloadLink = `${window.location.origin}/download/${clientId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white">
      <motion.div
        className="container mx-auto max-w-xl"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-center mb-8">Photo Hub</h1>

        {/* Session ID */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-800">Session ID</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl font-mono font-bold tracking-widest text-purple-600">
                {clientId}
              </span>
            </div>
            <Button variant="outline" onClick={handleGenerateNew} className="text-sm">
              Generate New ID
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              Share this ID with your client so they can access their photos.
            </p>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold text-gray-800">Upload Photos</h2>
          </CardHeader>
          <CardContent>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="mb-3 block w-full text-sm text-gray-700
                file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700
                hover:file:bg-purple-100 cursor-pointer"
            />
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-500 mb-3">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
              </p>
            )}
            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full"
            >
              {uploading ? "Uploading..." : `Upload ${selectedFiles.length > 0 ? selectedFiles.length + " " : ""}Photo${selectedFiles.length !== 1 ? "s" : ""}`}
            </Button>
            {uploadStatus && (
              <p className={`mt-3 text-sm font-medium ${uploadStatus.includes("failed") || uploadStatus.includes("error") ? "text-red-500" : "text-green-600"}`}>
                {uploadStatus}
              </p>
            )}
          </CardContent>
        </Card>

        {/* QR Code + Download Link — shown after first upload */}
        {qrValue && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-800">Share with Client</h2>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-xl shadow-md">
                  <QRCodeCanvas value={qrValue} size={200} />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Client scans this QR code to download photos
                </p>
                <div className="w-full bg-gray-50 rounded-lg p-3 break-all text-sm font-mono text-gray-700 border">
                  {downloadLink}
                </div>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 text-sm"
                    onClick={() => navigator.clipboard.writeText(downloadLink)}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 text-sm"
                    onClick={() => navigator.clipboard.writeText(clientId)}
                  >
                    Copy ID
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  {uploadedCount} photo{uploadedCount !== 1 ? "s" : ""} uploaded · Session: {clientId}
                </p>
              </CardContent>
            </Card>
          </motion.div>
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
