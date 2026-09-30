import {
  cardinal,
  fmt,
  hourlyWindow,
  parseLocalIso,
  shiftedNowMs,
  type WeatherData,
} from "./weather.js";

/* ================================================================
   Activity profiles — what "good weather" means for each outing
   `icon` is a stable key the frontend maps onto a Lucide icon.
================================================================ */

export type ActivityId =
  | "out"
  | "walk"
  | "run"
  | "cycle"
  | "hike"
  | "picnic"
  | "beach"
  | "sightsee"
  | "drive"
  | "shoot";

export interface ActivityProfile {
  id: ActivityId;
  label: string;
  icon: string;
  blurb: string;
  ideal: [number, number]; // comfortable band, °C
  hard: [number, number]; // outside this the score collapses
  maxWind: number; // km/h where it turns unpleasant
  rainWeight: number; // 0–1
  uvLimit: number;
  needsDaylight: boolean;
  durationH: number;
  gear: (ctx: DayContext) => string[];
  intro: string;
}

export interface DayContext {
  tempMin: number;
  tempMax: number;
  uvMax: number;
  probMax: number;
  mmTotal: number;
  windMax: number;
  code: number;
}

const baseGear = (c: DayContext): string[] => {
  const g: string[] = [];
  if (c.uvMax >= 6) g.push("Sunscreen SPF 30+");
  if (c.tempMax >= 27) g.push("Extra water");
  if (c.tempMin <= 5) g.push("Warm layers");
  if (c.tempMin <= 0) g.push("Gloves & beanie");
  if (c.probMax >= 40) g.push("Packable rain shell");
  if (c.windMax >= 32) g.push("Windproof jacket");
  if (c.code >= 71 && c.code <= 86) g.push("Waterproof footwear");
  return g;
};

export const ACTIVITIES: ActivityProfile[] = [
  {
    id: "out",
    label: "Going out",
    icon: "person",
    blurb: "General errands, meeting friends, stepping outside",
    ideal: [12, 27],
    hard: [-5, 36],
    maxWind: 34,
    rainWeight: 0.9,
    uvLimit: 8,
    needsDaylight: false,
    durationH: 2,
    gear: baseGear,
    intro: "stepping outside",
  },
  {
    id: "walk",
    label: "Casual walk",
    icon: "walk",
    blurb: "A relaxed stroll around the neighbourhood",
    ideal: [13, 26],
    hard: [-4, 34],
    maxWind: 30,
    rainWeight: 0.9,
    uvLimit: 8,
    needsDaylight: false,
    durationH: 1,
    gear: baseGear,
    intro: "a casual walk",
  },
  {
    id: "run",
    label: "Run / jog",
    icon: "activity",
    blurb: "Road or trail running",
    ideal: [6, 18],
    hard: [-9, 27],
    maxWind: 28,
    rainWeight: 0.5,
    uvLimit: 8,
    needsDaylight: false,
    durationH: 1,
    gear: (c) => {
      const g = baseGear(c);
      if (c.tempMin < 8) g.push("Breathable base layer");
      if (c.windMax >= 25) g.push("Light windbreaker");
      return g;
    },
    intro: "a run",
  },
  {
    id: "cycle",
    label: "Cycling",
    icon: "bike",
    blurb: "Road cycling or a long bike ride",
    ideal: [12, 25],
    hard: [0, 33],
    maxWind: 22,
    rainWeight: 0.85,
    uvLimit: 8,
    needsDaylight: true,
    durationH: 2,
    gear: (c) => {
      const g = baseGear(c);
      g.push("Helmet & lights");
      if (c.windMax >= 20) g.push("Aero vest");
      return g;
    },
    intro: "a ride",
  },
  {
    id: "hike",
    label: "Hiking",
    icon: "mountain",
    blurb: "Day hikes and hill walking",
    ideal: [8, 22],
    hard: [-7, 31],
    maxWind: 36,
    rainWeight: 0.65,
    uvLimit: 9,
    needsDaylight: true,
    durationH: 4,
    gear: (c) => {
      const g = baseGear(c);
      g.push("Sturdy footwear");
      g.push("Trail snacks");
      return g;
    },
    intro: "a hike",
  },
  {
    id: "picnic",
    label: "Picnic",
    icon: "utensils",
    blurb: "Outdoor meals, parks, gardens",
    ideal: [18, 29],
    hard: [7, 35],
    maxWind: 18,
    rainWeight: 1,
    uvLimit: 8,
    needsDaylight: true,
    durationH: 3,
    gear: (c) => {
      const g = baseGear(c);
      g.push("Picnic blanket");
      if (c.uvMax >= 6) g.push("Shade canopy");
      return g;
    },
    intro: "a picnic",
  },
  {
    id: "beach",
    label: "Beach day",
    icon: "waves",
    blurb: "Swimming, sunbathing, coastal trips",
    ideal: [24, 34],
    hard: [17, 40],
    maxWind: 22,
    rainWeight: 1,
    uvLimit: 12,
    needsDaylight: true,
    durationH: 4,
    gear: (c) => {
      const g = baseGear(c);
      g.push("Towel & swimwear");
      if (c.uvMax >= 6) g.push("Umbrella & shade");
      return g;
    },
    intro: "a beach day",
  },
  {
    id: "sightsee",
    label: "Sightseeing",
    icon: "map",
    blurb: "City breaks, museums, walking tours",
    ideal: [12, 27],
    hard: [-2, 36],
    maxWind: 32,
    rainWeight: 0.7,
    uvLimit: 9,
    needsDaylight: false,
    durationH: 4,
    gear: baseGear,
    intro: "sightseeing",
  },
  {
    id: "drive",
    label: "Road trip",
    icon: "car",
    blurb: "Long drives and intercity travel",
    ideal: [2, 32],
    hard: [-16, 42],
    maxWind: 56,
    rainWeight: 0.4,
    uvLimit: 11,
    needsDaylight: false,
    durationH: 5,
    gear: (c) => {
      const g = baseGear(c);
      g.push("Sunglasses for glare");
      if (c.probMax >= 45) g.push("Allow extra travel time");
      if (c.code >= 71 && c.code <= 86) g.push("Winter tyres / chains");
      return g;
    },
    intro: "a road trip",
  },
  {
    id: "shoot",
    label: "Photography",
    icon: "camera",
    blurb: "Golden-hour shoots and landscape work",
    ideal: [8, 28],
    hard: [-6, 37],
    maxWind: 26,
    rainWeight: 0.45,
    uvLimit: 12,
    needsDaylight: true,
    durationH: 2,
    gear: (c) => {
      const g = baseGear(c);
      g.push("Lens cloth");
      if (c.probMax >= 40) g.push("Rain cover");
      return g;
    },
    intro: "a photo session",
  },
];

export const findActivity = (id: unknown): ActivityProfile => {
  if (typeof id !== "string") return ACTIVITIES[0];
  return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0];
};

/* ================================================================
   Units & conditions (server-side mirrors of the UI helpers)
================================================================ */

export type Unit = "C" | "F";
export const parseUnit = (raw: unknown): Unit => (String(raw).toUpperCase() === "F" ? "F" : "C");

export const dispTemp = (c: number, unit: Unit): number => Math.round(unit === "C" ? c : c * 1.8 + 32);
export const dispSpeed = (kmh: number, unit: Unit): number =>
  unit === "C" ? Math.round(kmh) : Math.round(kmh / 1.609);
export const speedUnit = (unit: Unit): string => (unit === "C" ? "km/h" : "mph");

export function conditionLabel(code: number, isDay: boolean): string {
  const map: Record<number, string> = {
    0: isDay ? "Clear Sky" : "Clear Night",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Foggy",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    56: "Drizzle",
    57: "Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    66: "Heavy Rain",
    67: "Heavy Rain",
    71: "Snow",
    73: "Snow",
    75: "Snow",
    77: "Snow",
    80: "Rain Showers",
    81: "Rain Showers",
    82: "Rain Showers",
    85: "Snow Showers",
    86: "Snow Showers",
    95: "Thunderstorm",
    96: "Hailstorm",
    99: "Hailstorm",
  };
  return map[code] ?? (isDay ? "Clear Sky" : "Clear Night");
}

export function uvInfo(v: number): { label: string } {
  if (v < 3) return { label: "Low" };
  if (v < 6) return { label: "Moderate" };
  if (v < 8) return { label: "High" };
  if (v < 11) return { label: "Very High" };
  return { label: "Extreme" };
}

/* ================================================================
   Per-hour scoring
================================================================ */

export interface HourEval {
  iso: string;
  hourLabel: string;
  hour: number;
  temp: number;
  prob: number;
  mm: number;
  wind: number;
  uv: number;
  day: boolean;
  code: number;
  score: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Axis weights — must sum to 1. */
export const WEIGHTS = { temperature: 0.28, rain: 0.32, wind: 0.14, uv: 0.08, daylight: 0.18 } as const;

/** Per-axis 0–1 scores for a single hour. Shared by scoring and explanation. */
export function axisScores(
  h: { temp: number; prob: number; mm: number; wind: number; uv: number; day: boolean },
  p: ActivityProfile,
): { temperature: number; rain: number; wind: number; uv: number; daylight: number } {
  const [iLo, iHi] = p.ideal;
  const [hLo, hHi] = p.hard;

  let temperature: number;
  if (h.temp >= iLo && h.temp <= iHi) temperature = 1;
  else if (h.temp < iLo) temperature = clamp01(1 - (iLo - h.temp) / Math.max(1, iLo - hLo));
  else temperature = clamp01(1 - (h.temp - iHi) / Math.max(1, hHi - iHi));

  const probF = h.prob / 100;
  const mmF = clamp01(h.mm / 6);
  const rain = clamp01(1 - (0.75 * probF + 0.25 * mmF) * p.rainWeight);

  const wLow = p.maxWind * 0.45;
  const wind = h.wind <= wLow ? 1 : clamp01(1 - (h.wind - wLow) / (p.maxWind * 1.2));

  const uLow = p.uvLimit * 0.55;
  const uv = h.uv <= uLow ? 1 : clamp01(1 - ((h.uv - uLow) / Math.max(1, p.uvLimit)) * 0.85);

  const daylight = p.needsDaylight ? (h.day ? 1 : 0.12) : h.day ? 1 : 0.82;

  return { temperature, rain, wind, uv, daylight };
}

export function scoreHour(h: Omit<HourEval, "score">, p: ActivityProfile): number {
  const a = axisScores(h, p);
  const raw =
    a.temperature * WEIGHTS.temperature +
    a.rain * WEIGHTS.rain +
    a.wind * WEIGHTS.wind +
    a.uv * WEIGHTS.uv +
    a.daylight * WEIGHTS.daylight;
  return Math.round(Math.max(0, Math.min(100, raw * 100)));
}

/* ================================================================
   Explanation — why the verdict is what it is
================================================================ */

export interface Factor {
  key: "temperature" | "rain" | "wind" | "uv" | "daylight";
  label: string;
  weight: number;
  /** 0–100 for this axis across the representative hours */
  score: number;
  /** points this axis contributed to the final 0–100 score */
  contribution: number;
  status: "good" | "ok" | "bad";
  detail: string;
}

/**
 * Break the score down into its constituent factors so the verdict can be
 * explained rather than just asserted. `hours` should be the representative
 * window (the best stretch, or just the current hour).
 */
export function computeFactors(
  hours: { temp: number; prob: number; mm: number; wind: number; uv: number; day: boolean }[],
  p: ActivityProfile,
  unit: Unit,
): Factor[] {
  if (hours.length === 0) return [];
  const T = (c: number) => `${dispTemp(c, unit)}°`;

  // average each axis across the window
  const sums = { temperature: 0, rain: 0, wind: 0, uv: 0, daylight: 0 };
  for (const h of hours) {
    const a = axisScores(h, p);
    sums.temperature += a.temperature;
    sums.rain += a.rain;
    sums.wind += a.wind;
    sums.uv += a.uv;
    sums.daylight += a.daylight;
  }
  const n = hours.length;
  const avg = {
    temperature: sums.temperature / n,
    rain: sums.rain / n,
    wind: sums.wind / n,
    uv: sums.uv / n,
    daylight: sums.daylight / n,
  };

  const maxTemp = Math.max(...hours.map((h) => h.temp));
  const minTemp = Math.min(...hours.map((h) => h.temp));
  const peakProb = Math.max(...hours.map((h) => h.prob));
  const totalMm = hours.reduce((s, h) => s + h.mm, 0);
  const peakWind = Math.max(...hours.map((h) => h.wind));
  const peakUv = Math.max(...hours.map((h) => h.uv));
  const daylightHours = hours.filter((h) => h.day).length;

  const statusOf = (v: number): Factor["status"] => (v >= 0.75 ? "good" : v >= 0.45 ? "ok" : "bad");
  const pct = (v: number) => Math.round(v * 100);
  const contrib = (v: number, w: number) => Math.round(v * w * 100);

  const factors: Factor[] = [
    {
      key: "temperature",
      label: "Temperature",
      weight: WEIGHTS.temperature,
      score: pct(avg.temperature),
      contribution: contrib(avg.temperature, WEIGHTS.temperature),
      status: statusOf(avg.temperature),
      detail:
        `${T(minTemp)} to ${T(maxTemp)} in this window, against an ideal ${T(p.ideal[0])}–${T(p.ideal[1])} band for ${
          p.intro
        }.`,
    },
    {
      key: "rain",
      label: "Rain risk",
      weight: WEIGHTS.rain,
      score: pct(avg.rain),
      contribution: contrib(avg.rain, WEIGHTS.rain),
      status: statusOf(avg.rain),
      detail:
        peakProb < 20
          ? `Peak probability ${Math.round(peakProb)}% — essentially dry.`
          : peakProb < 45
            ? `Peak probability ${Math.round(peakProb)}%${totalMm > 0 ? `, about ${Math.round(totalMm * 10) / 10} mm total` : ""}.`
            : `Peak probability ${Math.round(peakProb)}% and roughly ${Math.round(totalMm * 10) / 10} mm expected.`,
    },
    {
      key: "wind",
      label: "Wind",
      weight: WEIGHTS.wind,
      score: pct(avg.wind),
      contribution: contrib(avg.wind, WEIGHTS.wind),
      status: statusOf(avg.wind),
      detail:
        peakWind <= p.maxWind * 0.45
          ? `Calm at up to ${dispSpeed(peakWind, unit)} ${speedUnit(unit)}.`
          : `Up to ${dispSpeed(peakWind, unit)} ${speedUnit(unit)}, against a ${dispSpeed(p.maxWind, unit)} ${speedUnit(
              unit,
            )} comfort limit.`,
    },
    {
      key: "uv",
      label: "UV index",
      weight: WEIGHTS.uv,
      score: pct(avg.uv),
      contribution: contrib(avg.uv, WEIGHTS.uv),
      status: statusOf(avg.uv),
      detail:
        peakUv < 3
          ? `Peak UV ${Math.round(peakUv * 10) / 10} — no protection needed.`
          : `Peak UV ${Math.round(peakUv * 10) / 10} (${uvInfo(peakUv).label.toLowerCase()}).`,
    },
    {
      key: "daylight",
      label: "Daylight",
      weight: WEIGHTS.daylight,
      score: pct(avg.daylight),
      contribution: contrib(avg.daylight, WEIGHTS.daylight),
      status: statusOf(avg.daylight),
      detail: p.needsDaylight
        ? daylightHours === n
          ? `All ${n} hours of the window are in daylight.`
          : `Only ${daylightHours} of ${n} hours are in daylight.`
        : `Not daylight dependent — ${daylightHours} of ${n} hours are bright.`,
    },
  ];

  return factors;
}

export function evalDay(data: WeatherData, dayIndex: number, profile: ActivityProfile): HourEval[] {
  const date = data.daily.days[dayIndex];
  if (!date) return [];
  const { time, temp, codes, isDay, precipProb, precip, uv, wind } = data.hourly;
  const out: HourEval[] = [];
  for (let k = 0; k < time.length; k++) {
    if (!time[k].startsWith(date)) continue;
    const base = {
      iso: time[k],
      hourLabel: fmt(parseLocalIso(time[k]), { hour: "numeric", hour12: true }),
      hour: parseLocalIso(time[k]).getUTCHours(),
      temp: temp[k],
      prob: precipProb[k] ?? 0,
      mm: precip[k] ?? 0,
      wind: wind[k] ?? 0,
      uv: uv[k] ?? 0,
      day: (isDay[k] ?? 1) === 1,
      code: codes[k] ?? 0,
    };
    out.push({ ...base, score: scoreHour(base, profile) });
  }
  return out;
}

/* ================================================================
   Best-window search
================================================================ */

export interface Window {
  startISO: string;
  endISO: string;
  startLabel: string;
  endLabel: string;
  hours: number;
  avg: number;
}

export function bestWindow(evals: HourEval[], durationH: number): Window | null {
  if (evals.length === 0) return null;
  const peak = Math.max(...evals.map((e) => e.score));
  if (peak < 25) return null;
  const threshold = Math.max(35, peak - 16);

  let best: Window | null = null;
  let runStart = -1;

  for (let i = 0; i <= evals.length; i++) {
    const inRun = i < evals.length && evals[i].score >= threshold;
    if (inRun && runStart < 0) runStart = i;
    if (!inRun && runStart >= 0) {
      const slice = evals.slice(runStart, i);
      const avg = Math.round(slice.reduce((s, e) => s + e.score, 0) / slice.length);
      const candidate: Window = {
        startISO: slice[0].iso,
        endISO: slice[slice.length - 1].iso,
        startLabel: slice[0].hourLabel,
        endLabel: slice[slice.length - 1].hourLabel,
        hours: slice.length,
        avg,
      };
      const bestLen = best?.hours ?? 0;
      const bestAvg = best?.avg ?? 0;
      const longEnough = slice.length >= durationH;
      const bestLongEnough = bestLen >= durationH;
      if (
        !best ||
        (longEnough && !bestLongEnough) ||
        (longEnough === bestLongEnough && (avg > bestAvg || (avg === bestAvg && slice.length > bestLen)))
      ) {
        best = candidate;
      }
      runStart = -1;
    }
  }
  return best;
}

/* ================================================================
   Verdict
================================================================ */

export interface Verdict {
  score: number;
  label: string;
  color: string;
  tone: "go" | "maybe" | "no";
  emoji: string;
  headline: string;
  reasons: string[];
  cautions: string[];
  gear: string[];
  window: Window | null;
  summary: string;
  /** per-axis breakdown explaining how the score was reached */
  factors: Factor[];
  evals: HourEval[];
  activity: { id: ActivityId; label: string; icon: string };
  dayLabel: string;
  dateLabel: string;
  uvMax: number;
  probMax: number;
  mmTotal: number;
  tempMin: number;
  tempMax: number;
  windMax: number;
}

function verdictFor(score: number) {
  if (score >= 80) return { label: "Ideal", color: "#7dd3fc", tone: "go" as const, emoji: "clear" };
  if (score >= 65) return { label: "Good", color: "#a78bfa", tone: "go" as const, emoji: "good" };
  if (score >= 45) return { label: "Fair", color: "#e879f9", tone: "maybe" as const, emoji: "fair" };
  if (score >= 28) return { label: "Poor", color: "#f472b6", tone: "no" as const, emoji: "poor" };
  return { label: "Avoid", color: "#fb7185", tone: "no" as const, emoji: "avoid" };
}

const dayWord = (data: WeatherData, dayIndex: number): string => {
  const iso = data.daily.days[dayIndex];
  if (dayIndex === 0) return "today";
  if (iso) return fmt(new Date(`${iso}T00:00:00Z`), { weekday: "long" }).toLowerCase();
  return "that day";
};

/** The AI conclusion for a specific future date + activity. */
export function planDay(data: WeatherData, dayIndex: number, profile: ActivityProfile, unit: Unit): Verdict {
  const evals = evalDay(data, dayIndex, profile);
  const d = data.daily;
  const dayISO = d.days[dayIndex] ?? "";

  const tempMin = d.min[dayIndex] ?? 0;
  const tempMax = d.max[dayIndex] ?? 0;
  const uvMax = d.uvMax[dayIndex] ?? 0;
  const probMax = Math.max(0, ...evals.map((e) => e.prob), d.precipProbMax[dayIndex] ?? 0);
  const mmTotal = Math.round(((d.precipSum[dayIndex] ?? 0) + evals.reduce((s, e) => s + e.mm, 0) / 2) * 10) / 10;
  const windMax = Math.max(0, ...evals.map((e) => e.wind));
  const code = d.codes[dayIndex] ?? 0;
  const cond = conditionLabel(code, true);

  const ctx: DayContext = { tempMin, tempMax, uvMax, probMax, mmTotal, windMax, code };

  let score = 0;
  if (evals.length > 0) {
    const dur = Math.max(1, Math.min(profile.durationH, evals.length));
    let bestSum = -1;
    for (let i = 0; i + dur <= evals.length; i++) {
      const sum = evals.slice(i, i + dur).reduce((s, e) => s + e.score, 0);
      if (sum > bestSum) bestSum = sum;
    }
    score = Math.round((bestSum / dur) * 0.82 + Math.max(...evals.map((e) => e.score)) * 0.18);
  }

  const v = verdictFor(score);
  const win = bestWindow(evals, profile.durationH);
  const T = (c: number) => `${dispTemp(c, unit)}°`;
  const word = dayWord(data, dayIndex);

  const reasons: string[] = [];
  if (tempMax >= profile.ideal[0] && tempMin <= profile.ideal[1] && tempMax <= profile.ideal[1] + 2) {
    reasons.push(`Temperatures peak at ${T(tempMax)} — right in the comfortable band for ${profile.intro}.`);
  } else if (tempMax > profile.ideal[1]) {
    reasons.push(`A warm ${T(tempMax)} high; aim for the cooler morning hours.`);
  } else if (tempMax < profile.ideal[0]) {
    reasons.push(`Only ${T(tempMax)} at the warmest point, so layer up.`);
  }

  if (probMax < 20) reasons.push(`Barely any rain risk — just ${Math.round(probMax)}% at its highest.`);
  else if (probMax < 45) reasons.push(`Rain chance tops out at ${Math.round(probMax)}%, so mostly dry.`);

  if (windMax <= profile.maxWind * 0.5)
    reasons.push(`Light winds all day (max ${dispSpeed(windMax, unit)} ${speedUnit(unit)}).`);

  if (cond.toLowerCase().includes("clear")) reasons.push(`${cond} — excellent visibility and light.`);

  const sunriseISO = d.sunrise[dayIndex];
  const sunsetISO = d.sunset[dayIndex];
  if (sunriseISO && sunsetISO) {
    const mins = Math.round((parseLocalIso(sunsetISO).getTime() - parseLocalIso(sunriseISO).getTime()) / 60000);
    reasons.push(
      `Daylight runs ${fmt(parseLocalIso(sunriseISO), { hour: "numeric", hour12: true })} – ${fmt(
        parseLocalIso(sunsetISO),
        { hour: "numeric", hour12: true },
      )} (${Math.floor(mins / 60)}h ${mins % 60}m).`,
    );
  }

  const cautions: string[] = [];
  const worstRain = evals.reduce((a, b) => (b.prob > a.prob ? b : a), evals[0]);
  if (worstRain && worstRain.prob >= 45)
    cautions.push(`Rain probability reaches ${Math.round(worstRain.prob)}% around ${worstRain.hourLabel}.`);
  if (mmTotal >= 2) cautions.push(`About ${mmTotal} mm of precipitation expected in total.`);
  if (windMax > profile.maxWind)
    cautions.push(
      `Wind near ${dispSpeed(windMax, unit)} ${speedUnit(unit)} — above the comfort level for ${profile.intro}.`,
    );
  if (uvMax >= 6) cautions.push(`UV index peaks at ${Math.round(uvMax * 10) / 10} (${uvInfo(uvMax).label}) around midday.`);
  if (tempMax >= 32) cautions.push(`Heat peaks at ${T(tempMax)} — hydrate and seek shade.`);
  if (tempMin <= 2) cautions.push(`An overnight low of ${T(tempMin)} means a cold start.`);
  if (code >= 95) cautions.push("Thunderstorms forecast — keep an eye on warnings.");
  if (code >= 71 && code <= 86) cautions.push("Snow in the forecast — surfaces may be slippery.");

  const headline =
    v.tone === "go"
      ? `Yes — ${word} looks great for ${profile.intro}.`
      : v.tone === "maybe"
        ? `${word.charAt(0).toUpperCase() + word.slice(1)} is workable, but time it well.`
        : `I'd rethink ${profile.intro} ${word}.`;

  const winText = win
    ? ` The best window is ${win.startLabel} to ${win.endLabel}${
        win.hours > 1 ? ` (${win.hours} hours, averaging ${win.avg}/100)` : ""
      }.`
    : " No clearly good window emerges across the day.";

  const gearList = profile.gear(ctx);
  const gearText = gearList.length > 0 ? ` Bring ${gearList.slice(0, 3).join(", ").toLowerCase()}.` : "";

  const summary =
    `AtmoAi scores ${word} at ${score}/100 for ${profile.intro}. Conditions: ${cond.toLowerCase()}, ${T(tempMin)}` +
    ` to ${T(tempMax)}, with a ${Math.round(probMax)}% peak chance of rain and winds up to ` +
    `${dispSpeed(windMax, unit)} ${speedUnit(unit)}.${winText}${
      cautions.length > 0 ? ` Watch out for: ${cautions[0].toLowerCase()}` : ""
    }${gearText}`;

  // representative hours = the best window if there is one, else the whole day
  const representative = win
    ? evals.filter((e) => e.iso >= win.startISO && e.iso <= win.endISO)
    : evals.filter((e) => e.score >= Math.max(...evals.map((x) => x.score)) - 25).slice(0, profile.durationH);

  return {
    score,
    ...v,
    headline,
    reasons: reasons.slice(0, 4),
    cautions: cautions.slice(0, 4),
    gear: gearList.slice(0, 6),
    window: win,
    summary,
    factors: computeFactors(representative.length > 0 ? representative : evals, profile, unit),
    evals,
    activity: { id: profile.id, label: profile.label, icon: profile.icon },
    dayLabel: word,
    dateLabel: dayISO
      ? fmt(new Date(`${dayISO}T00:00:00Z`), { weekday: "short", month: "short", day: "numeric" })
      : "Unknown date",
    uvMax,
    probMax,
    mmTotal,
    tempMin,
    tempMax,
    windMax,
  };
}

/* ================================================================
   "Should I go out right now?"
================================================================ */

export function goOutNow(data: WeatherData, unit: Unit): Verdict {
  const profile = findActivity("out");
  const evals = evalDay(data, 0, profile);
  const nowMs = shiftedNowMs(data.utcOffsetSeconds);

  let idx = 0;
  for (let i = 0; i < evals.length; i++) {
    if (parseLocalIso(evals[i].iso).getTime() <= nowMs) idx = i;
    else break;
  }

  const cur = evals[idx];
  const c = data.current;
  const immediate: HourEval =
    cur !== undefined
      ? { ...cur, temp: c.temperature, wind: c.windSpeed, uv: c.uv, prob: cur.prob, mm: c.precipitation }
      : {
          iso: c.time,
          hourLabel: "now",
          hour: 0,
          temp: c.temperature,
          prob: 0,
          mm: c.precipitation,
          wind: c.windSpeed,
          uv: c.uv,
          day: c.isDay,
          code: c.code,
          score: 0,
        };
  immediate.score = scoreHour(immediate, profile);

  const ahead = evals.slice(idx + 1, idx + 3);
  const aheadAvg = ahead.length ? ahead.reduce((s, e) => s + e.score, 0) / ahead.length : immediate.score;
  const score = Math.round(immediate.score * 0.6 + aheadAvg * 0.4);

  const v = verdictFor(score);
  const win = bestWindow(evals, 2);
  const cond = conditionLabel(c.code, c.isDay);
  const T = (x: number) => `${dispTemp(x, unit)}°`;

  const reasons: string[] = [
    `Right now it's ${T(c.temperature)} (${cond.toLowerCase()}), feeling like ${T(c.feelsLike)}.`,
    `Wind ${dispSpeed(c.windSpeed, unit)} ${speedUnit(unit)} from the ${cardinal(c.windDirection)}.`,
    `UV index ${Math.round(c.uv * 10) / 10} — ${uvInfo(c.uv).label.toLowerCase()}.`,
  ];
  if (c.precipitation > 0) reasons.push(`${c.precipitation} mm of rain is falling.`);
  else if (immediate.prob < 25) reasons.push(`Rain risk this hour is only ${Math.round(immediate.prob)}%.`);

  const cautions: string[] = [];
  if (immediate.prob >= 45 || c.precipitation > 0) cautions.push("Take an umbrella if you head out.");
  if (c.uv >= 6) cautions.push(`UV is ${uvInfo(c.uv).label.toLowerCase()} — sunscreen advised.`);
  if (c.windSpeed > profile.maxWind) cautions.push("Strong winds will make walking unpleasant.");
  if (c.windGusts > c.windSpeed * 1.8)
    cautions.push(`Gusts reaching ${dispSpeed(c.windGusts, unit)} ${speedUnit(unit)}.`);
  if (!c.isDay) cautions.push("It's dark out — wear something reflective.");

  const gear = profile.gear({
    tempMin: data.daily.min[0] ?? c.temperature,
    tempMax: data.daily.max[0] ?? c.temperature,
    uvMax: data.daily.uvMax[0] ?? c.uv,
    probMax: Math.max(immediate.prob, data.daily.precipProbMax[0] ?? 0),
    mmTotal: data.daily.precipSum[0] ?? 0,
    windMax: Math.max(c.windGusts, ...evals.map((e) => e.wind), 0),
    code: c.code,
  });

  const headline =
    v.tone === "go" ? "Yes — head out." : v.tone === "maybe" ? "You can go, but go soon." : "Better to stay in for now.";

  const winText = win ? ` Conditions hold up best between ${win.startLabel} and ${win.endLabel}.` : "";

  const summary =
    `AtmoAi rates going out right now at ${score}/100. It's ${T(c.temperature)} and ${cond.toLowerCase()}, ` +
    `feeling like ${T(c.feelsLike)}, with wind at ${dispSpeed(c.windSpeed, unit)} ${speedUnit(unit)} and UV at ` +
    `${Math.round(c.uv * 10) / 10}.${winText}`;

  // representative hours = right now plus the next two, which is what the score blends
  const representativeHours = [immediate, ...ahead];

  return {
    score,
    ...v,
    headline,
    reasons: reasons.slice(0, 4),
    cautions: cautions.slice(0, 3),
    gear: gear.slice(0, 4),
    window: win,
    summary,
    factors: computeFactors(representativeHours, profile, unit),
    evals,
    activity: { id: profile.id, label: profile.label, icon: profile.icon },
    dayLabel: "today",
    dateLabel: "Right now",
    uvMax: data.daily.uvMax[0] ?? c.uv,
    probMax: Math.max(immediate.prob, data.daily.precipProbMax[0] ?? 0),
    mmTotal: data.daily.precipSum[0] ?? 0,
    tempMin: data.daily.min[0] ?? c.temperature,
    tempMax: data.daily.max[0] ?? c.temperature,
    windMax: Math.max(c.windGusts, ...evals.map((e) => e.wind), 0),
  };
}

/* ================================================================
   Week ranking + rain outlook
================================================================ */

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

export function rankWeek(data: WeatherData, profile: ActivityProfile, unit: Unit): RankedDay[] {
  return data.daily.days
    .map((date, i) => {
      const v = planDay(data, i, profile, unit);
      return {
        index: i,
        date,
        label: i === 0 ? "Today" : fmt(new Date(`${date}T00:00:00Z`), { weekday: "short" }),
        short: fmt(new Date(`${date}T00:00:00Z`), { month: "short", day: "numeric" }),
        score: v.score,
        verdict: v.label,
        tone: v.tone,
        tempMin: v.tempMin,
        tempMax: v.tempMax,
        probMax: v.probMax,
        uvMax: v.uvMax,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export interface RainOutlook {
  nextHourProb: number;
  peakProb: number;
  hoursToRain: number | null;
  rainStartISO: string | null;
  totalMm: number;
  headline: string;
}

export function rainOutlook(data: WeatherData): RainOutlook {
  const hours = hourlyWindow(data, 24);
  if (hours.length === 0) {
    return { nextHourProb: 0, peakProb: 0, hoursToRain: null, rainStartISO: null, totalMm: 0, headline: "No data available" };
  }
  const nextHourProb = Math.round(hours[0].precipProb);
  const peakProb = Math.round(Math.max(...hours.map((h) => h.precipProb)));
  const totalMm = Math.round(hours.reduce((s, h) => s + (h.precip ?? 0), 0) * 10) / 10;
  const first = hours.find((h) => h.precipProb >= 45 || h.precip >= 0.1);
  const hoursToRain = first ? Math.max(0, first.idx - hours[0].idx) : null;

  let headline: string;
  if (first && first.idx === hours[0].idx) headline = "Raining right now";
  else if (first) headline = `Rain likely in ${hoursToRain}h`;
  else if (peakProb >= 25) headline = "Slight chance later";
  else headline = "Dry for 24 hours";

  return { nextHourProb, peakProb, hoursToRain, rainStartISO: first?.iso ?? null, totalMm, headline };
}
