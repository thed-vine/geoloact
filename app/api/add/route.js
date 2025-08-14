import { NextResponse } from 'next/server';

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

export async function POST(request) {
    try {
        const body = await request.json();
        const { userLat, userLon, address, tolerance = 80 } = body;

        // Validate required fields
        if (!userLat || !userLon || !address) {
            return NextResponse.json(
                { error: "Missing required fields: userLat, userLon, and address are required" },
                { status: 400 }
            );
        }

        // Validate coordinates are numbers
        const lat = parseFloat(userLat);
        const lon = parseFloat(userLon);
        if (isNaN(lat) || isNaN(lon)) {
            return NextResponse.json(
                { error: "Invalid coordinates: userLat and userLon must be valid numbers" },
                { status: 400 }
            );
        }

        // Validate tolerance
        const toleranceMeters = parseFloat(tolerance);
        if (isNaN(toleranceMeters) || toleranceMeters <= 0) {
            return NextResponse.json(
                { error: "Invalid tolerance: must be a positive number" },
                { status: 400 }
            );
        }

        // Geocode the address
        const targetCoords = await geocodeAddress(address);
        
        // Calculate distance
        const distance = haversineDistanceMeters(
            lat,
            lon,
            targetCoords.lat,
            targetCoords.lon
        );

        // Check if it matches within tolerance
        const matched = distance <= toleranceMeters;

        return NextResponse.json({
            success: true,
            matched,
            distanceMeters: distance,
            targetCoords: {
                lat: targetCoords.lat,
                lon: targetCoords.lon
            },
            userCoords: {
                lat: lat,
                lon: lon
            },
            toleranceMeters
        });

    } catch (error) {
        console.error('Address verification error:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: error.message || "Failed to verify address" 
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: "Address Verification API",
        usage: {
            method: "POST",
            body: {
                userLat: "number (required) - User's latitude",
                userLon: "number (required) - User's longitude", 
                address: "string (required) - Address to verify",
                tolerance: "number (optional) - Tolerance in meters, default: 80"
            },
            response: {
                success: "boolean - Whether the request was successful",
                matched: "boolean - Whether the address matches within tolerance",
                distanceMeters: "number - Distance between user and address",
                targetCoords: "object - Coordinates of the address",
                userCoords: "object - User's coordinates",
                toleranceMeters: "number - Tolerance used for matching"
            }
        }
    });
}
