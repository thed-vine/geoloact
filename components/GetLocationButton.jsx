"use client";

import { useState } from "react";
import geolo from "@/components/geolo";

export default function GetLocationButton({ onResult }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function handleClick() {
    setLoading(true);
    setResult(null);

    const isSupported =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.geolocation;

    if (!isSupported) {
      const err = geolo({ code: 2, message: "Geolocation not supported" });
      setResult(err);
      setLoading(false);
      if (typeof onResult === "function") onResult(err);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const normalized = geolo(pos);
        setResult(normalized);
        setLoading(false);
        if (typeof onResult === "function") onResult(normalized);
      },
      (err) => {
        const normalized = geolo(err);
        setResult(normalized);
        setLoading(false);
        if (typeof onResult === "function") onResult(normalized);
      },
      {
        enableHighAccuracy: true,
        timeout: 1000000,
        maximumAge: 0,
      }
    );
  }

  return (
    <div className="w-full max-w-lg p-4 rounded border border-gray-300 flex flex-col gap-2">
      <button
        onClick={handleClick}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Getting location..." : "Get My Location"}
      </button>

      {result && (
        <div>
          <div className={`text-sm mb-1 ${result.type === "error" ? "text-red-600" : "text-green-700"}`}>
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


