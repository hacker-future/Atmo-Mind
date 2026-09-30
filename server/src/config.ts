import path from "node:path";
import { fileURLToPath } from "node:url";

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** server/src/config.ts -> <project root> */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Resolved .env values (loaded by `node --env-file` or shell export). */
export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: num(process.env.PORT, 4000),

  /** Comma-separated list of allowed browser origins. "*" allows any. */
  corsOrigins: (process.env.CORS_ORIGINS ?? "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /** Where the static frontend build lives, if any. */
  staticDir: process.env.STATIC_DIR && process.env.STATIC_DIR.length > 0
    ? path.resolve(process.env.STATIC_DIR)
    : path.join(projectRoot, "dist"),

  /** Upstream */
  forecastUrl: process.env.OM_FORECAST_URL ?? "https://api.open-meteo.com/v1/forecast",
  geocodeUrl: process.env.OM_GEOCODE_URL ?? "https://geocoding-api.open-meteo.com/v1/search",
  reverseUrl: process.env.REVERSE_GEOCODE_URL ?? "https://api.bigdatacloud.net/data/reverse-geocode-client",
  upstreamTimeoutMs: num(process.env.UPSTREAM_TIMEOUT_MS, 8000),
  upstreamRetries: num(process.env.UPSTREAM_RETRIES, 2),

  /** Cache TTLs */
  weatherTtlMs: num(process.env.WEATHER_TTL_MS, 5 * 60 * 1000), // 5 min
  geocodeTtlMs: num(process.env.GEOCODE_TTL_MS, 24 * 60 * 60 * 1000), // 24 h
  cacheMaxEntries: num(process.env.CACHE_MAX_ENTRIES, 1000),

  /** Rate limiting */
  rateWindowMs: num(process.env.RATE_WINDOW_MS, 60_000),
  rateMax: num(process.env.RATE_MAX, 120),
} as const;

export const isProd = config.env === "production";
