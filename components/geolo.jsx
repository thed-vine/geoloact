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
   * @param {GeolocationPosition | GeolocationPositionError | any} input
   * @returns {{
   *   type: 'success' | 'error',
   *   title: string,
   *   message: string,
   *   coords?: {
   *     latitude: number,
   *     longitude: number,
   *     accuracy?: number,
   *     altitude?: number | null,
   *     altitudeAccuracy?: number | null,
   *     heading?: number | null,
   *     speed?: number | null
   *   },
   *   timestamp?: number
   * }}
   */
  export default function geolo(input) {
    // Success case: looks like a GeolocationPosition (has coords with latitude/longitude)
    if (input && input.coords && typeof input.coords.latitude === 'number' && typeof input.coords.longitude === 'number') {
      const { coords, timestamp } = input;
      const msg = `Latitude: ${coords.latitude}, Longitude: ${coords.longitude}` +
        (typeof coords.accuracy === 'number' ? ` (±${Math.round(coords.accuracy)}m)` : '');

      return {
        type: 'success',
        title: 'Location updated',
        message: msg,
        coords: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude ?? null,
          altitudeAccuracy: coords.altitudeAccuracy ?? null,
          heading: coords.heading ?? null,
          speed: coords.speed ?? null,
        },
        timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      };
    }

    // Error case: map GeolocationPositionError codes to readable messages
    if (input && (typeof input.code === 'number' || typeof input.message === 'string')) {
      const code = input.code;
      let message;
      switch (code) {
        case 1: // PERMISSION_DENIED
          message = 'User denied the request for Geolocation.';
          break;
        case 2: // POSITION_UNAVAILABLE
          message = 'Location information is unavailable.';
          break;
        case 3: // TIMEOUT
          message = 'The request to get user location timed out.';
          break;
        default:
          message = input.message || 'An unknown error occurred.';
          break;
      }

      return {
        type: 'error',
        title: 'Geolocation error',
        message,
      };
    }

    // Fallback: unknown input
    return {
      type: 'error',
      title: 'Geolocation error',
      message: 'Unexpected response from Geolocation API.',
    };
  }