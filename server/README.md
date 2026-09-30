# AtmoAi Backend

A dependency-light Express API that sits between the React app and Open-Meteo.
It adds **caching**, **rate limiting**, **retries with timeouts**, and moves the
**AI advisory engine** onto the server so clients get conclusions instead of raw numbers.

```
Browser ──▶ AtmoAi API ──▶ Open-Meteo / BigDataCloud
                │
                ├── TTL cache (in-flight de-duplication)
                ├── rate limiter
                └── AI advisory engine
```

## Quick start

```bash
# from the project root
cp .env.example .env          # optional — every value has a default

npm run build                 # build the frontend into dist/
npx tsx server/src/index.ts   # start the API on :4000
```

Then open **http://localhost:4000** — the API serves the built frontend and
exposes `/api/*`.

To make the React app actually use the backend (instead of calling Open-Meteo
directly from the browser), set `VITE_API_URL` **before** building:

```bash
VITE_API_URL=http://localhost:4000/api npm run build
npx tsx server/src/index.ts
```

Or put it in `.env` and run the dev server in a second terminal:

```bash
# terminal 1 — API
npx tsx server/src/index.ts

# terminal 2 — Vite dev server (reads VITE_API_URL from .env)
npm run dev
```

The app works with **no backend at all**, and it decides this at runtime rather
than build time. On load it probes `/api/health` on its own origin:

- **Served by the Express server** → the probe succeeds, and every request goes
  through the API. This is the fullstack mode — cached upstream calls, rate
  limiting, and AI conclusions computed server-side.
- **Served as a static bundle anywhere else** → the probe fails and the browser
  calls Open-Meteo directly, computing all AI conclusions locally.

Both paths return identical shapes and identical logic, so the same `dist/`
build works either way with no rebuild. The footer badge shows which mode is
active (`backend` / `direct`), as does the "AI generated · backend|local" tag on
the verdict tile. Setting `VITE_API_URL` skips the probe and pins a backend
explicitly (including cross-origin, subject to `CORS_ORIGINS`).

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness, uptime, upstream config, cache hit-rates |
| `GET` | `/api/activities` | The 10 activity profiles and their comfort thresholds |
| `GET` | `/api/geocode?q=` | City search |
| `GET` | `/api/reverse?lat=&lon=` | Reverse geocode |
| `GET` | `/api/weather?lat=&lon=&days=` | Normalised forecast (`?city=` also works) |
| `GET` | `/api/ai/now?lat=&lon=&unit=` | **Should I go out right now?** |
| `GET` | `/api/ai/plan?lat=&lon=&activity=&day=&unit=` | Verdict for a specific date |
| `GET` | `/api/ai/week?lat=&lon=&activity=&unit=` | Every day ranked for an activity |
| `GET` | `/api/ai/rain?lat=&lon=` | 24-hour rain outlook |

Every endpoint that needs a place accepts **either** `?lat=&lon=` **or**
`?city=London`, so you never have to geocode first.

### Examples

```bash
# Should I go out right now in Lisbon?
curl "localhost:4000/api/ai/now?city=Lisbon&unit=C"

# Is Saturday good for hiking in the Lake District?
curl "localhost:4000/api/ai/plan?city=Ambleside&activity=hike&day=5&unit=C"

# Which day this week is best for the beach?
curl "localhost:4000/api/ai/week?city=Barcelona&activity=beach&unit=C"

# Raw forecast, normalised
curl "localhost:4000/api/weather?lat=51.5072&lon=-0.1276&days=7"
```

### Response shape — `/api/ai/plan`

```jsonc
{
  "location": { "name": "Ambleside", "country": "United Kingdom", "latitude": 54.43, "longitude": -2.96 },
  "unit": "C",
  "activity": "hike",
  "dayIndex": 5,
  "verdict": {
    "score": 78,             // 0–100
    "label": "Good",         // Ideal | Good | Fair | Poor | Avoid
    "tone": "go",            // go | maybe | no
    "color": "#a78bfa",
    "headline": "Yes — saturday looks great for a hike.",
    "summary": "AtmoAi scores saturday at 78/100 for a hike. Conditions: partly cloudy, …",
    "reasons": ["Temperatures peak at 14° — right in the comfortable band for a hike.", "…"],
    "cautions": ["Rain probability reaches 62% around 3 PM."],
    "gear": ["Packable rain shell", "Sturdy footwear", "Trail snacks"],
    "window": { "startLabel": "8 AM", "endLabel": "12 PM", "hours": 5, "avg": 83 },
    "evals": [{ "hourLabel": "8 AM", "score": 86, "prob": 12, "temp": 11.2, "…": "…" }]
  }
}
```

## How the AI verdict works — and how it explains itself

There is no LLM call. The engine is deterministic and auditable, which means it
is instant, free, and never hallucinates a number.

1. **Every hour of the selected day is scored 0–100** against the activity's
   profile across five weighted axes:
   - temperature comfort (28%) — trapezoidal falloff outside the ideal band
   - precipitation (32%) — 75% probability + 25% expected volume, scaled by the
     activity's rain tolerance
   - wind (14%) — gentle until ~45% of the activity's limit, then degrades
   - UV (8%) — only penalised above a per-activity threshold
   - daylight (18%) — beach days are useless at night; road trips are not
2. **The day score** is the best contiguous `durationH` stretch (82%) blended
   with the single best hour (18%), so a good morning isn't ruined by counting
   the whole night.
3. **The best window** is the longest run of hours within 16 points of the peak.
4. **The summary is composed** from the actual numbers — temperature band, peak
   rain probability and its timing, wind, daylight span, cautions, and a packing
   list derived from the day's extremes.

### The explanation

A verdict that just says "Good, 78/100" isn't useful. Every verdict therefore
carries a `factors` array that decomposes the score into its five axes, each with
its own 0–100 score, its weight, the points it contributed, a `good`/`ok`/`bad`
status, and a sentence written from the real numbers:

```jsonc
{
  "key": "temperature",
  "label": "Temperature",
  "weight": 0.28,
  "score": 82,
  "contribution": 23,
  "status": "good",
  "detail": "14° to 19° in this window, against an ideal 8°–22° band for a hike."
}
```

Because `score = Σ axisScore × weight`, the contributions always sum back to the
headline score — the smoke test asserts this invariant, so the breakdown can
never drift out of sync with the number it claims to explain.

The frontend renders this as the **first** tile on the dashboard: the verdict and
headline up top, then the narrative reasoning, the best time window, cautions,
the factor bars, and the packing list.

## Configuration

All values are optional. See [`.env.example`](../.env.example).

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `NODE_ENV` | `development` | |
| `CORS_ORIGINS` | `*` | Comma-separated allow-list |
| `STATIC_DIR` | `../dist` | Serve a built SPA; unset to disable |
| `UPSTREAM_TIMEOUT_MS` | `8000` | Hard timeout per upstream attempt |
| `UPSTREAM_RETRIES` | `2` | Retries on network/5xx only |
| `WEATHER_TTL_MS` | `300000` | Forecast cache lifetime |
| `GEOCODE_TTL_MS` | `86400000` | Place names rarely change |
| `CACHE_MAX_ENTRIES` | `1000` | LRU eviction beyond this |
| `RATE_WINDOW_MS` / `RATE_MAX` | `60000` / `120` | Per-IP sliding window |

## Design notes

- **In-flight de-duplication.** Two clients requesting the same coordinates while
  an upstream call is still running share one request. This matters for burst
  traffic far more than the cache itself.
- **Retries are conservative.** Only network errors and 5xx responses retry;
  a 4xx is surfaced immediately with the upstream reason.
- **Cache headers.** `/api/weather` sets `Cache-Control` to match the server-side
  TTL, so CDNs and the browser agree on freshness.
- **No database.** Everything is in-process and stateless, so the service scales
  horizontally and restarts clean.
- **Graceful shutdown.** `SIGINT`/`SIGTERM` drain in-flight requests before exit.
- **Security headers** (`nosniff`, `Referrer-Policy`, `X-Frame-Options`) and
  `x-powered-by` disabled.
