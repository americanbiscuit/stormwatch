// GET /api/spc-outlook?day=1
// Returns SPC categorical convective outlook GeoJSON.
// Day 1 = layer 1, Day 2 = 9, Day 3 = 17 on the SPC_wx_outlks MapServer.
// Each feature includes: label (TSTM/MRGL/SLGT/ENH/MDT/HIGH), label2 (full name),
// fill, stroke (hex colors NWS publishes), valid, expire, issue, dn.
import { jsonResponse, errorResponse } from '../_lib/nws.js';

const DAY_LAYER = { 1: 1, 2: 9, 3: 17 };

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const day = parseInt(url.searchParams.get('day') || '1');
  const layerId = DAY_LAYER[day];
  if (!layerId) return errorResponse('day must be 1, 2, or 3', 400);

  const src = `https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer/${layerId}/query?where=1%3D1&outFields=*&f=geojson`;
  try {
    const res = await fetch(src, {
      cf: { cacheTtl: 300, cacheEverything: true },  // outlooks update every few hours
    });
    if (!res.ok) throw new Error(`SPC ${res.status}`);
    const data = await res.json();
    return jsonResponse({ day, ...data });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
