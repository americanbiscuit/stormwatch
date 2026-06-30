# Stormwatch

A free, professional-grade weather radar + forecast app. Built on free public data — no API keys, no paywalls, no ads. Personal use.

**Live:** https://stormwatch-kp8.pages.dev

## What it does

- **Live NEXRAD radar** with playback (past 2 hours + 30 min nowcast)
- **Click anywhere** for hourly + 7-day forecast at that point
- **Active NWS alerts** (tornado warnings, severe thunderstorms, flood watches, winter storm advisories — every alert NWS issues) shown as colored polygons + side panel
- **Search** by city, zip, or coordinates
- **Geolocation** — one tap to center on your spot
- **Layer toggles** — radar, alerts, dark map
- **Mobile-first** — works on phone, tablet, desktop

## Data sources (all free, all public)

| Layer | Source | License |
|---|---|---|
| Radar tiles | [RainViewer](https://www.rainviewer.com) (proxies NEXRAD) | Free |
| Forecasts + current obs | [NWS API](https://www.weather.gov/documentation/services-web-api) | Public domain |
| Active alerts | NWS API | Public domain |
| Geocoding | [OpenStreetMap Nominatim](https://nominatim.org) | ODbL |
| Map style | [CARTO Positron / Dark Matter](https://carto.com/attributions) | Free for non-commercial |
| Base map tiles | OSM via CARTO CDN | ODbL |

## Architecture

- **Frontend:** single-file HTML/CSS/JS, no build step, vanilla JS + MapLibre GL JS (CDN)
- **Backend:** Cloudflare Pages Functions proxy NWS calls (NWS requires User-Agent; CORS can be flaky from browsers)
- **Hosting:** Cloudflare Pages (free tier, global CDN)
- **No DB, no auth, no tracking**

## Deploy

```bash
npx wrangler pages deploy . --project-name=stormwatch --branch=main --commit-dirty=true
```

## Roadmap

**v1 (this):** Radar + alerts + forecast + search + geolocation
**v2:** SPC convective outlooks, watch boxes, lightning strikes (blitzortung)
**v3:** GOES satellite overlay, METAR surface obs, storm reports
**v4:** Direct NEXRAD Level II rendering, offline PWA, alert push notifications
