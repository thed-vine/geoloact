"use client";

import { useEffect, useState, useRef } from "react";
import geolo from "@/components/geolo";
import "leaflet/dist/leaflet.css";

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function MapPreview({ lat, lon, heading, zoom = 17, size = 320 }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapContainerId = "map-preview-container";

  useEffect(() => {
    let leaflet;
    let map;
    let marker;
    let icon;
    let initialized = false;
    (async () => {
      leaflet = await import("leaflet");
      if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) return;
      // Custom marker with heading arrow
      icon = leaflet.divIcon({
        className: "user-marker",
        html: `<div style=\"transform: rotate(${isFiniteNumber(heading) ? heading : 0}deg);\">
          <svg width=\"32\" height=\"32\" viewBox=\"0 0 32 32\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">
            <circle cx=\"16\" cy=\"16\" r=\"10\" fill=\"#fff\" stroke=\"#d00\" stroke-width=\"3\"/>
            <polygon points=\"16,6 20,20 16,16 12,20\" fill=\"#d00\" />
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      if (!mapRef.current) {
        map = leaflet.map(mapContainerId, {
          center: [lat, lon],
          zoom,
          zoomControl: true,
          attributionControl: false,
        });
        leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);
        marker = leaflet.marker([lat, lon], { icon }).addTo(map);
        mapRef.current = map;
        markerRef.current = marker;
        initialized = true;
      } else {
        map = mapRef.current;
        marker = markerRef.current;
        map.setView([lat, lon], map.getZoom());
        marker.setLatLng([lat, lon]);
        marker.setIcon(icon);
      }
    })();
    return () => {
      if (mapRef.current && !initialized) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [lat, lon, heading]);

  return (
    <div
      id={mapContainerId}
      style={{ width: size, height: size, borderRadius: 8, overflow: "hidden" }}
      className="shadow"
    >
      {!isFiniteNumber(lat) || !isFiniteNumber(lon) ? (
        <div className="flex items-center justify-center w-full h-full text-gray-500 bg-gray-100">
          Waiting for location...
        </div>
      ) : null}
    </div>
  );
}

export default function GeoWatcher() {
  const [supported, setSupported] = useState(false);
  const [result, setResult] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [address, setAddress] = useState("");
  const [osmAddress, setOsmAddress] = useState("");
  const addressIntervalRef = useRef(null);

  // Manual input states
  const [inputLat, setInputLat] = useState("");
  const [inputLon, setInputLon] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [manualOsmAddress, setManualOsmAddress] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  async function handleManualLookup() {
    setManualLoading(true);
    setManualAddress("");
    setManualOsmAddress("");
    const lat = inputLat.trim();
    const lon = inputLon.trim();
    if (!lat || !lon || isNaN(Number(lat)) || isNaN(Number(lon))) {
      setManualAddress("Invalid coordinates");
      setManualOsmAddress("");
      setManualLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `https://eu1.locationiq.com/v1/reverse?key=pk.68a3081f26e3b8ea3ac492e06bbe81b4&lat=${lat}&lon=${lon}&format=json`
      );
      if (!response.ok) throw new Error("Failed to fetch address");
      const data = await response.json();
      setManualAddress(data.display_name || "Address not found");
    } catch (e) {
      setManualAddress("Address lookup failed");
    }
    try {
      const osmResp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      if (!osmResp.ok) throw new Error("Failed to fetch OSM address");
      const osmData = await osmResp.json();
      setManualOsmAddress(osmData.display_name || "OSM address not found");
    } catch (e) {
      setManualOsmAddress("OSM address lookup failed");
    }
    setManualLoading(false);
  }

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
      try {
        if (id != null && navigator.geolocation) {
          navigator.geolocation.clearWatch(id);
        }
      } catch {
        // no-op
      }
      if (addressIntervalRef.current) {
        clearInterval(addressIntervalRef.current);
      }
    };
  }, []);

  // Fetch address when coordinates change or every 30 minutes
  useEffect(() => {
    async function fetchAddress(lat, lon) {
      if (!lat || !lon) {
        setAddress("");
        setOsmAddress("");
        return;
      }
      try {
        const response = await fetch(
          `https://eu1.locationiq.com/v1/reverse?key=pk.68a3081f26e3b8ea3ac492e06bbe81b4&lat=${lat}&lon=${lon}&format=json`
        );
        if (!response.ok) throw new Error("Failed to fetch address");
        const data = await response.json();
        setAddress(data.display_name || "Address not found");
      } catch (e) {
        setAddress("Address lookup failed");
      }
      // Fetch OSM address
      try {
        const osmResp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        );
        if (!osmResp.ok) throw new Error("Failed to fetch OSM address");
        const osmData = await osmResp.json();
        setOsmAddress(osmData.display_name || "OSM address not found");
      } catch (e) {
        setOsmAddress("OSM address lookup failed");
      }
    }

    if (result && result.coords) {
      const { latitude, longitude } = result.coords;
      fetchAddress(latitude, longitude);
      if (addressIntervalRef.current) {
        clearInterval(addressIntervalRef.current);
      }
      addressIntervalRef.current = setInterval(() => {
        fetchAddress(latitude, longitude);
      }, 30 * 60 * 1000); // 30 minutes
    } else {
      setAddress("");
      setOsmAddress("");
      if (addressIntervalRef.current) {
        clearInterval(addressIntervalRef.current);
      }
    }
    return () => {
      if (addressIntervalRef.current) {
        clearInterval(addressIntervalRef.current);
      }
    };
  }, [result?.coords?.latitude, result?.coords?.longitude]);

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
      {/* Manual lookup section */}
      <div className="mb-6 p-4 rounded border border-white bg-slate-800">
        <h2 className="text-lg font-semibold mb-2">Manual Address Lookup</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-2">
          <input
            type="text"
            placeholder="Latitude"
            value={inputLat}
            onChange={e => setInputLat(e.target.value)}
            className="border rounded px-2 py-1 w-full md:w-40"
          />
          <input
            type="text"
            placeholder="Longitude"
            value={inputLon}
            onChange={e => setInputLon(e.target.value)}
            className="border rounded px-2 py-1 w-full md:w-40"
          />
          <button
            onClick={handleManualLookup}
            className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
            disabled={manualLoading}
          >
            {manualLoading ? "Looking up..." : "Find Address"}
          </button>
        </div>
        {(manualAddress || manualOsmAddress) && (
          <div className="mt-2">
            <div className="text-xs text-white">
              <span className="font-semibold">Address:</span> {manualAddress}
            </div>
            <div className="text-xs text-white mt-1">
              <span className="font-semibold">OSM Address:</span> {manualOsmAddress}
            </div>
          </div>
        )}
      </div>
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
              {result.coords && (
                <div className="text-md text-gray-200 mt-2">
                  <span className="font-semibold">Address:</span> {address || "Looking up address..."}
                </div>
              )}
              {result.coords && (
                <div className="text-md text-gray-200 mt-1">
                  <span className="font-semibold">OSM Address:</span> {osmAddress || "Looking up OSM address..."}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="p-4 rounded border border-gray-300 flex items-center justify-center">
          <MapPreview
            lat={result?.coords?.latitude}
            lon={result?.coords?.longitude}
            heading={result?.coords?.heading}
          />
        </div>
      </div>
    </div>
  );
}
