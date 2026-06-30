// GET /api/spc-prob?type=tornado|hail|wind&day=1
// SPC Day 1 probabilistic outlook for a specific hazard type.
// Layer mapping on SPC_wx_outlks MapServer:
//   Day 1: 3 = Tornado prob, 5 = Hail prob, 7 = Wind prob
//   Day 2: 11 = Tornado prob, 13 = Hail prob, 15 = Wind prob
// Each feature has fill/stroke colors and a probability label.
import { jsonResponse, errorResponse } from '../_lib/nws.js';

const LAYER_MAP = {
  1: { tornado: 3, hail: 5, wind: 7 },
  2: { tornado: 11, hail: 13, wind: 15 },
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const day = parseInt(url.searchParams.get('day') || '1');
  const type = (url.searchParams.get('type') || '').toLowerCase();
  const layerId = LAYER_MAP[day]?.[type];
  if (!layerId) return errorResponse('type must be tornado|hail|wind, day must be 1 or 2', 400);

  const src = `https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer/${layerId}/query?where=1%3D1&outFields=*&f=geojson`;
  try {
    const res = await fetch(src, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!res.ok) throw new Error(`SPC ${res.status}`);
    return jsonResponse({ day, type, ...(await res.json()) });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
