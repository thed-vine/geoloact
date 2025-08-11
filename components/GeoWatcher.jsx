"use client";

import { useEffect, useState } from "react";
import geolo from "@/components/geolo"; // keep your existing formatter module

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
    <div className="w-full max-w-lg p-4 rounded border border-gray-300">
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
  );
}