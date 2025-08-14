"use client";

import { useState } from "react";
import GetLocationButton from "./GetLocationButton";

function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function geocodeAddress(address) {
    const query = (address || "").trim();
    if (!query) throw new Error("Address is empty");
    const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          query
        )}&key=AIzaSyAzZSkv1yHIb_eceBc3y4BmvnMcd6ov3vU`
    );
    if (!resp.ok) throw new Error("Failed to geocode address");
    const data = await resp.json();
    
    // Check if Google Maps API returned results
    if (!data.results || data.results.length === 0) {
        throw new Error("No coordinates found for address");
    }
    
    // Extract coordinates from Google Maps API response format
    const location = data.results[0].geometry.location;
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lng);
    
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("Invalid coordinates for address");
    }
    return { lat, lon };
}

export async function matchLocationToAddress(userResult, address, toleranceMeters = 80) {
    if (!userResult || userResult.type !== "success" || !userResult.coords) {
        throw new Error("User location is not available");
    }
    const { latitude, longitude } = userResult.coords;
    const target = await geocodeAddress(address);
    const distance = haversineDistanceMeters(
        latitude,
        longitude,
        target.lat,
        target.lon
    );
    return {
        matched: distance <= toleranceMeters,
        distanceMeters: distance,
        targetCoords: target,
        userCoords: { lat: latitude, lon: longitude }
    };
}

export default function AddressVerif() {
    const [userResult, setUserResult] = useState(null);
    const [inputAddress, setInputAddress] = useState("");
    const [tolerance, setTolerance] = useState(20);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [matched, setMatched] = useState(null);
    const [coordinates, setCoordinates] = useState(null);

    async function handleMatch() {
        setLoading(true);
        setError("");
        setMatched(null);
        setCoordinates(null);
        try {
            const res = await matchLocationToAddress(
                userResult,
                inputAddress,
                tolerance
            );
            setMatched(res.matched);
            setCoordinates({
                expected: res.targetCoords,
                current: res.userCoords
            });
        } catch (e) {
            setError(e?.message || "Failed to match location");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-xl p-4 rounded border border-gray-300 flex flex-col gap-3">
            <GetLocationButton onResult={setUserResult} />

            <div className="flex flex-col gap-2">
                <input
                    type="text"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    placeholder="Enter address to compare"
                    className="border rounded px-2 py-1"
                />
                {/* <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Tolerance (m):</label>
                    <input
                        type="number"
                        min="1"
                        value={tolerance}
                        onChange={(e) => setTolerance(e.target.value)}
                        className="border rounded px-2 py-1 w-24"
                    />
                </div> */}
                <button
                    onClick={handleMatch}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-60"
                    disabled={loading || !userResult || !inputAddress.trim()}
                >
                    {loading ? "Checking..." : "Verify Address Match"}
                </button>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            {matched !== null && (
                <div className="text-sm">
                    {matched ? "✅ Matches" : "❌ Not a match"}
                </div>
            )}
            {coordinates && (
                <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <div>
                        <span className="font-semibold">Expected coordinates:</span> {coordinates.expected.lat}, {coordinates.expected.lon}
                    </div>
                    <div>
                        <span className="font-semibold">Your location:</span> {coordinates.current.lat}, {coordinates.current.lon}
                    </div>
                </div>
            )}
        </div>
    );
}