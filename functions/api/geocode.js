// GET /api/geocode?q=city+name+or+zip
// Uses OpenStreetMap Nominatim (free, no key) — restricted to US for now to stay within NWS coverage
import { jsonResponse, errorResponse } from '../_lib/nws.js';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = '(stormwatch.pages.dev, tman@gchughes4.com)';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q');
  if (!q || q.length < 2) return errorResponse('Need q query param (min 2 chars)', 400);

  try {
    const params = new URLSearchParams({
      q,
      format: 'json',
      countrycodes: 'us,pr,vi,gu,as,mp',  // US + territories
      limit: '5',
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT },
      cf: { cacheTtl: 3600, cacheEverything: true },  // cache geocodes for 1 hr
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = await res.json();
    const results = data.map(r => ({
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      name: r.display_name,
      shortName: [r.address?.city || r.address?.town || r.address?.village || r.address?.county, r.address?.state, r.address?.postcode]
        .filter(Boolean).join(', '),
      type: r.type,
    }));
    return jsonResponse({ results });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
