import { useEffect, useState } from "react";

/**
 * Unified data client.
 *
 * - If `VITE_API_URL` is set, every call goes through the AtmoAi backend,
 *   which adds caching, rate limiting and server-side AI advisories.
 * - If it isn't set, the browser talks to Open-Meteo directly and all AI
 *   conclusions are computed locally (no backend required).
 *
 * Both paths return the same shapes, so components never care which is active.
 */

import {
  fetchWeather as fetchDirect,
  mockWeather,
  reverseGeocode as reverseDirect,
  searchCities as searchDirect,
  type Location,
  type WeatherData,
} from "./weather";

/** Vite injects `import.meta.env`, but its types aren't in this tsconfig. */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
type MetaEnv = ImportMeta & { env?: ImportMetaEnv };

/** Explicitly configured backend, if any. Empty string means "same origin". */
const CONFIGURED_BASE = ((import.meta as MetaEnv).env?.VITE_API_URL ?? "").replace(/\/$/, "");
const HAS_CONFIGURED = CONFIGURED_BASE.length > 0;

export type BackendMode = "backend" | "direct";

/** Resolved once, then cached. `null` while the probe is still in flight. */
let resolvedMode: BackendMode | null = null;
let probing: Promise<BackendMode> | null = null;

/**
 * Probe for an AtmoAi backend.
 *
 * When the frontend is served by the Express server (the fullstack case) the
 * API lives at the same origin, so a plain relative `/api/health` works. When
 * it is served as a static bundle anywhere else the probe fails and we fall
 * back to calling Open-Meteo straight from the browser.
 */
async function probe(): Promise<BackendMode> {
  const base = CONFIGURED_BASE; // "" → same origin
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    return res.ok ? "backend" : "direct";
  } catch {
    return "direct";
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve (and memoise) whether a backend is available. */
export function backendMode(): Promise<BackendMode> {
  if (resolvedMode) return Promise.resolve(resolvedMode);
  if (!probing) {
    probing = (HAS_CONFIGURED ? Promise.resolve("backend" as BackendMode) : probe()).then((m) => {
      resolvedMode = m;
      return m;
    });
  }
  return probing;
}

/** Await this before any request so the first fetch already uses the right path. */
async function useBackend(): Promise<boolean> {
  return (await backendMode()) === "backend";
}

/* ================================================================
   Low-level helper
================================================================ */

async function apiGet<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = qs.toString() ? `${CONFIGURED_BASE}${path}?${qs}` : `${CONFIGURED_BASE}${path}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = String(body.message);
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

const withTimeout = <T>(p: Promise<T>, ms = 9000): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timed out")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

/* ================================================================
   Weather
================================================================ */

interface WeatherEnvelope extends WeatherData {
  rain?: unknown;
  hours?: unknown;
}

export async function getWeather(loc: Location, days = 7): Promise<WeatherData> {
  if (await useBackend()) {
    const env = await withTimeout(
      apiGet<WeatherEnvelope>("/weather", {
        lat: loc.latitude.toFixed(4),
        lon: loc.longitude.toFixed(4),
        days,
      }),
    );
    // the backend guarantees the core shape; keep only the fields the UI reads
    return {
      utcOffsetSeconds: env.utcOffsetSeconds,
      timezone: env.timezone,
      timezoneAbbrev: env.timezoneAbbrev,
      current: env.current,
      daily: env.daily,
      hourly: env.hourly,
    };
  }
  return fetchDirect(loc);
}

/* ================================================================
   Geocoding
================================================================ */

export async function searchCities(q: string): Promise<Location[]> {
  if (await useBackend()) {
    const r = await withTimeout(apiGet<{ results: Location[] }>("/geocode", { q }));
    return r.results ?? [];
  }
  return searchDirect(q);
}

export async function reverseGeocode(lat: number, lon: number): Promise<Location> {
  if (await useBackend()) {
    return withTimeout(apiGet<Location>("/reverse", { lat, lon }));
  }
  return reverseDirect(lat, lon);
}

/* ================================================================
   AI advisories — served by the backend when available
================================================================ */

export interface AiVerdict {
  score: number;
  label: string;
  color: string;
  tone: "go" | "maybe" | "no";
  headline: string;
  reasons: string[];
  cautions: string[];
  gear: string[];
  summary: string;
  evals: {
    iso: string;
    hourLabel: string;
    score: number;
    prob: number;
    temp: number;
  }[];
  window: { startISO: string; endISO: string; startLabel: string; endLabel: string; hours: number; avg: number } | null;
  dateLabel: string;
  uvMax: number;
  probMax: number;
  mmTotal: number;
  tempMin: number;
  tempMax: number;
  windMax: number;
  activity?: { id: string; label: string; icon: string };
  activityLabel?: string;
  [k: string]: unknown;
}

export async function aiGoOutNow(loc: Location, unit: string): Promise<AiVerdict | null> {
  if (!(await useBackend())) return null;
  try {
    const r = await withTimeout(
      apiGet<{ verdict: AiVerdict }>("/ai/now", {
        lat: loc.latitude.toFixed(4),
        lon: loc.longitude.toFixed(4),
        unit,
      }),
    );
    return r.verdict;
  } catch {
    return null;
  }
}

export async function aiPlanDay(
  loc: Location,
  activity: string,
  day: number,
  unit: string,
): Promise<AiVerdict | null> {
  if (!(await useBackend())) return null;
  try {
    const r = await withTimeout(
      apiGet<{ verdict: AiVerdict }>("/ai/plan", {
        lat: loc.latitude.toFixed(4),
        lon: loc.longitude.toFixed(4),
        activity,
        day,
        unit,
      }),
    );
    return r.verdict;
  } catch {
    return null;
  }
}

export interface RankedDay {
  index: number;
  date: string;
  label: string;
  short: string;
  score: number;
  verdict: string;
  tone: "go" | "maybe" | "no";
  tempMin: number;
  tempMax: number;
  probMax: number;
  uvMax: number;
}

export async function aiWeek(loc: Location, activity: string, unit: string): Promise<RankedDay[] | null> {
  if (!(await useBackend())) return null;
  try {
    const r = await withTimeout(
      apiGet<{ days: RankedDay[] }>("/ai/week", {
        lat: loc.latitude.toFixed(4),
        lon: loc.longitude.toFixed(4),
        activity,
        unit,
      }),
    );
    return r.days ?? null;
  } catch {
    return null;
  }
}

/* ================================================================
   React binding
================================================================ */

/** Resolves to "backend" or "direct" once the probe finishes (null while pending). */
export function useBackendMode(): BackendMode | null {
  const [mode, setMode] = useState<BackendMode | null>(null);
  useEffect(() => {
    let alive = true;
    backendMode().then((m) => {
      if (alive) setMode(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return mode;
}

/* ================================================================
   Offline safety net
================================================================ */

export { mockWeather };
