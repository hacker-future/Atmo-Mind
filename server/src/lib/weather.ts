import { config } from "../config.js";
import { getJson, HttpError } from "./http.js";
import { TtlCache } from "./cache.js";

/* ================================================================
   Public contract — mirrors the frontend's WeatherData exactly
================================================================ */

export interface Location {
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  population?: number;
  elevation?: number;
  timezone?: string;
  latitude: number;
  longitude: number;
}

const CARDINALS = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
export const cardinal = (deg: number): string => CARDINALS[Math.round(deg / 22.5) % 16];

export interface WeatherData {
  utcOffsetSeconds: number;
  timezone: string;
  timezoneAbbrev: string;
  current: {
    time: string;
    temperature: number;
    feelsLike: number;
    humidity: number;
    isDay: boolean;
    code: number;
    windSpeed: number;
    windDirection: number;
    windGusts: number;
    uv: number;
    precipitation: number;
  };
  daily: {
    days: string[];
    sunrise: string[];
    sunset: string[];
    max: number[];
    min: number[];
    uvMax: number[];
    codes: number[];
    precipSum: number[];
    precipProbMax: number[];
  };
  hourly: {
    time: string[];
    temp: number[];
    codes: number[];
    isDay: number[];
    precipProb: number[];
    precip: number[];
    uv: number[];
    wind: number[];
  };
  /** server-only metadata */
  meta: {
    fetchedAt: string;
    cached: boolean;
    location: Location;
  };
}

export interface HourPoint {
  iso: string;
  temp: number;
  code: number;
  day: boolean;
  isNow: boolean;
  idx: number;
  precipProb: number;
  precip: number;
  uv: number;
  wind: number;
}

/* ================================================================
   Validation
================================================================ */

const LAT = /^-?([0-8]?\d|90)(\.\d+)?$/;
const LON = /^-?((1?[0-7]\d)|180)(\.\d+)?$/;

export function parseCoord(raw: unknown, kind: "lat" | "lon"): number {
  const n = Number(raw);
  if (raw === undefined || raw === null || raw === "" || !Number.isFinite(n)) {
    throw new HttpError(400, `Missing or invalid "${kind}" coordinate`);
  }
  const test = kind === "lat" ? LAT.test(String(n)) : LON.test(String(n));
  if (!test) throw new HttpError(400, `"${kind}" is out of range (${kind === "lat" ? "-90…90" : "-180…180"})`);
  return n;
}

/** Bounded, de-duplicated numeric list — used to clamp `days`. */
export function parseDays(raw: unknown, fallback = 7): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(16, Math.max(1, Math.round(n)));
}

/* ================================================================
   Time helpers — local ISO strings are treated as UTC so that all
   date arithmetic stays in a single frame (same trick the UI uses).
================================================================ */

export const parseLocalIso = (s: string): Date => new Date(s.length === 16 ? `${s}:00Z` : `${s}Z`);

export const shiftedNowMs = (utcOffsetSeconds: number): number => Date.now() + utcOffsetSeconds * 1000;

export const fmt = (d: Date, opts: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(d);

/* ================================================================
   Caches
================================================================ */

const weatherCache = new TtlCache<WeatherData>(config.weatherTtlMs, config.cacheMaxEntries);
const geocodeCache = new TtlCache<Location[]>(config.geocodeTtlMs, config.cacheMaxEntries);
const reverseCache = new TtlCache<Location>(config.geocodeTtlMs, config.cacheMaxEntries);

export const cacheStats = () => ({
  weather: weatherCache.stats(),
  geocode: geocodeCache.stats(),
  reverse: reverseCache.stats(),
  inflight: TtlCache.inflightCount,
});

/* ================================================================
   Forecast
================================================================ */

const HOURLY_VARS = [
  "temperature_2m",
  "weather_code",
  "uv_index",
  "is_day",
  "precipitation_probability",
  "precipitation",
  "wind_speed_10m",
].join(",");

const CURRENT_VARS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "precipitation",
].join(",");

const DAILY_VARS = [
  "sunrise",
  "sunset",
  "temperature_2m_max",
  "temperature_2m_min",
  "uv_index_max",
  "weather_code",
  "precipitation_sum",
  "precipitation_probability_max",
].join(",");

/** Round-trip-safe key so identical requests share a cache entry. */
const weatherKey = (lat: number, lon: number, days: number): string =>
  `${lat.toFixed(3)},${lon.toFixed(3)},${days}`;

export async function getWeather(loc: Location, days = 7): Promise<WeatherData> {
  const key = weatherKey(loc.latitude, loc.longitude, days);

  const { value, cached } = await weatherCache.wrap(key, async () => {
    const url =
      `${config.forecastUrl}?latitude=${loc.latitude.toFixed(4)}&longitude=${loc.longitude.toFixed(4)}` +
      `&current=${CURRENT_VARS}&hourly=${HOURLY_VARS}&daily=${DAILY_VARS}` +
      `&timezone=auto&forecast_days=${days}`;

    const j = await getJson<Record<string, any>>(url);

    const hourlyTime: string[] = j.hourly?.time ?? [];

    // resolve the current UV from the hourly series (hourly always carries uv_index)
    let hourIdx = 0;
    if (hourlyTime.length > 0 && j.current?.time) {
      const cur = parseLocalIso(String(j.current.time)).getTime();
      const start = parseLocalIso(hourlyTime[0]).getTime();
      hourIdx = Math.max(
        0,
        Math.min(hourlyTime.length - 1, Math.floor((cur - start) / 3_600_000)),
      );
    }

    const data: WeatherData = {
      utcOffsetSeconds: j.utc_offset_seconds ?? 0,
      timezone: j.timezone ?? "UTC",
      timezoneAbbrev: j.timezone_abbreviation ?? "",
      current: {
        time: j.current?.time ?? "",
        temperature: j.current?.temperature_2m ?? 0,
        feelsLike: j.current?.apparent_temperature ?? j.current?.temperature_2m ?? 0,
        humidity: j.current?.relative_humidity_2m ?? 0,
        isDay: (j.current?.is_day ?? 1) === 1,
        code: j.current?.weather_code ?? 0,
        windSpeed: j.current?.wind_speed_10m ?? 0,
        windDirection: j.current?.wind_direction_10m ?? 0,
        windGusts: j.current?.wind_gusts_10m ?? 0,
        uv:
          typeof j.current?.uv_index === "number"
            ? j.current.uv_index
            : Number(j.hourly?.uv_index?.[hourIdx] ?? 0),
        precipitation: j.current?.precipitation ?? 0,
      },
      daily: {
        days: j.daily?.time ?? [],
        sunrise: j.daily?.sunrise ?? [],
        sunset: j.daily?.sunset ?? [],
        max: j.daily?.temperature_2m_max ?? [],
        min: j.daily?.temperature_2m_min ?? [],
        uvMax: j.daily?.uv_index_max ?? [],
        codes: j.daily?.weather_code ?? [],
        precipSum: j.daily?.precipitation_sum ?? [],
        precipProbMax: j.daily?.precipitation_probability_max ?? [],
      },
      hourly: {
        time: hourlyTime,
        temp: j.hourly?.temperature_2m ?? [],
        codes: j.hourly?.weather_code ?? [],
        isDay: j.hourly?.is_day ?? [],
        precipProb: j.hourly?.precipitation_probability ?? [],
        precip: j.hourly?.precipitation ?? [],
        uv: j.hourly?.uv_index ?? [],
        wind: j.hourly?.wind_speed_10m ?? [],
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        cached: false,
        location: loc,
      },
    };

    if (data.daily.days.length === 0 || data.hourly.time.length === 0) {
      throw new HttpError(502, "Upstream returned an empty forecast");
    }
    return data;
  });

  return { ...value, meta: { ...value.meta, cached, location: loc } };
}

/** Slice the hourly series forward from the location's current hour. */
export function hourlyWindow(data: WeatherData, count = 24): HourPoint[] {
  const { time, temp, codes, isDay, precipProb, precip, uv, wind } = data.hourly;
  if (time.length === 0) return [];
  const nowMs = shiftedNowMs(data.utcOffsetSeconds);
  let idx = 0;
  for (let i = 0; i < time.length; i++) {
    if (parseLocalIso(time[i]).getTime() <= nowMs) idx = i;
    else break;
  }
  const out: HourPoint[] = [];
  for (let i = 0; i < count && idx + i < time.length; i++) {
    const k = idx + i;
    out.push({
      iso: time[k],
      temp: temp[k],
      code: codes[k],
      day: isDay[k] === 1,
      isNow: i === 0,
      idx: k,
      precipProb: precipProb[k] ?? 0,
      precip: precip[k] ?? 0,
      uv: uv[k] ?? 0,
      wind: wind[k] ?? 0,
    });
  }
  return out;
}

/* ================================================================
   Geocoding
================================================================ */

export async function searchCities(q: string): Promise<Location[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  return geocodeCache.wrap(`q:${query.toLowerCase()}`, async () => {
    const url =
      `${config.geocodeUrl}?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
    const j = await getJson<{ results?: any[] }>(url);
    return (j.results ?? []).map((r) => ({
      name: String(r.name ?? "Unknown"),
      admin1: r.admin1,
      country: r.country,
      country_code: r.country_code,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      population: r.population,
      elevation: r.elevation,
      timezone: r.timezone,
    })) as Location[];
  }).then((r) => r.value);
}

export async function reverseGeocode(lat: number, lon: number): Promise<Location> {
  return reverseCache.wrap(`${lat.toFixed(3)},${lon.toFixed(3)}`, async () => {
    const url = `${config.reverseUrl}?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const j = await getJson<Record<string, any>>(url);
    return {
      name: j.city || j.locality || j.principalSubdivision || "Current Location",
      admin1: j.principalSubdivision,
      country: j.countryName,
      country_code: j.countryCode,
      latitude: lat,
      longitude: lon,
    } as Location;
  }).then((r) => r.value);
}

/** Convenience: accept ?lat&lon or ?city to resolve a location. */
export async function resolveLocation(query: {
  lat?: unknown;
  lon?: unknown;
  city?: unknown;
}): Promise<Location> {
  if (query.city) {
    const hits = await searchCities(String(query.city));
    if (hits.length === 0) throw new HttpError(404, `No place found matching "${String(query.city)}"`);
    return hits[0];
  }
  const lat = parseCoord(query.lat, "lat");
  const lon = parseCoord(query.lon, "lon");
  return { name: "Pinned location", latitude: lat, longitude: lon };
}
