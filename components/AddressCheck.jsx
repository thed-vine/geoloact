export default async function checkAddressExists(address) {
  const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN; // Must start with NEXT_PUBLIC_ to be usable in browser

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    address
  )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1&country=NG`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    return data.features && data.features.length > 0; // true if found
  } catch (error) {
    console.error("Error checking address:", error);
    return false;
  }
}
