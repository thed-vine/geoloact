/**
 * Geolocation formatter utility.
 * Accepts either:
 *  - GeolocationPosition (success)
 *  - GeolocationPositionError (error)
 * Returns a normalized object consumed by GeoWatcher.
 *
 * No React hooks and no direct DOM access.
 */

/**
 * @typedef {Object} NormalizedSuccess
 * @property {'success'} type
 * @property {string} title
 * @property {string} message
 * @property {{
 *   latitude: number,
 *   longitude: number,
 *   accuracy?: number,
 *   altitude?: number | null,
 *   altitudeAccuracy?: number | null,
 *   heading?: number | null,
 *   speed?: number | null,
 * }} coords
 * @property {number} timestamp
 *
 * @typedef {Object} NormalizedError
 * @property {'error'} type
 * @property {string} title
 * @property {string} message
 *
 * @typedef {NormalizedSuccess | NormalizedError} NormalizedGeo
 */

const ERROR_MESSAGES = {
  1: 'User denied the request for Geolocation.', // PERMISSION_DENIED
  2: 'Location information is unavailable.',      // POSITION_UNAVAILABLE
  3: 'The request to get user location timed out.' // TIMEOUT
};

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function inRange(value, min, max) {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function isGeoPosition(input) {
  if (!input || typeof input !== 'object') return false;
  const c = input.coords;
  if (!c || typeof c !== 'object') return false;
  return inRange(c.latitude, -90, 90) && inRange(c.longitude, -180, 180);
}

function isGeoError(input) {
  if (!input || typeof input !== 'object') return false;
  // Browsers provide numeric code (1,2,3) and message
  return (isFiniteNumber(input.code) || typeof input.message === 'string');
}

/**
 * @param {GeolocationPosition | GeolocationPositionError | any} input
 * @returns {NormalizedGeo}
 */
export default function geolo(input) {
  // Success: strict validation of coordinates and normalization of numeric fields
  if (isGeoPosition(input)) {
    const { coords } = input;

    const latitude = Number(coords.latitude);
    const longitude = Number(coords.longitude);

    // Optional fields: keep only finite numbers, otherwise use null (for nullable props)
    const accuracy = isFiniteNumber(coords.accuracy) ? Number(coords.accuracy) : undefined;
    const altitude = isFiniteNumber(coords.altitude) ? Number(coords.altitude) : null;
    const altitudeAccuracy = isFiniteNumber(coords.altitudeAccuracy) ? Number(coords.altitudeAccuracy) : null;
    const heading = isFiniteNumber(coords.heading) ? Number(coords.heading) : null;
    const speed = isFiniteNumber(coords.speed) ? Number(coords.speed) : null;

    // Timestamp: prefer provided finite timestamp, else now
    const ts = isFiniteNumber(input.timestamp) ? Number(input.timestamp) : Date.now();

    const latStr = latitude.toString();
    const lonStr = longitude.toString();
    let msg = `Latitude: ${latStr}°, Longitude: ${lonStr}°`;
    if (typeof accuracy === 'number') {
      msg += ` (±${accuracy} m)`;
    }

    /** @type {NormalizedSuccess} */
    const success = {
      type: 'success',
      title: 'Location updated',
      message: msg,
      coords: {
        latitude,
        longitude,
        ...(typeof accuracy === 'number' ? { accuracy } : {}),
        altitude,
        altitudeAccuracy,
        heading,
        speed,
      },
      timestamp: ts,
    };

    return success;
  }

  // Error: map known codes to readable messages, fallback to provided message or generic one
  if (isGeoError(input)) {
    const code = isFiniteNumber(input.code) ? Number(input.code) : undefined;
    const fallback = typeof input.message === 'string' && input.message.trim().length > 0
      ? input.message
      : 'An unknown error occurred.';

    const message = (code && ERROR_MESSAGES[code]) ? ERROR_MESSAGES[code] : fallback;

    /** @type {NormalizedError} */
    const error = {
      type: 'error',
      title: 'Geolocation error',
      message,
    };
    return error;
  }

  // Fallback: unknown input shape
  return {
    type: 'error',
    title: 'Geolocation error',
    message: 'Unexpected response from Geolocation API.',
  };
}
