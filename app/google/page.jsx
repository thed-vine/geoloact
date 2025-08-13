"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import geolo from "@/components/geolo";

function GoogleMap({ lat, lon, zoom = 15, size = 320 }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!lat || !lon || !window.google) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat, lng: lon },
      zoom,
    });

    new google.maps.Marker({
      position: { lat, lng: lon },
      map,
    });
  }, [lat, lon, zoom]);

  return <div ref={mapRef} style={{ width: size, height: size }} />;
}

export default function Googlee() {
  const [supported, setSupported] = useState(false);
  const [result, setResult] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCoords, setSearchCoords] = useState(null);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.geolocation;

    setSupported(isSupported);

    if (!isSupported) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setResult(geolo(pos));
      },
      (err) => {
        setResult(geolo(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    setWatchId(id);

    return () => {
      if (id != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(id);
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchQuery
        )}&key=AIzaSyAzZSkv1yHIb_eceBc3y4BmvnMcd6ov3vU`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        setSearchCoords({ lat: location.lat, lon: location.lng });
      } else {
        alert("No results found for the given address.");
      }
    } catch (error) {
      console.error("Error fetching geocoding data:", error);
      alert("Failed to fetch coordinates. Please try again.");
    }
  };

  if (!supported) {
    return (
      <div className="w-full max-w-lg p-4 rounded border border-gray-300">
        <h2 className="text-lg font-semibold mb-2">Geolocation not supported</h2>
        <p className="text-sm text-gray-600">
          Your browser doesn&apos;t support the Geolocation API.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <Script
        src="https://maps.googleapis.com/maps/api/js?key=AIzaSyAzZSkv1yHIb_eceBc3y4BmvnMcd6ov3vU"
        strategy="lazyOnload"
      />
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search for an address"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded px-2 py-1 w-full"
        />
        <button
          onClick={handleSearch}
          className="mt-2 bg-blue-600 text-white px-4 py-1 rounded"
        >
          Search
        </button>
      </div>
      {searchCoords && (
        <div className="mb-4 text-sm text-gray-600">
          Coordinates: Latitude {searchCoords.lat}, Longitude {searchCoords.lon}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded border border-gray-300">
          <h2 className="text-lg font-semibold mb-2">Live location (watchPosition)</h2>

          {!result && (
            <p className="text-sm text-gray-600">
              Requesting permission and waiting for your location...
            </p>
          )}

          {result && (
            <div>
              <div
                className={`text-sm mb-1 ${
                  result.type === "error" ? "text-red-600" : "text-green-700"
                }`}
              >
                {result.title}
              </div>
              <div className="text-sm">{result.message}</div>
              {result.coords && (
                <div className="text-xs text-gray-600 mt-2">
                  lat: {result.coords.latitude}, lng: {result.coords.longitude}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 rounded border border-gray-300 flex items-center justify-center">
          <GoogleMap
            lat={result?.coords?.latitude}
            lon={result?.coords?.longitude}
          />
        </div>
      </div>
    </div>
  );
}
