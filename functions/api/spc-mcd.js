// GET /api/spc-mcd
// Active SPC Mesoscale Discussions. These are forecaster-issued notes for evolving
// severe weather in the next 1-3 hours. Updated every ~15 min when active.
// Each feature: name ("MD 1396"), folderpath ("MD 1396 Active Till 1830 UTC"),
// popupinfo (URL to full text).
import { jsonResponse, errorResponse } from '../_lib/nws.js';

const SRC = 'https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/spc_mesoscale_discussion/MapServer/0/query?where=1%3D1&outFields=*&f=geojson';

export async function onRequestGet() {
  try {
    const res = await fetch(SRC, { cf: { cacheTtl: 120, cacheEverything: true } });
    if (!res.ok) throw new Error(`SPC MCD ${res.status}`);
    const data = await res.json();
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
