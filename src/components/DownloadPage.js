import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5001";
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

// Add fl_attachment to Cloudinary URL to force browser download
const toDownloadUrl = (url) => {
  if (url.includes("res.cloudinary.com")) {
    return url.replace("/upload/", "/upload/fl_attachment/");
  }
  return url;
};

const DownloadPage = () => {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();

  const [photos, setPhotos] = useState([]);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const checkPaymentStatus = useCallback(async () => {
    const paymentParam = searchParams.get("payment");
    const stripeSessionId = searchParams.get("session_id");

    // If Stripe redirected back with success, verify it
    if (paymentParam === "success" && stripeSessionId) {
      try {
        const res = await fetch(
          `${API_BASE}/api/verify-payment?stripeSessionId=${stripeSessionId}&clientId=${clientId}`
        );
        const data = await res.json();
        if (data.paid) {
          setPaid(true);
          return;
        }
      } catch (err) {
        console.error("Payment verification error:", err);
      }
    }

    // Otherwise check stored payment status
    try {
      const res = await fetch(`${API_BASE}/api/payment-status?clientId=${clientId}`);
      const data = await res.json();
      setPaid(data.paid || false);
    } catch (err) {
      console.error("Payment status check error:", err);
    }
  }, [clientId, searchParams]);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/photos?clientId=${clientId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) setPhotos(data);
    } catch (err) {
      setError(err.message);
    }
  }, [clientId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([checkPaymentStatus(), fetchPhotos()]);
      setLoading(false);
    };
    init();
  }, [checkPaymentStatus, fetchPhotos]);

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const session = await response.json();

      // Redirect to Stripe-hosted checkout page
      if (session.url) {
        window.location.href = session.url;
      } else {
        const stripe = await stripePromise;
        const result = await stripe.redirectToCheckout({ sessionId: session.id });
        if (result.error) throw new Error(result.error.message);
      }
    } catch (err) {
      alert("Payment error: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`${API_BASE}/api/download-all/${clientId}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photos-${clientId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-gray-800">Download Your Photos</h1>
            <p className="text-sm text-gray-400 font-mono">Session ID: {clientId}</p>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-red-500">Error loading photos: {error}</p>
            ) : photos.length === 0 ? (
              <p className="text-gray-500">No photos found for this session.</p>
            ) : !paid ? (
              /* Payment gate */
              <div className="text-center py-10">
                <div className="text-6xl mb-4">📷</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {photos.length} photo{photos.length !== 1 ? "s" : ""} ready for you
                </h2>
                <p className="text-gray-500 mb-2">
                  Pay once to download all photos in full resolution.
                </p>
                <p className="text-2xl font-bold text-gray-800 mb-6">
                  ${(photos.length * 5).toFixed(2)}
                  <span className="text-sm font-normal text-gray-400 ml-2">
                    (${5}/photo)
                  </span>
                </p>
                <Button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="text-base px-10 py-3"
                >
                  {paymentLoading ? "Redirecting to payment..." : "Pay & Unlock Downloads"}
                </Button>
                {searchParams.get("payment") === "cancelled" && (
                  <p className="mt-4 text-yellow-600 text-sm">
                    Payment was cancelled. You can try again when ready.
                  </p>
                )}
              </div>
            ) : (
              /* Gallery — payment confirmed */
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                  <p className="text-green-600 font-medium">
                    ✓ Payment confirmed &mdash; {photos.length} photo{photos.length !== 1 ? "s" : ""}
                  </p>
                  <Button
                    onClick={handleDownloadAll}
                    disabled={downloading}
                    className="shrink-0"
                  >
                    {downloading ? "Preparing ZIP..." : "Download All as ZIP"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo._id} className="relative group rounded-xl overflow-hidden shadow">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-48 object-cover"
                        loading="lazy"
                      />
                      <a
                        href={toDownloadUrl(photo.url)}
                        download={photo.name}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100
                          flex items-center justify-center text-white text-sm font-semibold
                          transition-opacity duration-200"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DownloadPage;
