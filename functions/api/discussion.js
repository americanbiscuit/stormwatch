// GET /api/discussion?lat=X&lon=Y
// Returns the latest NWS Area Forecast Discussion (AFD) for the WFO that covers (lat, lon).
// AFDs are the forecaster's narrative reasoning — the most insightful thing NWS publishes.
// Flow: /points/lat,lon -> office (e.g. EAX) -> /products/types/AFD/locations/{office} -> latest -> /products/{id}.
import { nwsFetch, jsonResponse, errorResponse } from '../_lib/nws.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get('lat'));
  const lon = parseFloat(url.searchParams.get('lon'));
  if (isNaN(lat) || isNaN(lon)) return errorResponse('Need lat and lon', 400);
  try {
    const point = await nwsFetch(`/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
    const office = point.properties?.gridId;
    if (!office) return errorResponse('No NWS office for that location', 404);
    const list = await nwsFetch(`/products/types/AFD/locations/${office}`);
    const items = list['@graph'] || [];
    if (!items.length) return jsonResponse({ office, items: [], product: null });
    const latest = items[0];
    const product = await nwsFetch(`/products/${latest.id}`);
    return jsonResponse({
      office,
      officeName: point.properties?.cwa,
      issued: product.issuanceTime,
      productText: product.productText,
      id: latest.id,
      prevIssuances: items.slice(1, 6).map(i => ({ id: i.id, issuanceTime: i.issuanceTime })),
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}
