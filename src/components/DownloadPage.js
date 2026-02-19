import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader, CardContent } from "./ui/card";
import { Button } from "./ui/button";

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const DownloadPage = () => {
  const { clientId } = useParams(); // Get client ID from the URL
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/photos?clientId=${clientId}`);
        // MEDIUM-4 fix: check response.ok before parsing JSON to surface API errors
        if (!response.ok) throw new Error(`Failed to fetch photos (HTTP ${response.status})`);
        const data = await response.json();
        if (Array.isArray(data)) setPhotos(data);
      } catch (err) {
        console.error("Error fetching photos:", err);
        setError(err.message);
      }
    };

    fetchPhotos();
  }, [clientId]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">Download Your Photos</h1>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-red-500">Error loading photos: {error}</p>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo._id} className="relative">
                  <img src={`${API_BASE}${photo.url}`} alt={photo.name} className="w-full rounded-lg" />
                  <a href={`${API_BASE}${photo.url}`} download className="absolute bottom-2 right-2 bg-white p-1 rounded">
                    <Button>Download</Button>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p>No photos available for this client.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadPage;
