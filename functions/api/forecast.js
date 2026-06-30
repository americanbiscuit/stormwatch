// GET /api/forecast?lat=XX&lon=YY
// Returns: { current, hourly, daily, location } using NWS API
import { nwsFetch, jsonResponse, errorResponse } from '../_lib/nws.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get('lat'));
  const lon = parseFloat(url.searchParams.get('lon'));
  if (isNaN(lat) || isNaN(lon)) return errorResponse('Need lat and lon query params', 400);

  try {
    // 1. Get the grid point for this location
    const point = await nwsFetch(`/points/${lat.toFixed(4)},${lon.toFixed(4)}`);
    const props = point.properties || {};
    const office = props.gridId;
    const gridX = props.gridX;
    const gridY = props.gridY;
    const city = props.relativeLocation?.properties?.city;
    const state = props.relativeLocation?.properties?.state;

    if (!office) return errorResponse('Location not in NWS coverage area (US/territories only)', 404);

    // 2. Fetch forecast (7-day) and hourly in parallel
    const [forecast, hourly] = await Promise.allSettled([
      nwsFetch(`/gridpoints/${office}/${gridX},${gridY}/forecast`),
      nwsFetch(`/gridpoints/${office}/${gridX},${gridY}/forecast/hourly`),
    ]);

    const daily = forecast.status === 'fulfilled'
      ? forecast.value.properties.periods.slice(0, 14)  // 7 days × 2 periods (day + night)
      : [];
    const hourlyPeriods = hourly.status === 'fulfilled'
      ? hourly.value.properties.periods.slice(0, 24)
      : [];

    // 3. Get current conditions from nearest observation station
    let current = null;
    try {
      const stations = await nwsFetch(`/gridpoints/${office}/${gridX},${gridY}/stations`);
      const firstStation = stations.features?.[0]?.properties?.stationIdentifier;
      if (firstStation) {
        const obs = await nwsFetch(`/stations/${firstStation}/observations/latest`);
        const p = obs.properties || {};
        current = {
          temp: cToF(p.temperature?.value),
          dewpoint: cToF(p.dewpoint?.value),
          humidity: p.relativeHumidity?.value,
          windSpeed: msToMph(p.windSpeed?.value),
          windDir: p.windDirection?.value,
          windGust: msToMph(p.windGust?.value),
          conditions: p.textDescription,
          pressureMb: paToMb(p.barometricPressure?.value),
          visibility: mToMi(p.visibility?.value),
          icon: p.icon,
          station: firstStation,
          observedAt: p.timestamp,
        };
      }
    } catch (e) {
      // Best-effort; current obs are nice-to-have
    }

    return jsonResponse({
      location: { lat, lon, city, state, office, gridX, gridY },
      current,
      hourly: hourlyPeriods,
      daily,
    });
  } catch (e) {
    return errorResponse(e.message, 500);
  }
}

function cToF(c) { return c == null ? null : Math.round((c * 9/5 + 32) * 10) / 10; }
function msToMph(ms) { return ms == null ? null : Math.round(ms * 2.23694 * 10) / 10; }
function paToMb(pa) { return pa == null ? null : Math.round(pa / 100 * 10) / 10; }
function mToMi(m) { return m == null ? null : Math.round(m / 1609.34 * 10) / 10; }
