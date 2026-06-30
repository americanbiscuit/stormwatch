# Stormwatch

A free, professional-grade weather radar + forecast + severe-weather aggregator. Built on free public data — no API keys, no paywalls, no ads, no login. Personal use.

**Live:** https://stormwatch-kp8.pages.dev

## What it does

- **Live NEXRAD radar** with playback (RainViewer free tier — zoom 1-7, ~2hr history)
- **Click anywhere** for current conditions + hourly + 7-day forecast
- **Active NWS alerts** as colored polygons (severity-coded extreme/severe/moderate/minor)
- **SPC Day 1 Convective Outlook** — color-coded severe risk areas (TSTM → HIGH), with the highest current risk surfaced as a top-bar chip
- **Mesoscale Discussions** — SPC forecaster notes for evolving severe weather in the next 1-3 hours
- **Storm Reports (24hr)** — tornadoes, hail, wind damage from spotters and officials (color-coded markers)
- **Area Forecast Discussion** — the plain-English narrative your local NWS office writes explaining the forecast
- **Saved locations** (localStorage) — one-tap dashboard of forecast + active alerts for home/work/family
- **Search** by city, zip, or coordinates
- **Geolocation** — one-tap centers + auto-pulls forecast
- **Layer toggles** — radar, alerts, outlook, MCD, reports, dark/light map
- **Legend** explaining all map colors
- **Mobile-first dark theme** with safe-area insets

## Data sources (all free, all public)

| Layer | Source | License |
|---|---|---|
| Radar tiles | [RainViewer](https://www.rainviewer.com) (proxies NEXRAD) | Free, attribution |
| Forecasts + current obs | [NWS API](https://www.weather.gov/documentation/services-web-api) | Public domain |
| Active alerts/warnings/watches | NWS API `/alerts/active` | Public domain |
| Area Forecast Discussions (AFD) | NWS API `/products/types/AFD/locations/{wfo}` | Public domain |
| SPC Day 1 Categorical Outlook | [NWS MapServer](https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer) | Public domain |
| SPC Mesoscale Discussions | [NWS MapServer (SPC MCDs)](https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/spc_mesoscale_discussion/MapServer) | Public domain |
| Local Storm Reports (24hr) | [Iowa Environmental Mesonet GeoJSON](https://mesonet.agron.iastate.edu/geojson/lsr.geojson?hours=24) | Free, attribution |
| Geocoding (search) | [OpenStreetMap Nominatim](https://nominatim.org) | ODbL |
| Map style | [CARTO Positron / Dark Matter](https://carto.com/attributions) | Free for non-commercial |
| Base map tiles | OSM via CARTO CDN | ODbL |

## Architecture

- **Frontend:** multi-page vanilla HTML/CSS/JS, no build step. MapLibre GL JS via CDN.
- **Pages:** `index.html` (radar/map), `saved.html` (saved locations), `alerts.html` (full alerts feed), `settings.html` (prefs + glossary)
- **Backend:** Cloudflare Pages Functions proxy NWS / SPC / IEM endpoints (required for User-Agent injection + CORS handling). Cached at the edge.
- **Storage:** browser `localStorage` for saved locations, view position, and prefs. No DB, no auth, no tracking.
- **Hosting:** Cloudflare Pages free tier.

## Functions

- `/api/forecast?lat&lon` — current obs + hourly + 7-day from NWS
- `/api/alerts?lat&lon|area` — NWS active alerts (warnings, watches, advisories) with GeoJSON polygons
- `/api/discussion?lat&lon` — latest Area Forecast Discussion for the WFO covering that point
- `/api/spc-outlook?day=1` — SPC categorical convective outlook as GeoJSON (TSTM/MRGL/SLGT/ENH/MDT/HIGH)
- `/api/spc-mcd` — active SPC Mesoscale Discussions as GeoJSON
- `/api/storm-reports?hours=24` — 24hr Local Storm Reports as GeoJSON
- `/api/geocode?q=...` — city/zip search via Nominatim

## Deploy

```bash
npx wrangler pages deploy . --project-name=stormwatch --branch=main --commit-dirty=true
```

## Glossary

- **Reflectivity (radar)** — how strongly precipitation reflects the radar beam. Higher = heavier rain or hail.
- **Convective Outlook** — SPC's daily forecast of severe thunderstorm potential. Levels: *TSTM* (general thunder), *MRGL* (1/5), *SLGT* (2/5), *ENH* (3/5), *MDT* (4/5), *HIGH* (5/5).
- **Watch vs Warning** — a *watch* means conditions favor severe weather over a wide area; a *warning* means severe weather is happening or imminent in a small area.
- **Mesoscale Discussion (MCD)** — SPC forecaster's short-term analysis of an evolving threat, usually preceding watch issuance.
- **Local Storm Report (LSR)** — verified report of severe weather (tornado, hail size, wind damage) from a spotter, official, or the public.
- **AFD (Area Forecast Discussion)** — your local NWS office's plain-English explanation of the forecast reasoning.

## Roadmap

- **v3:** Lightning strikes (Blitzortung/community), GOES satellite (self-hosted tiles), surface obs (METAR clustering), hurricane tracks (NHC), river gauges (USGS)
- **v4:** Direct NEXRAD Level II decode (velocity + correlation coefficient products), Skew-T sounding plots, HRRR model output overlays, push notifications for severe alerts at saved locations
