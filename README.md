# AtmoAi

**AI weather intelligence — live conditions, a spoken verdict on whether you should go outside, and date-by-date planning for outings, trips and travel.**

AtmoAi shows you the weather, then tells you what to do about it. A deterministic advisory engine weighs temperature, rain, wind, UV and daylight hour by hour, produces a 0–100 score, and explains *how it reached that number* — no black box, no LLM hallucination, no API key required.

---

## Table of contents

- [What it does](#what-it-does)
- [Screens](#screens)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Quick start](#quick-start)
- [Running the fullstack backend](#running-the-fullstack-backend)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [How the AI verdict works](#how-the-ai-verdict-works)
- [Location coverage](#location-coverage)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Design decisions](#design-decisions)
- [Limitations & notes](#limitations--notes)
- [License](#license)

---

## What it does

### Live conditions
| Metric | Detail |
|---|---|
| **Temperature** | Current reading, feels-like, daily high/low, humidity |
| **Wind speed** | Instrument-style compass, animated needle, cardinal bearing, gusts |
| **Rain forecast** | Interactive 24-hour chart — smoothed probability curve, expected mm bars, hover scrubbing, peak chance, rain start time |
| **UV intensity** | Semicircular 0–11+ gauge with needle, semantic label, protection tip, daily peak |
| **Sunrise & sunset** | Solar arc that animates elapsed daylight, a sun positioned by the current time, a moon after dark, and a countdown to sunset |
| **24-hour strip** | Hourly temperature, condition icon, and rain probability bar for every hour |

### AI verdict — "Should you go out?"
The first thing on the dashboard. A full-width banner giving:
- **Score ring** (0–100), verdict pill (*Ideal / Good / Fair / Poor / Avoid*), and a plain-language headline
- **The reasoning** — narrative bullets citing real data
- **How the score was built** — a per-axis breakdown where contributions always sum back to the headline score
- Best time window, cautions, and a generated packing list

### Trip planner
Pick any of **10 activities** (going out, walk, run, cycling, hiking, picnic, beach, sightseeing, road trip, photography) and any of the next **7 days**. AtmoAi returns the verdict for that specific date, an hour-by-hour suitability chart, the best window, a packing list, and a ranking of *every* day so you can see which date is actually best for the trip.

### Location picker
A cascading **Country → State/UT → District → Location** picker, with India modelled at full depth. The header search box filters the same dataset locally.

---

## Screens

| Section | Contents |
|---|---|
| **Hero** | Location picker, live clock, search, °C/°F toggle, and the dashboard bento grid |
| **Trip planner** | Activity + date selection, AI conclusion, hour-by-hour suitability, packing list, day ranking |
| **7-day outlook** | Temperature range bars, rain probability, UV peak per day |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 7 |
| **Styling** | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| **Animation** | Framer Motion 13 |
| **Icons** | Lucide React |
| **Backend** | Node.js, Express 5, TypeScript (run with `tsx`) |
| **Weather data** | [Open-Meteo](https://open-meteo.com/) — free, no API key |
| **Geocoding** | Open-Meteo Geocoding API + BigDataCloud reverse geocoding |

No database. No API keys. No paid services.

---

## Project structure

```
.
├── index.html                  # App shell, fonts, meta
├── .env.example                # Every environment variable, documented
│
├── src/
│   ├── App.tsx                 # Hero composition, top bar, section routing
│   ├── index.css               # Tailwind 4 theme tokens, keyframes, glass helpers
│   │
│   ├── components/
│   │   ├── Dashboard.tsx       # Bento grid — verdict first, then metrics
│   │   ├── AiVerdict.tsx       # "Should you go out?" banner + factor breakdown
│   │   ├── TripPlanner.tsx     # Activity/date selection + AI conclusions
│   │   ├── LocationPicker.tsx  # Cascading country → state → district → place
│   │   ├── SearchBar.tsx       # Local search over the same geo tree
│   │   ├── RainForecast.tsx    # Interactive 24h probability chart
│   │   ├── WindCompass.tsx     # Compass dial with animated needle
│   │   ├── UvGauge.tsx         # Semicircular UV gauge
│   │   ├── SunArc.tsx          # Solar arc with live sun position
│   │   ├── HourlyStrip.tsx     # Scrollable 24-hour strip
│   │   ├── DailyOutlook.tsx    # 7-day range bars
│   │   ├── Background.tsx      # Day/night sky, aurora, starfield, grain
│   │   └── Counter.tsx         # Animated number count-up
│   │
│   ├── hooks/
│   │   └── useWeather.ts       # Data fetching, geolocation, units, clock
│   │
│   └── lib/
│       ├── api.ts              # Runtime backend detection + unified client
│       ├── weather.ts          # Direct Open-Meteo client, WMO codes, units
│       ├── advisor.ts          # AI engine (browser copy — used standalone)
│       └── geo.ts              # Country → state → district → location tree
│
└── server/                     # Optional Express backend
    ├── README.md               # Backend-specific documentation
    ├── tsconfig.json
    ├── smoke.ts                # 50-assertion end-to-end smoke test
    └── src/
        ├── index.ts            # Express app, static serving, graceful shutdown
        ├── config.ts           # Env resolution with defaults
        ├── routes.ts           # /api/* endpoints
        ├── middleware.ts       # Rate limiter, logging, error handler
        └── lib/
            ├── cache.ts        # TTL cache + in-flight de-duplication
            ├── http.ts         # Timeout + bounded retries
            ├── weather.ts      # Open-Meteo client, validation, geocoding
            └── advisor.ts      # AI engine (server copy)
```

---

## Quick start

```bash
git clone <your-repo-url>
cd atmoai
npm install

# frontend only — talks to Open-Meteo directly from the browser
npm run dev
```

Open <http://localhost:5173>. That's it — no `.env`, no API key, no backend needed.

### Production build

```bash
npm run build      # emits a single self-contained dist/index.html
npm run preview    # serve the build locally
```

The build uses `vite-plugin-singlefile`, so `dist/index.html` is one portable file with JS and CSS inlined. Drop it on any static host.

---

## Running the fullstack backend

The backend adds caching, rate limiting, retries with timeouts, and moves the AI engine server-side.

```bash
# 1. Build the frontend
npm run build

# 2. Start the API (serves dist/ and /api/* on port 4000)
npx tsx server/src/index.ts
```

Open <http://localhost:4000>.

### How mode detection works

The app decides its mode **at runtime**, not build time. On load it probes `/api/health` on its own origin:

| Where it's served | Probe result | Behaviour |
|---|---|---|
| By the Express server | Succeeds | All requests go through the API — cached, rate limited, AI computed server-side |
| As a static bundle | Fails | Browser calls Open-Meteo directly, AI computed locally |

Both paths use identical logic and identical shapes, so **the same `dist/` build works either way** with no rebuild. The footer badge shows the active mode (`backend` / `direct`), and the verdict tile is tagged `AI generated · backend` or `· local`.

To pin a backend explicitly (including cross-origin), set `VITE_API_URL` before building:

```bash
VITE_API_URL=http://localhost:4000/api npm run build
```

### Verify the backend

```bash
npx tsx server/src/index.ts   # terminal 1
npx tsx server/smoke.ts       # terminal 2 — prints its own totals
```

The smoke test makes real HTTP calls against a running server and covers:
- **Happy paths** — every endpoint, forecast shape, 168 hourly records, 7-day window
- **Input validation** — out-of-range coordinates, day index beyond the forecast window, missing params, unknown routes, short geocode queries
- **Cache behaviour** — second identical call returns `meta.cached: true` and is faster
- **Unit conversion** — °F/mph actually changes the narrative text
- **Explanation invariants** — five factors present, weights sum to exactly 100%, contributions sum back to the score, every factor has a real detail sentence

---

## Configuration

All values are optional — every one has a default. Copy `.env.example` to `.env` to override.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend port |
| `NODE_ENV` | `development` | |
| `CORS_ORIGINS` | `*` | Comma-separated allowed browser origins |
| `STATIC_DIR` | `../dist` | Serve a built SPA; unset to disable |
| `UPSTREAM_TIMEOUT_MS` | `8000` | Hard timeout per upstream attempt |
| `UPSTREAM_RETRIES` | `2` | Retries on network/5xx only |
| `WEATHER_TTL_MS` | `300000` | Forecast cache lifetime (5 min) |
| `GEOCODE_TTL_MS` | `86400000` | Place-name cache (24 h) |
| `CACHE_MAX_ENTRIES` | `1000` | LRU eviction beyond this |
| `RATE_WINDOW_MS` | `60000` | Rate-limit sliding window |
| `RATE_MAX` | `120` | Requests per window per IP |
| `VITE_API_URL` | *(unset)* | Pin the frontend to a backend; unset for runtime auto-detect |

---

## API reference

Base URL: `http://localhost:4000`

Every place-based endpoint accepts **either** `?lat=&lon=` **or** `?city=London`, so you never have to geocode first.

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service metadata + endpoint index |
| `GET` | `/api/health` | Liveness, uptime, upstream config, cache hit-rates |
| `GET` | `/api/activities` | The 10 activity profiles and their comfort thresholds |
| `GET` | `/api/geocode?q=` | City search |
| `GET` | `/api/reverse?lat=&lon=` | Reverse geocode |
| `GET` | `/api/weather?lat=&lon=&days=` | Normalised forecast, plus rain outlook and hourly window |
| `GET` | `/api/ai/now?lat=&lon=&unit=` | **Should I go out right now?** |
| `GET` | `/api/ai/plan?…&activity=hike&day=2` | Verdict for a specific date |
| `GET` | `/api/ai/week?…&activity=picnic` | Every day ranked for an activity |
| `GET` | `/api/ai/rain?lat=&lon=` | 24-hour rain outlook |

### Example

```bash
# Should I go out right now in Bengaluru?
curl "localhost:4000/api/ai/now?city=Bengaluru&unit=C"

# Is Saturday good for hiking near Manali?
curl "localhost:4000/api/ai/plan?city=Manali&activity=hike&day=5&unit=C"

# Which day this week is best for the beach in Goa?
curl "localhost:4000/api/ai/week?city=Panaji&activity=beach&unit=C"
```

<details>
<summary><strong>Response shape — <code>/api/ai/plan</code></strong></summary>

```jsonc
{
  "location": { "name": "Manali", "country": "India", "latitude": 32.2432, "longitude": 77.1892 },
  "unit": "C",
  "activity": "hike",
  "dayIndex": 5,
  "verdict": {
    "score": 78,
    "label": "Good",
    "tone": "go",                       // go | maybe | no
    "color": "#a78bfa",
    "headline": "Yes — saturday looks great for a hike.",
    "summary": "AtmoAi scores saturday at 78/100 for a hike. Conditions: partly cloudy, 6° to 17° …",
    "reasons": ["Temperatures peak at 17° — right in the comfortable band for a hike.", "…"],
    "cautions": ["Rain probability reaches 62% around 3 PM."],
    "gear": ["Packable rain shell", "Sturdy footwear", "Trail snacks"],
    "window": { "startLabel": "8 AM", "endLabel": "12 PM", "hours": 5, "avg": 83 },
    "factors": [
      {
        "key": "temperature",
        "label": "Temperature",
        "weight": 0.28,
        "score": 82,
        "contribution": 23,
        "status": "good",
        "detail": "14° to 19° in this window, against an ideal 8°–22° band for a hike."
      }
      // … rain, wind, uv, daylight
    ],
    "evals": [{ "hourLabel": "8 AM", "score": 86, "prob": 12, "temp": 11.2 }]
  }
}
```

</details>

---

## How the AI verdict works

There is **no LLM call**. The engine is deterministic and auditable — instant, free, and it cannot hallucinate a number.

### 1. Every hour is scored 0–100

Each hour of the selected day is evaluated against the activity's profile across five weighted axes:

| Axis | Weight | Model |
|---|---|---|
| Temperature | 28% | Trapezoidal falloff outside the activity's ideal band, collapsing to zero at the hard limits |
| Precipitation | 32% | 75% probability + 25% expected volume, scaled by the activity's rain tolerance |
| Wind | 14% | Full marks below ~45% of the activity's limit, then linear degradation |
| UV | 8% | Unpenalised below a per-activity threshold, then damped |
| Daylight | 18% | A beach day scores 0.12 at night; a road trip scores 0.82 |

Every activity defines its own `ideal` and `hard` temperature bands, `maxWind`, `rainWeight`, `uvLimit`, `needsDaylight`, and `durationH`. That's why a 30 °C day scores *Ideal* for a beach trip and *Avoid* for a run.

### 2. The day score

The best contiguous `durationH` stretch (82%) blended with the single best hour (18%) — so a beautiful morning isn't ruined by counting the whole night.

### 3. The best window

The longest run of hours scoring within 16 points of the daily peak.

### 4. The explanation

Because `score = Σ axisScore × weight`, the five factor contributions always **sum back to the headline score**. The smoke test asserts this invariant, so the breakdown can never drift out of sync with the number it claims to explain.

The summary text is then composed from the actual values — temperature band, peak rain probability and its timing, wind, daylight span, cautions, and a packing list derived from the day's extremes.

---

## Location coverage

### India — full depth
All **28 states and 8 union territories**, **195 districts**, and **600+ specific locations** with real coordinates.

The picker drills four levels deep:

```
India → Kerala → Idukki → Munnar
India → Maharashtra → Mumbai Suburban → Borivali
India → Uttarakhand → Chamoli → Badrinath
India → Delhi (NCT) → New Delhi → Connaught Place
```

### Other countries — two levels
United States, United Kingdom, UAE, Australia, Singapore, Canada, Japan, Germany, modelled as *region → locations*. The District dropdown disables and reads "No district level" rather than showing a redundant duplicate.

### Outside the tree
The app still auto-detects your location via browser geolocation and reverse geocoding, so any coordinate works even if it isn't in the curated list.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server on `:5173` (standalone mode) |
| `npm run build` | Production build → single-file `dist/index.html` |
| `npm run preview` | Serve the production build |
| `npx tsx server/src/index.ts` | Start the Express backend on `:4000` |
| `npx tsx server/smoke.ts` | Run the API smoke test (needs a running server) |
| `npx tsc -p server/tsconfig.json --noEmit` | Type-check the backend |

---

## Deployment

### Frontend only (simplest)
The build is a single self-contained HTML file — deploy `dist/` to any static host: GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3.

```bash
npm run build
# upload dist/
```

The app runs in `direct` mode and works completely standalone.

### Fullstack
Any Node host works — Render, Railway, Fly.io, a VPS, Docker.

```bash
npm ci
npm run build
npx tsx server/src/index.ts    # or compile server/ and run the JS
```

Set `PORT` and `CORS_ORIGINS` as needed. The server serves `dist/` at `/` and the API at `/api/*`. No database or persistent volume is required.

<details>
<summary><strong>Dockerfile</strong></summary>

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npx", "tsx", "server/src/index.ts"]
```

</details>

---

## Design decisions

**Backend-optional by construction.** The AI engine exists in two places — `src/lib/advisor.ts` (browser) and `server/src/lib/advisor.ts` (server). This is deliberate: it lets the frontend work with no server at all, and lets the UI render instantly from local computation, then upgrade to the server's verdict if one exists. A backend outage degrades gracefully instead of blanking the trip planner.

**Runtime mode detection.** Rather than baking the API URL in at build time, the app probes `/api/health` on its own origin. One build works in both modes.

**Deterministic AI.** An LLM would be slow, cost money, and could invent a UV index. This engine is a fixed set of formulas, so it's instant, free, reproducible, and — most importantly — *explainable*.

**In-flight request de-duplication.** Two clients requesting the same coordinates while an upstream call is running share one request. Under burst traffic this matters far more than the cache itself.

**Conservative retries.** Only network errors and 5xx responses retry. A 4xx is surfaced immediately with the upstream's own reason string, so a bad request never silently retries.

**No database.** Everything is in-process and stateless, so the service scales horizontally and restarts clean.

---

## Limitations & notes

- **The backend is not type-checked by `npm run build`.** The root `tsconfig.json` only includes `src/`, so `tsc` never runs against `server/`. Run `npx tsc -p server/tsconfig.json --noEmit` before shipping backend changes.
- **The AI engine is intentionally duplicated** across `src/lib/advisor.ts` and `server/src/lib/advisor.ts`. If you change the scoring model, **update both files** — they must stay in sync. (The cleanest fix is extracting a shared workspace package.)
- **India's district data is curated, not exhaustive.** A complete dataset would be 700+ districts and thousands of towns — too large to inline. Every state and UT is covered, with the most populous and most-visited districts prioritised and 2–3 notable locations in each. Coordinates are accurate to roughly a kilometre, well within a weather grid cell. To extend it, replace `src/lib/geo.ts` with JSON generated from a source like the India Post pincode dataset or LGD, keeping the same `GeoCountry → GeoRegion → GeoDistrict → GeoPlace` shape.
- **Forecast horizon is 7 days** (Open-Meteo's reliable free tier, up to 16 available by raising `days`).
- **The advisory engine is a comfort model, not a safety system.** It has no knowledge of severe weather warnings, air quality, or local hazards. Always check official warnings before travelling.
- **No test framework is installed.** Verification is the `server/smoke.ts` script, which makes real HTTP calls against a running server.

---

## License

MIT — see [LICENSE](LICENSE).
