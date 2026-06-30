// GET /api/metar?state=XX
// Latest ASOS/METAR observations for a US state via Iowa Environmental Mesonet.
// Each feature carries: station, name, tmpf, dwpf, sknt (wind kt), drct (wind dir),
// vsby, gust, alti, presentwx, utc_valid. Edge-cached for 5 minutes.
import { jsonResponse, errorResponse } from '../_lib/nws.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const state = (url.searchParams.get('state') || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) return errorResponse('Need state=XX (2-letter US state code)', 400);
  const network = `${state}_ASOS`;
  try {
    const res = await fetch(`https://mesonet.agron.iastate.edu/api/1/currents.geojson?network=${network}`, {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`IEM ${res.status}`);
    const data = await res.json();
    // Filter out stations with no temperature reading (offline / waiting for next report)
    const features = (data.features || []).filter(f => f.properties?.tmpf != null);
    return jsonResponse({ network, type: 'FeatureCollection', features });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
