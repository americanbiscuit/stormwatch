# Stormwatch

A free, professional-grade weather radar + forecast + severe-weather aggregator. Built on free public data — no API keys, no paywalls, no ads, no login. Personal use.

**Live:** https://stormwatch-kp8.pages.dev

## What it does

### Map view (`/`)
- **Live NEXRAD radar** with playback (RainViewer free tier — zoom 1-7, ~2hr history)
- **GOES-East satellite (IR)** via NASA GIBS — clouds rendered globally, day or night
- **Surface obs (METAR)** with temperature labels at every airport in the visible state
- **Active NWS alerts** — colored polygons by severity (extreme/severe/moderate/minor)
- **SPC Day 1/2/3 Convective Outlook** — color-coded severe risk areas (TSTM → HIGH) with a top-bar chip showing the highest current US risk
- **SPC probability layers** — tornado / hail / wind separate sub-layers, % chance polygons
- **Mesoscale Discussions** — SPC forecaster notes for evolving severe weather (next 1-3 hours)
- **Storm Reports (24hr)** — tornado / hail / wind / flood markers from spotters & officials
- **Active hurricanes** (NHC) — current position, forecast cone, forecast track
- **Click anywhere** → current conditions + hourly + 7-day + Area Forecast Discussion + Skew-T sounding link

### Weather dashboard (`/forecast.html?lat&lon`)
- Full weather detail for any point, no map. Clean Apple-Weather-style layout.

### Saved locations (`/saved.html`)
- Home, work, family — one-tap dashboard of forecast + active alerts (localStorage)

### All active alerts (`/alerts.html`)
- Full searchable feed of every NWS warning/watch/advisory in the country, filterable by severity

### Settings (`/settings.html`)
- Map style, layer defaults, opacity, severity surfacing thresholds, glossary

## Data sources (all free, all public)

| Layer | Source | License |
|---|---|---|
| Radar tiles | [RainViewer](https://www.rainviewer.com) (proxies NEXRAD) | Free, attribution |
| GOES-East satellite (IR) | [NASA GIBS WMTS](https://gibs.earthdata.nasa.gov/) | Public domain |
| Forecasts + current obs | [NWS API](https://www.weather.gov/documentation/services-web-api) | Public domain |
| Active alerts/warnings/watches | NWS `/alerts/active` | Public domain |
| Area Forecast Discussions | NWS `/products/types/AFD/locations/{wfo}` | Public domain |
| SPC Categorical Outlook (Day 1/2/3) | [NWS MapServer SPC_wx_outlks](https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer) | Public domain |
| SPC Tornado/Hail/Wind probability | Same MapServer, layers 3/5/7 | Public domain |
| SPC Mesoscale Discussions | [SPC MCDs MapServer](https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/spc_mesoscale_discussion/MapServer) | Public domain |
| NHC active tropical cyclones | [NHC tropical MapServer](https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather/MapServer) | Public domain |
| METAR surface obs (state-scoped) | [Iowa Environmental Mesonet](https://mesonet.agron.iastate.edu/) | Free, attribution |
| Local Storm Reports (24hr) | IEM `geojson/lsr.geojson` | Free, attribution |
| Geocoding (search) | [OpenStreetMap Nominatim](https://nominatim.org) | ODbL |
| Map style | [CARTO Positron / Dark Matter](https://carto.com/attributions) | Free for non-commercial |
| Base map tiles | OSM via CARTO CDN | ODbL |

## Pages Functions

- `/api/forecast?lat&lon` — current obs + hourly + 7-day from NWS
- `/api/alerts?lat&lon|area` — NWS active alerts with GeoJSON polygons
- `/api/discussion?lat&lon` — latest AFD for the WFO covering the point
- `/api/spc-outlook?day=1|2|3` — SPC categorical outlook GeoJSON
- `/api/spc-prob?type=tornado|hail|wind&day=1|2` — SPC probabilistic outlook
- `/api/spc-mcd` — active SPC Mesoscale Discussions
- `/api/storm-reports?hours=24` — 24hr Local Storm Reports
- `/api/nhc-storms` — active tropical cyclones (positions, cones, tracks)
- `/api/metar?state=XX` — current ASOS/METAR obs for a US state
- `/api/geocode?q=...` — Nominatim search

## Architecture

- **Frontend:** vanilla HTML/CSS/JS, no build step. MapLibre GL JS via CDN.
- **Backend:** Cloudflare Pages Functions proxy NWS / SPC / NHC / IEM (User-Agent injection + edge caching)
- **Storage:** browser localStorage. No DB, no auth, no tracking.
- **Hosting:** Cloudflare Pages free tier.

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
- **Skew-T** — vertical atmospheric profile from a balloon launch; shows temperature, dewpoint, and winds with height. The single most useful chart for thunderstorm prediction.

## Roadmap

- **v4 (next):** Lightning strikes (needs a self-hosted relay since Blitzortung forbids anonymous third-party proxying), HRRR model output overlays, full per-storm hurricane wind radii rendering, NWS push notifications for severe alerts at saved locations
- **v5:** Direct NEXRAD Level II decode (velocity + correlation coefficient → tornado debris signatures), in-browser Skew-T plotting with computed CAPE/CIN/helicity, river gauge overlay (USGS), full GOES band switcher (visible/IR/water vapor)
