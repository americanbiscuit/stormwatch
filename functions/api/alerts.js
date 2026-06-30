// GET /api/alerts?lat=XX&lon=YY — alerts active for a point (with polygons)
// GET /api/alerts?area=XX — alerts active for a state (e.g. ?area=KS)
// GET /api/alerts — all active US alerts
import { nwsFetch, jsonResponse, errorResponse } from '../_lib/nws.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const area = url.searchParams.get('area');

  let path = '/alerts/active';
  if (lat && lon) path += `?point=${parseFloat(lat).toFixed(4)},${parseFloat(lon).toFixed(4)}`;
  else if (area) path += `?area=${encodeURIComponent(area.toUpperCase())}`;

  try {
    const data = await nwsFetch(path);
    // Return simplified shape: id, event, severity, urgency, headline, description, areaDesc, polygon, expires, sent
    const alerts = (data.features || []).map(f => {
      const p = f.properties || {};
      return {
        id: p.id || f.id,
        event: p.event,
        severity: p.severity,         // Extreme | Severe | Moderate | Minor | Unknown
        urgency: p.urgency,           // Immediate | Expected | Future | Past | Unknown
        certainty: p.certainty,
        headline: p.headline,
        description: p.description,
        instruction: p.instruction,
        areaDesc: p.areaDesc,
        sent: p.sent,
        effective: p.effective,
        expires: p.expires,
        ends: p.ends,
        senderName: p.senderName,
        geometry: f.geometry,         // GeoJSON Polygon/MultiPolygon, may be null
      };
    });
    // Sort by severity (Extreme first) and then by sent time desc
    const severityRank = { 'Extreme': 0, 'Severe': 1, 'Moderate': 2, 'Minor': 3, 'Unknown': 4 };
    alerts.sort((a, b) => {
      const sa = severityRank[a.severity] ?? 5;
      const sb = severityRank[b.severity] ?? 5;
      if (sa !== sb) return sa - sb;
      return (b.sent || '').localeCompare(a.sent || '');
    });
    return jsonResponse({ count: alerts.length, alerts });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
