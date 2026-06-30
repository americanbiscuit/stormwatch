// Shared NWS API helper. NWS requires a User-Agent header with contact info,
// and they sometimes block default browser UAs — so all NWS calls go through
// Pages Functions instead of direct fetch from the browser.

const NWS_BASE = 'https://api.weather.gov';
const USER_AGENT = '(stormwatch.pages.dev, tman@gchughes4.com)';

export async function nwsFetch(path) {
  const url = path.startsWith('http') ? path : NWS_BASE + path;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/geo+json,application/ld+json,application/json',
    },
    // Cache at the edge for a short window — NWS forecast data updates every ~hour
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) {
    throw new Error(`NWS ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  return res.json();
}

export function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}
