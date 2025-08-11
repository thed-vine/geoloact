export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const OSM_MAP_ENDPOINT = 'https://api.openstreetmap.org/api/0.6/map';

function parseBBox(bboxStr) {
  if (typeof bboxStr !== 'string') return null;
  const parts = bboxStr.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (!nums.every((n) => Number.isFinite(n))) return null;
  return nums; // [minLon, minLat, maxLon, maxLat]
}

function validateBBox(nums) {
  const [minLon, minLat, maxLon, maxLat] = nums;
  if (!(minLon < maxLon && minLat < maxLat)) {
    return 'Invalid bbox: expected min_lon < max_lon and min_lat < max_lat';
  }
  if (minLon < -180 || maxLon > 180) {
    return 'Longitude values must be within [-180, 180]';
  }
  if (minLat < -90 || maxLat > 90) {
    return 'Latitude values must be within [-90, 90]';
  }
  // OSM API /map enforces fairly small bounding boxes. Enforce a conservative limit of <= 0.25 deg².
  const areaDeg2 = (maxLon - minLon) * (maxLat - minLat);
  if (areaDeg2 > 0.25) {
    return 'Bounding box too large. Reduce area to <= 0.25 square degrees.';
  }
  return null;
}

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const bboxParam = searchParams.get('bbox');
  if (!bboxParam) {
    return jsonError('Missing required query parameter: bbox={min_lon},{min_lat},{max_lon},{max_lat}');
  }

  const bbox = parseBBox(bboxParam);
  if (!bbox) {
    return jsonError('Invalid bbox format. Expected 4 comma-separated numbers: min_lon,min_lat,max_lon,max_lat');
  }

  const validationMsg = validateBBox(bbox);
  if (validationMsg) {
    return jsonError(validationMsg);
  }

  const url = `${OSM_MAP_ENDPOINT}?bbox=${bbox.join(',')}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/xml, text/xml;q=0.9, */*;q=0.1',
        // Provide a simple UA per OSM guidelines
        'User-Agent': 'geoloact-app/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
      // next: { revalidate: 0 } // not needed due to cache: 'no-store' and export const revalidate = 0
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: 'Upstream OSM error', status: upstream.status, detail: text.slice(0, 500) }),
        {
          status: upstream.status,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Stream the XML back to the client for efficiency with large payloads
    const contentType = upstream.headers.get('content-type') || 'application/xml; charset=utf-8';
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return jsonError('Upstream request timed out', 504);
    }
    return jsonError(`Upstream fetch failed: ${err && err.message ? err.message : String(err)}`, 502);
  }
}
