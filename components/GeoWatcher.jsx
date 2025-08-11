"use client";

import { useEffect, useState } from "react";
import geolo from "@/components/geolo"; // keep your existing formatter module

// Lightweight map preview using OSM raster tiles, no external libs
const TILE_SIZE = 256;

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function latLonToTileCoords(lat, lon, z) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, z);
  const x = ((lon + 180) / 360) * n;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const xOffset = Math.floor((x - tileX) * TILE_SIZE);
  const yOffset = Math.floor((y - tileY) * TILE_SIZE);
  return { tileX, tileY, xOffset, yOffset };
}

function MapPreview({ lat, lon, zoom = 15, size = 320 }) {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) {
    return (
      <div
        className="relative flex items-center justify-center bg-gray-100 text-gray-500"
        style={{ width: size, height: size }}
      >
        Waiting for location...
        <div className="absolute bottom-1 right-2 text-[10px] bg-white/80 px-1 rounded">
          © OpenStreetMap contributors
        </div>
      </div>
    );
  }

  const { tileX, tileY, xOffset, yOffset } = latLonToTileCoords(lat, lon, zoom);
  const url = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <img
        src={url}
        alt="Map tile"
        className="absolute inset-0 w-full h-full object-cover"
        crossOrigin="anonymous"
      />
      {/* Marker */}
      <div
        className="absolute"
        style={{
          left: xOffset,
          top: yOffset,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow" />
      </div>
      {/* Attribution */}
      <div className="absolute bottom-1 right-2 text-[10px] bg-white/80 px-1 rounded">
        © OpenStreetMap contributors
      </div>
    </div>
  );
}

export default function GeoWatcher() {
  const [supported, setSupported] = useState(false);
  const [result, setResult] = useState(null);
  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    const isSupported =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.geolocation;

    setSupported(isSupported);

    if (!isSupported) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        // Format success position with your existing formatter
        setResult(geolo(pos));
      },
      (err) => {
        // Format error with your existing formatter
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
      try {
        if (id != null && navigator.geolocation) {
          navigator.geolocation.clearWatch(id);
        }
      } catch {
        // no-op
      }
    };
  }, []);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card */}
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

        {/* Map */}
        <div className="p-4 rounded border border-gray-300 flex items-center justify-center">
          <MapPreview lat={result?.coords?.latitude} lon={result?.coords?.longitude} />
        </div>
      </div>
    </div>
  );
}