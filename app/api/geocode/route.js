import { NextResponse } from 'next/server';

async function geocodeAddress(address) {
    const query = (address || "").trim();
    if (!query) throw new Error("Address is empty");

    const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          query
        )}&region=ng&key=AIzaSyBRdyveocW0espjSOf9NAWC8MVGYHJETZQ`
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

    // Get additional address details
    const addressComponents = data.results[0].address_components || [];
    const formattedAddress = data.results[0].formatted_address || "";

    // Extract useful address components
    const addressInfo = {
        street_number: "",
        route: "",
        locality: "",
        administrative_area_level_1: "",
        postal_code: "",
        country: ""
    };

    addressComponents.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
            addressInfo.street_number = component.long_name;
        } else if (types.includes('route')) {
            addressInfo.route = component.long_name;
        } else if (types.includes('locality')) {
            addressInfo.locality = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
            addressInfo.administrative_area_level_1 = component.long_name;
        } else if (types.includes('postal_code')) {
            addressInfo.postal_code = component.long_name;
        } else if (types.includes('country')) {
            addressInfo.country = component.long_name;
        }
    });

    return { 
        lat, 
        lon, 
        formattedAddress,
        addressInfo
    };
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get('address');

        // Validate required fields
        if (!address) {
            return NextResponse.json(
                { error: "Missing required field: address is required" },
                { status: 400 }
            );
        }

        // Geocode the address
        const result = await geocodeAddress(address);

        return NextResponse.json({
            success: true,
            coordinates: {
                lat: result.lat,
                lon: result.lon
            },
            formattedAddress: result.formattedAddress,
            addressComponents: result.addressInfo
        });

    } catch (error) {
        console.error('Geocoding error:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: error.message || "Failed to geocode address" 
            },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { address } = body;

        // Validate required fields
        if (!address) {
            return NextResponse.json(
                { error: "Missing required field: address is required" },
                { status: 400 }
            );
        }

        // Geocode the address
        const result = await geocodeAddress(address);

        return NextResponse.json({
            success: true,
            coordinates: {
                lat: result.lat,
                lon: result.lon
            },
            formattedAddress: result.formattedAddress,
            addressComponents: result.addressInfo
        });

    } catch (error) {
        console.error('Geocoding error:', error);
        
        return NextResponse.json(
            { 
                success: false,
                error: error.message || "Failed to geocode address" 
            },
            { status: 500 }
        );
    }
}
