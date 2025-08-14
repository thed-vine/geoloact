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

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerLat = searchParams.get('customerLat');
        const customerLon = searchParams.get('customerLon');
        const mbeLat = searchParams.get('mbeLat');
        const mbeLon = searchParams.get('mbeLon');
        const tolerance = searchParams.get('tolerance') || '80';

        // Validate required fields
        if (!customerLat || !customerLon || !mbeLat || !mbeLon) {
            return NextResponse.json(
                { error: "Missing required fields: customerLat, customerLon, mbeLat, and mbeLon are required" },
                { status: 400 }
            );
        }

        // Validate coordinates are numbers
        const lat1 = parseFloat(customerLat);
        const lon1 = parseFloat(customerLon);
        const lat2 = parseFloat(mbeLat);
        const lon2 = parseFloat(mbeLon);
        
        if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
            return NextResponse.json(
                { error: "Invalid coordinates: All coordinates must be valid numbers" },
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

        // Calculate distance between the two coordinates
        const distance = haversineDistanceMeters(
            lat1,
            lon1,
            lat2,
            lon2
        );

        // Check if coordinates match within tolerance
        const matched = distance <= toleranceMeters;

        return NextResponse.json({
            success: true,
            matched,
            distanceMeters: distance,
            customer: {
                lat: lat1,
                lon: lon1
            },
            mbe: {
                lat: lat2,
                lon: lon2
            },
            toleranceMeters
        });

    } catch (error) {
        console.error('Coordinate matching error:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: error.message || "Failed to match coordinates" 
            },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    
    // If parameters are provided, process the request
    if (searchParams.get('customerLat') && searchParams.get('customerLon') && searchParams.get('mbeLat') && searchParams.get('mbeLon')) {
        try {
            const customerLat = searchParams.get('customerLat');
            const customerLon = searchParams.get('customerLon');
            const mbeLat = searchParams.get('mbeLat');
            const mbeLon = searchParams.get('mbeLon');
            const tolerance = searchParams.get('tolerance') || '80';

            // Validate coordinates are numbers
            const lat1 = parseFloat(customerLat);
            const lon1 = parseFloat(customerLon);
            const lat2 = parseFloat(mbeLat);
            const lon2 = parseFloat(mbeLon);
            
            if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
                return NextResponse.json(
                    { error: "Invalid coordinates: All coordinates must be valid numbers" },
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

            // Calculate distance between the two coordinates
            const distance = haversineDistanceMeters(
                lat1,
                lon1,
                lat2,
                lon2
            );

            // Check if coordinates match within tolerance
            const matched = distance <= toleranceMeters;

            return NextResponse.json({
                success: true,
                matched,
                distanceMeters: distance,
                customer: {
                    lat: lat1,
                    lon: lon1
                },
                mbe: {
                    lat: lat2,
                    lon: lon2
                },
                toleranceMeters
            });

        } catch (error) {
            console.error('Coordinate matching error:', error);
            
            return NextResponse.json(
                { 
                    success: false,
                    error: error.message || "Failed to match coordinates" 
                },
                { status: 500 }
            );
        }
    }
    
    // If no parameters, show documentation
    return NextResponse.json({
        message: "Coordinate Matching API",
        usage: {
            method: "GET",
            url: "/api/add?customerLat=40.7128&customerLon=-74.0060&mbeLat=40.7129&mbeLon=-74.0061&tolerance=80",
            parameters: {
                customerLat: "number (required) - First coordinate latitude",
                customerLon: "number (required) - First coordinate longitude", 
                mbeLat: "number (required) - Second coordinate latitude",
                mbeLon: "number (required) - Second coordinate longitude",
                tolerance: "number (optional) - Tolerance in meters, default: 80"
            },
            response: {
                success: "boolean - Whether the request was successful",
                matched: "boolean - Whether coordinates match within tolerance",
                distanceMeters: "number - Distance between the two coordinates",
                customer: "object - First coordinate set (lat, lon)",
                mbe: "object - Second coordinate set (lat, lon)",
                toleranceMeters: "number - Tolerance used for matching"
            },
        }
    });
}
