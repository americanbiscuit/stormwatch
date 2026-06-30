// GET /api/nhc-storms
// Active tropical cyclones. Returns current storm positions (layer 2 of NHC MapServer)
// + forecast cones (any layer whose name ends with "Forecast Cone") + forecast tracks.
// During off-season (Dec-May Atlantic, Dec-Apr E. Pacific) this returns mostly empty.
import { jsonResponse, errorResponse } from '../_lib/nws.js';

const BASE = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer';

async function fetchLayer(layerId) {
  const url = `${BASE}/${layerId}/query?where=1%3D1&outFields=*&f=geojson`;
  const res = await fetch(url, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!res.ok) return null;
  return res.json();
}

export async function onRequestGet() {
  try {
    // 1. Get the layer manifest so we know which layer IDs are "Forecast Cone" / "Forecast Track" right now
    const manifestRes = await fetch(`${BASE}?f=json`, { cf: { cacheTtl: 3600, cacheEverything: true } });
    if (!manifestRes.ok) throw new Error(`NHC manifest ${manifestRes.status}`);
    const manifest = await manifestRes.json();
    const layers = manifest.layers || [];
    const coneIds = layers.filter(l => /Forecast Cone$/i.test(l.name)).map(l => l.id);
    const trackIds = layers.filter(l => /Forecast Track$/i.test(l.name)).map(l => l.id);
    const pointIds = layers.filter(l => /Forecast Points$/i.test(l.name)).map(l => l.id);

    // 2. Fetch in parallel: current positions + per-storm cones + tracks
    const [currentPositions, ...rest] = await Promise.all([
      fetchLayer(2),  // Seven-Day: Current Location (one feature per active storm)
      ...coneIds.map(id => fetchLayer(id)),
      ...trackIds.map(id => fetchLayer(id)),
      ...pointIds.map(id => fetchLayer(id)),
    ]);

    // 3. Merge cones/tracks/points into single FeatureCollections
    const slice = rest.slice;
    const conesEnd = coneIds.length;
    const tracksEnd = conesEnd + trackIds.length;
    const pointsEnd = tracksEnd + pointIds.length;
    const cones = mergeFeatures(rest.slice(0, conesEnd));
    const tracks = mergeFeatures(rest.slice(conesEnd, tracksEnd));
    const points = mergeFeatures(rest.slice(tracksEnd, pointsEnd));

    return jsonResponse({
      activeStormCount: (currentPositions?.features || []).length,
      currentPositions: currentPositions || { type: 'FeatureCollection', features: [] },
      cones, tracks, points,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

function mergeFeatures(results) {
  const features = [];
  for (const r of results) {
    if (r?.features) features.push(...r.features);
  }
  return { type: 'FeatureCollection', features };
}
