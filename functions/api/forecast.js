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
        const tempF = cToF(p.temperature?.value);
        const humidity = p.relativeHumidity?.value;
        const windMph = msToMph(p.windSpeed?.value);
        // Prefer NWS-published heatIndex / windChill (only one or neither is set at a time, depending on conditions).
        // Fall back to client-style computation so we always have something to show.
        const heatIdx = cToF(p.heatIndex?.value);
        const windChill = cToF(p.windChill?.value);
        const feelsLike = (heatIdx != null) ? heatIdx
                       : (windChill != null) ? windChill
                       : computeFeelsLike(tempF, humidity, windMph);
        current = {
          temp: tempF,
          feelsLike,
          dewpoint: cToF(p.dewpoint?.value),
          humidity,
          windSpeed: windMph,
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

// "Feels like" — heat index when hot+humid, wind chill when cold+windy, plain temp otherwise.
// Uses the NWS Rothfusz heat index regression and the NWS wind chill formula.
function computeFeelsLike(T, humidity, V) {
  if (T == null) return null;
  if (T <= 50 && V != null && V > 3) {
    const wc = 35.74 + 0.6215 * T - 35.75 * Math.pow(V, 0.16) + 0.4275 * T * Math.pow(V, 0.16);
    return Math.round(wc * 10) / 10;
  }
  if (T >= 80 && humidity != null && humidity >= 40) {
    let HI = -42.379 + 2.04901523 * T + 10.14333127 * humidity
      - 0.22475541 * T * humidity - 0.00683783 * T * T
      - 0.05481717 * humidity * humidity + 0.00122874 * T * T * humidity
      + 0.00085282 * T * humidity * humidity - 0.00000199 * T * T * humidity * humidity;
    if (humidity < 13 && T >= 80 && T <= 112) {
      HI -= ((13 - humidity) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (humidity > 85 && T >= 80 && T <= 87) {
      HI += ((humidity - 85) / 10) * ((87 - T) / 5);
    }
    return Math.round(HI * 10) / 10;
  }
  return T;
}
