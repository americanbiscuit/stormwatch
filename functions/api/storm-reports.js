// GET /api/storm-reports?hours=24
// Local Storm Reports (LSRs) for the past N hours, sourced from Iowa Environmental Mesonet's
// real-time parse of the NWS LSR feed. Updated every 5 minutes.
// Each feature props: type (T=tornado, H=hail, A/D=wind, F=flood, ...), typetext, magnitude,
// city, state, county, valid, source, remark, wfo.
import { jsonResponse, errorResponse } from '../_lib/nws.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const hours = Math.min(parseInt(url.searchParams.get('hours') || '24'), 48);
  try {
    const res = await fetch(`https://mesonet.agron.iastate.edu/geojson/lsr.geojson?hours=${hours}`, {
      cf: { cacheTtl: 180, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`IEM ${res.status}`);
    const data = await res.json();
    return jsonResponse(data);
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
