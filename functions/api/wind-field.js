// GET /api/wind-field?south=&west=&north=&east=&grid=30
// Returns a {grid x grid} GeoJSON-ish array of {lat, lon, u, v, speed} wind samples
// across the requested bounding box. Built server-side so we're not bound by
// browser URL length limits (a 900-point lat/lon list won't fit in one query string).
//
// Source: Open-Meteo `forecast` endpoint. We pass `models=best_match` so US points
// resolve to HRRR (3 km native), Europe to ICON / AROME, rest of world to GFS / ECMWF.
// That's the same model lineup Apple Weather's WeatherKit uses under the hood.
import { jsonResponse, errorResponse } from '../_lib/nws.js';

const MAX_GRID = 28;  // 28*28 = 784 points = 3 batches at 300 per call; stays under Open-Meteo's rate limit
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const south = parseFloat(url.searchParams.get('south'));
  const west  = parseFloat(url.searchParams.get('west'));
  const north = parseFloat(url.searchParams.get('north'));
  const east  = parseFloat(url.searchParams.get('east'));
  const grid  = Math.min(MAX_GRID, Math.max(4, parseInt(url.searchParams.get('grid') || '24')));
  if ([south, west, north, east].some(Number.isNaN)) {
    return errorResponse('Need south, west, north, east floats', 400);
  }
  if (south >= north || west >= east) {
    return errorResponse('Bad bounds (need south<north, west<east)', 400);
  }

  // Build a {grid x grid} list of sample points, then ask Open-Meteo for all of them
  // in one batched call. (Their endpoint supports comma-separated arrays for both
  // latitude and longitude; up to ~1000 coordinate pairs per request.)
  const lats = [], lons = [];
  const latStep = (north - south) / (grid - 1);
  const lonStep = (east  - west)  / (grid - 1);
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      lats.push((south + i * latStep).toFixed(3));
      lons.push((west  + j * lonStep).toFixed(3));
    }
  }

  // Open-Meteo rejects URLs over ~8KB AND rate-limits ~10 req/min on the free
  // tier. Larger batches = fewer requests = fewer rate-limit hits. 350 points
  // per call keeps the URL well under 8KB while needing only 2-3 calls for
  // even our densest grids.
  const BATCH = 350;
  const batches = [];
  for (let i = 0; i < lats.length; i += BATCH) {
    batches.push({ lats: lats.slice(i, i + BATCH), lons: lons.slice(i, i + BATCH) });
  }

  async function fetchBatch(b) {
    const params = new URLSearchParams({
      latitude: b.lats.join(','),
      longitude: b.lons.join(','),
      current: 'wind_speed_10m,wind_direction_10m',
      wind_speed_unit: 'mph',
      models: 'best_match',
      timeformat: 'unixtime',
    });
    const r = await fetch(`${OPEN_METEO}?${params.toString()}`, {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
    const d = await r.json();
    return Array.isArray(d) ? d : [d];
  }

  try {
    const results = await Promise.all(batches.map(fetchBatch));
    const arr = results.flat();

    // Convert to flat {lat, lon, u, v, speed} array in row-major order (i*grid + j)
    const points = [];
    for (let n = 0; n < arr.length; n++) {
      const c = arr[n]?.current;
      const lat = parseFloat(lats[n]);
      const lon = parseFloat(lons[n]);
      if (!c || c.wind_speed_10m == null) {
        points.push({ lat, lon, u: 0, v: 0, speed: 0 });
        continue;
      }
      const dirRad = (c.wind_direction_10m || 0) * Math.PI / 180;
      const speed = c.wind_speed_10m;
      // Met convention: direction is where wind comes FROM.
      // To get the going-TO vector: u = -speed*sin(dir), v = -speed*cos(dir)
      points.push({
        lat, lon,
        u: -speed * Math.sin(dirRad),
        v: -speed * Math.cos(dirRad),
        speed,
      });
    }

    return jsonResponse({ grid, bounds: { south, west, north, east }, points });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
