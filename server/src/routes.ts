import { Router } from "express";
import {
  cacheStats,
  getWeather,
  hourlyWindow,
  parseDays,
  resolveLocation,
  reverseGeocode,
  searchCities,
} from "./lib/weather.js";
import {
  ACTIVITIES,
  findActivity,
  goOutNow,
  parseUnit,
  planDay,
  rainOutlook,
  rankWeek,
} from "./lib/advisor.js";
import { rateLimit } from "./middleware.js";
import { config } from "./config.js";

export const api = Router();

/** Everything under /api is rate limited. */
api.use(rateLimit);

/* ================================================================
   Meta
================================================================ */

api.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "atmoai-api",
    version: "1.0.0",
    env: config.env,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    upstream: {
      forecast: config.forecastUrl,
      geocode: config.geocodeUrl,
      timeoutMs: config.upstreamTimeoutMs,
      retries: config.upstreamRetries,
    },
    cache: cacheStats(),
  });
});

api.get("/activities", (_req, res) => {
  res.json({
    count: ACTIVITIES.length,
    activities: ACTIVITIES.map(({ id, label, icon, blurb, ideal, maxWind, durationH, needsDaylight }) => ({
      id,
      label,
      icon,
      blurb,
      idealC: ideal,
      maxWindKmh: maxWind,
      typicalHours: durationH,
      needsDaylight,
    })),
  });
});

/* ================================================================
   Geocoding
================================================================ */

api.get("/geocode", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      res.json({ query: q, count: 0, results: [] });
      return;
    }
    const results = await searchCities(q);
    res.json({ query: q, count: results.length, results });
  } catch (err) {
    next(err);
  }
});

api.get("/reverse", async (req, res, next) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: "bad_request", message: "lat and lon are required numbers" });
      return;
    }
    res.json(await reverseGeocode(lat, lon));
  } catch (err) {
    next(err);
  }
});

/* ================================================================
   Forecast — the drop-in replacement for the frontend's data source
================================================================ */

api.get("/weather", async (req, res, next) => {
  try {
    const loc = await resolveLocation(req.query);
    const days = parseDays(req.query.days, 7);
    const data = await getWeather(loc, days);
    res
      .setHeader("Cache-Control", `public, max-age=${Math.round(config.weatherTtlMs / 1000)}`)
      .json({ ...data, rain: rainOutlook(data), hours: hourlyWindow(data, 24) });
  } catch (err) {
    next(err);
  }
});

/* ================================================================
   AI advisories
================================================================ */

api.get("/ai/now", async (req, res, next) => {
  try {
    const loc = await resolveLocation(req.query);
    const unit = parseUnit(req.query.unit);
    const data = await getWeather(loc);
    res.json({ location: loc, unit, verdict: goOutNow(data, unit) });
  } catch (err) {
    next(err);
  }
});

api.get("/ai/plan", async (req, res, next) => {
  try {
    const loc = await resolveLocation(req.query);
    const unit = parseUnit(req.query.unit);
    const activity = findActivity(req.query.activity);
    const dayIndex = Math.min(Math.max(Number(req.query.day ?? 0) || 0, 0), 15);
    const data = await getWeather(loc);

    if (dayIndex >= data.daily.days.length) {
      res.status(400).json({
        error: "bad_request",
        message: `day index ${dayIndex} is outside the ${data.daily.days.length}-day forecast window`,
      });
      return;
    }

    res.json({ location: loc, unit, activity: activity.id, dayIndex, verdict: planDay(data, dayIndex, activity, unit) });
  } catch (err) {
    next(err);
  }
});

api.get("/ai/week", async (req, res, next) => {
  try {
    const loc = await resolveLocation(req.query);
    const unit = parseUnit(req.query.unit);
    const activity = findActivity(req.query.activity);
    const data = await getWeather(loc);
    const ranked = rankWeek(data, activity, unit);
    res.json({
      location: loc,
      unit,
      activity: { id: activity.id, label: activity.label },
      best: ranked[0] ?? null,
      days: ranked,
    });
  } catch (err) {
    next(err);
  }
});

api.get("/ai/rain", async (req, res, next) => {
  try {
    const loc = await resolveLocation(req.query);
    const data = await getWeather(loc);
    res.json({ location: loc, outlook: rainOutlook(data), hours: hourlyWindow(data, 24) });
  } catch (err) {
    next(err);
  }
});
