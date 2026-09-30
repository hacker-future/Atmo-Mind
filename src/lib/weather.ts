import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";

/* ================================================================
   Types
================================================================ */

export type Unit = "C" | "F";

export interface Location {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface WeatherData {
  utcOffsetSeconds: number;
  timezone: string;
  timezoneAbbrev: string;
  current: {
    time: string;
    temperature: number; // °C
    feelsLike: number; // °C
    humidity: number; // %
    isDay: boolean;
    code: number; // WMO code
    windSpeed: number; // km/h
    windDirection: number; // deg
    windGusts: number; // km/h
    uv: number;
    precipitation: number; // mm now
  };
  daily: {
    days: string[]; // yyyy-mm-dd
    sunrise: string[]; // local ISO
    sunset: string[];
    max: number[]; // °C
    min: number[]; // °C
    uvMax: number[];
    codes: number[];
    precipSum: number[]; // mm
    precipProbMax: number[]; // %
  };
  hourly: {
    time: string[];
    temp: number[]; // °C
    codes: number[];
    isDay: number[];
    precipProb: number[]; // %
    precip: number[]; // mm
    uv: number[];
    wind: number[]; // km/h
  };
}

/** A single resolved hour, sliced forward from "now" at the location. */
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
   Open-Meteo fetch (free, keyless)
================================================================ */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchWeather(loc: Location): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: loc.latitude.toFixed(4),
    longitude: loc.longitude.toFixed(4),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation",
    hourly:
      "temperature_2m,weather_code,uv_index,is_day,precipitation_probability,precipitation,wind_speed_10m",
    daily:
      "sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max,weather_code,precipitation_sum,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "7",
  });

  const res = await fetch(`${FORECAST_URL}?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  const j = await res.json();

  // Derive current UV from the hourly series (hourly always carries uv_index).
  const hourlyTime: string[] = j.hourly?.time ?? [];
  let hourIdx = 0;
  if (hourlyTime.length > 0 && j.current?.time) {
    const cur = parseLocalIso(String(j.current.time)).getTime();
    const start = parseLocalIso(hourlyTime[0]).getTime();
    hourIdx = Math.max(0, Math.min(hourlyTime.length - 1, Math.floor((cur - start) / 3_600_000)));
  }
  const uv: number =
    typeof j.current?.uv_index === "number" ? j.current.uv_index : Number(j.hourly?.uv_index?.[hourIdx] ?? 0);

  return {
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
      uv,
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
  };
}

/* ================================================================
   Rain analysis helpers
================================================================ */

/** Slice the hourly series forward from the location's current hour. */
export function hourlyWindow(data: WeatherData, count = 24): HourPoint[] {
  const { time, temp, codes, isDay, precipProb, precip } = data.hourly;
  if (time.length === 0) return [];
  const nowMs = Date.now() + data.utcOffsetSeconds * 1000;
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
      uv: data.hourly.uv[k] ?? 0,
      wind: data.hourly.wind[k] ?? 0,
    });
  }
  return out;
}

export interface RainOutlook {
  /** probability (%) for the next hour */
  nextHourProb: number;
  /** peak probability (%) across the window */
  peakProb: number;
  /** hours until the first likely rain, or null if none in window */
  hoursToRain: number | null;
  /** local ISO of that first likely rain hour */
  rainStartISO: string | null;
  /** total mm expected across the window */
  totalMm: number;
  /** short human summary */
  headline: string;
}

export function rainOutlook(hours: HourPoint[]): RainOutlook {
  if (hours.length === 0) {
    return {
      nextHourProb: 0,
      peakProb: 0,
      hoursToRain: null,
      rainStartISO: null,
      totalMm: 0,
      headline: "No data available",
    };
  }

  const nextHourProb = Math.round(hours[0].precipProb);
  const peakProb = Math.round(Math.max(...hours.map((h) => h.precipProb)));
  const totalMm = hours.reduce((s, h) => s + (h.precip ?? 0), 0);

  const first = hours.find((h) => h.precipProb >= 45 || h.precip >= 0.1);
  const hoursToRain = first ? Math.max(0, hours[0].idx === first.idx ? 0 : first.idx - hours[0].idx) : null;

  let headline: string;
  if (first && first.idx === hours[0].idx) headline = "Raining right now";
  else if (first) headline = `Rain likely in ${hoursToRain}h`;
  else if (peakProb >= 25) headline = "Slight chance later";
  else headline = "Dry for 24 hours";

  return {
    nextHourProb,
    peakProb,
    hoursToRain,
    rainStartISO: first?.iso ?? null,
    totalMm: Math.round(totalMm * 10) / 10,
    headline,
  };
}

/* ================================================================
   Geocoding
================================================================ */

export async function searchCities(q: string): Promise<Location[]> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q,
    )}&count=6&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json();
    return (j.results ?? []).map(
      (r: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }) => ({
        name: r.name,
        admin1: r.admin1,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
      }),
    );
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<Location> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) throw new Error("reverse geocode failed");
    const j = await res.json();
    const name = j.city || j.locality || j.principalSubdivision || "Current Location";
    return { name, admin1: j.principalSubdivision, country: j.countryName, latitude: lat, longitude: lon };
  } catch {
    return { name: "Current Location", latitude: lat, longitude: lon };
  }
}

export const PRESET_LOCATIONS: Location[] = [
  { name: "San Francisco", admin1: "California", country: "United States", latitude: 37.7749, longitude: -122.4194 },
  { name: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 },
  { name: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276 },
  { name: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
  { name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { name: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708 },
  { name: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
];

/* ================================================================
   WMO weather-code mapping
================================================================ */

export interface Condition {
  label: string;
  Icon: LucideIcon;
  accent: string;
}

export function getCondition(code: number, isDay: boolean): Condition {
  switch (code) {
    case 0:
      return isDay
        ? { label: "Clear Sky", Icon: Sun, accent: "#93c5fd" }
        : { label: "Clear Night", Icon: Moon, accent: "#c4b5fd" };
    case 1:
      return isDay
        ? { label: "Mainly Clear", Icon: Sun, accent: "#a5b4fc" }
        : { label: "Mainly Clear", Icon: Moon, accent: "#d8b4fe" };
    case 2:
      return isDay
        ? { label: "Partly Cloudy", Icon: CloudSun, accent: "#818cf8" }
        : { label: "Partly Cloudy", Icon: CloudMoon, accent: "#c084fc" };
    case 3:
      return { label: "Overcast", Icon: Cloud, accent: "#a5b0d8" };
    case 45:
    case 48:
      return { label: "Foggy", Icon: CloudFog, accent: "#b1a8d8" };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { label: "Drizzle", Icon: CloudDrizzle, accent: "#7dd3fc" };
    case 61:
      return { label: "Light Rain", Icon: CloudRain, accent: "#60a5fa" };
    case 63:
      return { label: "Rain", Icon: CloudRain, accent: "#3b82f6" };
    case 65:
    case 66:
    case 67:
      return { label: "Heavy Rain", Icon: CloudRain, accent: "#4f46e5" };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: "Snow", Icon: CloudSnow, accent: "#e9d5ff" };
    case 80:
    case 81:
    case 82:
      return { label: "Rain Showers", Icon: CloudRain, accent: "#38bdf8" };
    case 85:
    case 86:
      return { label: "Snow Showers", Icon: CloudSnow, accent: "#f5d0fe" };
    case 95:
      return { label: "Thunderstorm", Icon: CloudLightning, accent: "#a78bfa" };
    case 96:
    case 99:
      return { label: "Hailstorm", Icon: CloudHail, accent: "#f0abfc" };
    default:
      return isDay
        ? { label: "Clear Sky", Icon: Sun, accent: "#93c5fd" }
        : { label: "Clear Night", Icon: Moon, accent: "#c4b5fd" };
  }
}

/* ================================================================
   UV scale
================================================================ */

export interface UvInfo {
  label: string;
  color: string;
  tip: string;
}

export function uvInfo(v: number): UvInfo {
  if (v < 3) return { label: "Low", color: "#7dd3fc", tip: "Minimal protection needed." };
  if (v < 6) return { label: "Moderate", color: "#818cf8", tip: "Sunscreen recommended." };
  if (v < 8) return { label: "High", color: "#a78bfa", tip: "SPF 30+, seek shade midday." };
  if (v < 11) return { label: "Very High", color: "#e879f9", tip: "Limit sun exposure today." };
  return { label: "Extreme", color: "#fb7185", tip: "Avoid direct sunlight." };
}

/* ================================================================
   Units & formatting
================================================================ */

export const dispTemp = (c: number, unit: Unit): number => Math.round(unit === "C" ? c : c * 1.8 + 32);

export const dispSpeed = (kmh: number, unit: Unit): number =>
  unit === "C" ? Math.round(kmh) : Math.round(kmh / 1.609);

export const speedUnit = (unit: Unit): string => (unit === "C" ? "km/h" : "mph");

export const cardinal = (deg: number): string =>
  ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][
    Math.round(deg / 22.5) % 16
  ];

/** Parse an Open-Meteo local ISO string ("2024-06-01T06:12") as UTC so it lines
 *  up with the "shifted now" frame used everywhere else. */
export const parseLocalIso = (s: string): Date => new Date(s.length === 16 ? `${s}:00Z` : `${s}Z`);

/** Current wall-clock time of the location, expressed in the same UTC frame. */
export const shiftedNow = (utcOffsetSeconds: number): Date => new Date(Date.now() + utcOffsetSeconds * 1000);

export const fmt = (d: Date, opts: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(d);

export const fmtHour = (iso: string): string =>
  fmt(parseLocalIso(iso), { hour: "numeric", hour12: true });

export const fmtClock = (iso: string): string =>
  fmt(parseLocalIso(iso), { hour: "2-digit", minute: "2-digit", hour12: true });

export const dayName = (yyyyMmDd: string, idx: number): string =>
  idx === 0 ? "Today" : fmt(new Date(`${yyyyMmDd}T00:00:00Z`), { weekday: "short" });

/* ================================================================
   Mock fallback (offline safety net)
================================================================ */

export function mockWeather(): WeatherData {
  const now = new Date();
  const day = (offset: number) => new Date(now.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => day(i));

  const hourly = {
    time: [] as string[],
    temp: [] as number[],
    codes: [] as number[],
    isDay: [] as number[],
    precipProb: [] as number[],
    precip: [] as number[],
    uv: [] as number[],
    wind: [] as number[],
  };
  const daily = {
    days,
    sunrise: [] as string[],
    sunset: [] as string[],
    max: [] as number[],
    min: [] as number[],
    uvMax: [] as number[],
    codes: [] as number[],
    precipSum: [] as number[],
    precipProbMax: [] as number[],
  };

  const codes = [1, 2, 3, 2, 0, 61, 2];
  days.forEach((d, di) => {
    let maxT = -Infinity;
    let minT = Infinity;
    let daySum = 0;
    let dayPeakProb = 0;
    for (let h = 0; h < 24; h++) {
      const t = 17 + 6 * Math.sin(((h - 14) / 24) * Math.PI * 2 + di * 0.7) + Math.sin(di * 3 + h) * 0.8;
      // synthetic shower: peaks early afternoon every other day
      const prob = di % 2 === 0 ? Math.max(0, Math.round(70 * Math.exp(-((h - 15) ** 2) / 18))) : Math.round(8 * Math.abs(Math.sin(h)));
      const mm = prob > 45 ? Math.round((prob / 100) * 2.4 * 10) / 10 : 0;
      hourly.time.push(`${d}T${String(h).padStart(2, "0")}:00`);
      hourly.temp.push(Math.round(t * 10) / 10);
      hourly.codes.push(codes[di]);
      hourly.isDay.push(h >= 6 && h < 19 ? 1 : 0);
      hourly.precipProb.push(prob);
      hourly.precip.push(mm);
      hourly.uv.push(hourly.isDay[hourly.isDay.length - 1] === 1 ? Math.max(0, Math.round(9 * Math.exp(-((h - 13) ** 2) / 26) * 10) / 10) : 0);
      hourly.wind.push(Math.round((11 + 7 * Math.sin(h / 3 + di)) * 10) / 10);
      daySum += mm;
      dayPeakProb = Math.max(dayPeakProb, prob);
      maxT = Math.max(maxT, t);
      minT = Math.min(minT, t);
    }
    daily.precipSum.push(Math.round(daySum * 10) / 10);
    daily.precipProbMax.push(dayPeakProb);
    daily.max.push(Math.round(maxT));
    daily.min.push(Math.round(minT));
    daily.codes.push(codes[di]);
    daily.uvMax.push(3 + ((di * 2) % 5));
    const srMin = 52 + ((di * 7) % 12);
    const ssMin = 31 + ((di * 5) % 14);
    daily.sunrise.push(`${d}T05:${String(srMin).padStart(2, "0")}`);
    daily.sunset.push(`${d}T18:${String(ssMin).padStart(2, "0")}`);
  });

  const h = now.getUTCHours();
  const hourIdx = Math.max(0, h);
  const wind = 9 + Math.round(Math.random() * 14);

  return {
    utcOffsetSeconds: 0,
    timezone: "Local",
    timezoneAbbrev: "LOC",
    current: {
      time: hourly.time[hourIdx],
      temperature: hourly.temp[hourIdx],
      feelsLike: hourly.temp[hourIdx] - 1.4,
      humidity: 58,
      isDay: hourly.isDay[hourIdx] === 1,
      code: hourly.codes[hourIdx],
      windSpeed: wind,
      windDirection: Math.round(Math.random() * 359),
      windGusts: wind + 12,
      uv: hourly.isDay[hourIdx] ? Math.max(0, Math.round(4 * Math.sin(((h - 6) / 13) * Math.PI))) : 0,
      precipitation: hourly.precip[hourIdx] ?? 0,
    },
    daily,
    hourly,
  };
}

/* ================================================================
   Misc
================================================================ */

export const WindIcon = Wind;

export const pad2 = (n: number): string => String(n).padStart(2, "0");

export const durLabel = (ms: number): string => {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  return `${Math.floor(totalMin / 60)}h ${pad2(totalMin % 60)}m`;
};
