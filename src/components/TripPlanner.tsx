import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Backpack, Check, Clock, Sparkles, TrendingUp } from "lucide-react";
import { ACTIVITIES, planDay, type ActivityId, type Verdict } from "../lib/advisor";
import { aiPlanDay, aiWeek, useBackendMode, type RankedDay } from "../lib/api";
import { dispTemp, fmt, type Location, type Unit, type WeatherData } from "../lib/weather";

interface TripPlannerProps {
  data: WeatherData;
  unit: Unit;
  locationName: string;
  location: Location;
}

const scoreColor = (s: number): string =>
  s >= 80 ? "#7dd3fc" : s >= 65 ? "#a78bfa" : s >= 45 ? "#e879f9" : s >= 28 ? "#f472b6" : "#fb7185";

export default function TripPlanner({ data, unit, locationName, location }: TripPlannerProps) {
  const [activityId, setActivityId] = useState<ActivityId>("out");
  const [dayIndex, setDayIndex] = useState(0);

  const activity = ACTIVITIES.find((a) => a.id === activityId) ?? ACTIVITIES[0];

  /** Local verdict is always computed so the UI never blocks on the network. */
  const localVerdict = useMemo(() => planDay(data, dayIndex, activity, unit), [data, dayIndex, activity, unit]);

  /** When a backend is configured, prefer its server-side conclusion. */
  const mode = useBackendMode();
  const [remote, setRemote] = useState<Verdict | null>(null);
  const verdict: Verdict = remote ?? localVerdict;

  useEffect(() => {
    if (mode !== "backend") {
      setRemote(null);
      return;
    }
    let alive = true;
    aiPlanDay(location, activityId, dayIndex, unit).then((v) => {
      if (alive && v) setRemote(v as unknown as Verdict);
    });
    return () => {
      alive = false;
    };
  }, [location, activityId, dayIndex, unit, mode]);

  /** rank every forecast day for the selected activity */
  const ranking = useMemo(() => {
    const local = data.daily.days.map((d, i) => ({
      i,
      date: d,
      score: planDay(data, i, activity, unit).score,
      label: i === 0 ? "Today" : fmt(new Date(`${d}T00:00:00Z`), { weekday: "short" }),
      short: fmt(new Date(`${d}T00:00:00Z`), { month: "short", day: "numeric" }),
    }));
    return local.sort((a, b) => b.score - a.score);
  }, [data, activity, unit]);

  /** Server-side ranking, when available. */
  const [remoteWeek, setRemoteWeek] = useState<RankedDay[] | null>(null);
  useEffect(() => {
    if (mode !== "backend") {
      setRemoteWeek(null);
      return;
    }
    let alive = true;
    aiWeek(location, activityId, unit).then((days) => {
      if (alive && days) setRemoteWeek(days);
    });
    return () => {
      alive = false;
    };
  }, [location, activityId, unit]);

  const top = remoteWeek?.[0]
    ? {
        label: remoteWeek[0].label,
        short: remoteWeek[0].short,
        score: remoteWeek[0].score,
      }
    : { label: ranking[0]?.label ?? "", short: ranking[0]?.short ?? "", score: ranking[0]?.score ?? 0 };
  const R = 52;
  const CIRC = 2 * Math.PI * R;

  return (
    <section className="relative border-t border-white/[0.06] bg-[#05040d]">
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-8 sm:py-24">
        {/* ---------- heading ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-fuchsia-300/70">
            <Sparkles size={12} />
            AtmoAi trip planner — {locationName}
          </div>
          <h2 className="mt-3 font-display text-5xl italic leading-none text-white/95 sm:text-6xl">
            Should you go?
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50">
            Pick an activity and a date. AtmoAi weighs temperature, rain probability, wind, UV and daylight hour by
            hour, then writes its own conclusion.
          </p>
        </motion.div>

        {/* ---------- controls ---------- */}
        <div className="mt-10 space-y-4">
          <div>
            <div className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">
              1 · What are you planning?
            </div>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((a) => {
                const on = a.id === activityId;
                return (
                  <button
                    key={a.id}
                    onClick={() => setActivityId(a.id)}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] transition-all ${
                      on
                        ? "border-fuchsia-300/50 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-fuchsia-500/20 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/85"
                    }`}
                  >
                    <a.Icon size={13} style={on ? { color: scoreColor(verdict.score) } : undefined} />
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">2 · Which date?</div>
            <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
              {data.daily.days.map((d, i) => {
                const on = i === dayIndex;
                const label = i === 0 ? "Today" : fmt(new Date(`${d}T00:00:00Z`), { weekday: "short" });
                return (
                  <button
                    key={d}
                    onClick={() => setDayIndex(i)}
                    className={`flex min-w-[86px] shrink-0 flex-col items-start gap-1 rounded-xl border px-3 py-2.5 transition-all ${
                      on
                        ? "border-violet-300/50 bg-violet-400/[0.1] text-white"
                        : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/85"
                    }`}
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">{label}</span>
                    <span className="font-mono text-[10px] tracking-wide opacity-50">
                      {fmt(new Date(`${d}T00:00:00Z`), { month: "short", day: "numeric" })}
                    </span>
                    <span className="mt-0.5 text-sm tabular-nums">
                      {dispTemp(data.daily.max[i] ?? 0, unit)}°
                      <span className="ml-1 text-white/35">{dispTemp(data.daily.min[i] ?? 0, unit)}°</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---------- conclusion ---------- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activityId}-${dayIndex}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass mt-6 grid grid-cols-1 gap-6 rounded-[26px] p-5 sm:p-7 lg:grid-cols-12"
          >
            {/* score + headline */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                <Sparkles size={11} className="text-fuchsia-300" />
                AtmoAi conclusion · {verdict.dateLabel}
              </div>

              <div className="mt-5 flex items-center gap-5">
                <div className="relative shrink-0">
                  <svg viewBox="0 0 120 120" className="h-[118px] w-[118px]">
                    <defs>
                      <linearGradient id="planRing" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60a5fa" />
                        <stop offset="50%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#f472b6" />
                      </linearGradient>
                    </defs>
                    <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="8" />
                    <motion.circle
                      cx="60"
                      cy="60"
                      r={R}
                      fill="none"
                      stroke="url(#planRing)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      initial={{ strokeDashoffset: CIRC }}
                      animate={{ strokeDashoffset: CIRC * (1 - verdict.score / 100) }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                      transform="rotate(-90 60 60)"
                      style={{ filter: `drop-shadow(0 0 10px ${verdict.color}99)` }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-4xl leading-none text-white">{verdict.score}</span>
                    <span className="mt-1 font-mono text-[7px] uppercase tracking-[0.2em] text-white/40">of 100</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em]"
                    style={{
                      color: verdict.color,
                      borderColor: `${verdict.color}55`,
                      background: `${verdict.color}14`,
                    }}
                  >
                    {verdict.tone === "go" ? <Check size={10} /> : <AlertTriangle size={10} />}
                    {verdict.label}
                  </span>
                  <p className="mt-2.5 font-display text-2xl italic leading-tight text-white/95">
                    {verdict.headline}
                  </p>
                </div>
              </div>

              {/* the AI's written summary */}
              <p className="mt-5 border-l-2 pl-4 text-[13.5px] leading-relaxed text-white/70"
                 style={{ borderColor: `${verdict.color}66` }}>
                {verdict.summary}
              </p>

              {verdict.window && (
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                  <span className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: verdict.color }} />
                    {verdict.window.startLabel} – {verdict.window.endLabel}
                  </span>
                  <span>{verdict.window.hours}h window</span>
                  <span>avg {verdict.window.avg}/100</span>
                </div>
              )}
            </div>

            {/* hourly suitability + packing */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div>
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                  <span>Hour-by-hour suitability</span>
                  <span className="hidden sm:inline">score / 100</span>
                </div>
                <div className="mt-4 flex h-28 items-end gap-[3px]">
                  {verdict.evals.map((e) => {
                    const c = scoreColor(e.score);
                    const inWin =
                      verdict.window &&
                      e.iso >= verdict.window.startISO &&
                      e.iso <= verdict.window.endISO;
                    return (
                      <div key={e.iso} className="group relative flex h-full flex-1 flex-col justify-end">
                        <motion.div
                          className="w-full rounded-t-[3px]"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(4, e.score)}%` }}
                          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                          style={{
                            background: `linear-gradient(180deg, ${c}, ${c}55)`,
                            opacity: inWin ? 1 : 0.62,
                            boxShadow: inWin ? `0 0 12px ${c}66` : undefined,
                          }}
                        />
                        <span
                          className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-white/10 bg-[#0b0a18] px-2 py-1 font-mono text-[9px] tracking-wide text-white/80 group-hover:block"
                        >
                          {e.hourLabel} · {e.score}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">
                  <span>12 AM</span>
                  <span>6 AM</span>
                  <span>noon</span>
                  <span>6 PM</span>
                  <span>11 PM</span>
                </div>
              </div>

                {/* factor breakdown — why the score is what it is */}
                <div>
                  <div className="flex items-baseline justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                    <span>How the score was built</span>
                    <span className="text-white/25">weight · pts</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {verdict.factors?.map((f) => {
                      const fc = f.status === "good" ? "#7dd3fc" : f.status === "ok" ? "#e879f9" : "#fb7185";
                      return (
                        <div key={f.key} className="grid grid-cols-[86px_1fr_30px_38px] items-center gap-x-2.5">
                          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/55">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: fc }} />
                            {f.label}
                          </span>
                          <div className="relative h-[5px] overflow-hidden rounded-full bg-white/[0.07]">
                            <motion.div
                              className="absolute inset-y-0 left-0 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${f.score}%` }}
                              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                              style={{ background: `linear-gradient(90deg,${fc}bb,${fc})` }}
                            />
                          </div>
                          <span className="text-right font-mono text-[10px] tabular-nums" style={{ color: fc }}>
                            {f.score}
                          </span>
                          <span className="text-right font-mono text-[9px] tabular-nums text-white/35">
                            +{f.contribution}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 space-y-1 border-t border-white/[0.07] pt-2.5">
                    {verdict.factors?.map((f) => (
                      <p key={f.key} className="text-[11px] leading-relaxed text-white/45">
                        <span className="text-white/65">{f.label}:</span> {f.detail}
                      </p>
                    ))}
                  </div>
                </div>

                {/* reasons + cautions + gear */}
                <div className="grid gap-5">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">What stands out</div>
                  <ul className="mt-2.5 space-y-1.5">
                    {verdict.reasons.map((r) => (
                      <li key={r} className="flex gap-2 text-[12px] leading-relaxed text-white/60">
                        <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-sky-300" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  {verdict.cautions.length > 0 && (
                    <>
                      <div className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                        Watch out for
                      </div>
                      <ul className="mt-2.5 space-y-1.5">
                        {verdict.cautions.slice(0, 3).map((r) => (
                          <li key={r} className="flex gap-2 text-[12px] leading-relaxed text-fuchsia-100/60">
                            <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-fuchsia-400" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                    <Backpack size={11} className="text-violet-300" />
                    Packing list
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {verdict.gear.length > 0 ? (
                      verdict.gear.map((g) => (
                        <span
                          key={g}
                          className="rounded-lg border border-violet-300/20 bg-violet-400/[0.08] px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-violet-100/75"
                        >
                          {g}
                        </span>
                      ))
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                        Nothing special needed
                      </span>
                    )}
                  </div>

                  {top && (
                    <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                        <TrendingUp size={11} style={{ color: scoreColor(top.score) }} />
                        Best day this week
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                        <span className="font-semibold text-white">{top.label}</span> ({top.short}) scores{" "}
                        <span style={{ color: scoreColor(top.score) }}>{top.score}</span> for{" "}
                        {activity.label.toLowerCase()} — the strongest of the next {ranking.length} days.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ---------- day ranking ---------- */}
        <div className="mt-6">
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/35">
            Best dates for {activity.label.toLowerCase()}
          </div>
          <div className="mt-4 space-y-2.5">
            {ranking.map((r, rank) => {
              const c = scoreColor(r.score);
              return (
                <button
                  key={r.date}
                  onClick={() => setDayIndex(r.i)}
                  className="group grid w-full grid-cols-[18px_58px_66px_1fr_38px] items-center gap-3 text-left"
                >
                  <span className="font-mono text-[10px] tabular-nums text-white/30">
                    {String(rank + 1).padStart(2, "0")}
                  </span>
                  <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${r.i === dayIndex ? "text-white" : "text-white/60"}`}>
                    {r.label}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">{r.short}</span>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${r.score}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: rank * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        background: "linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6)",
                        opacity: r.i === dayIndex ? 1 : 0.55,
                      }}
                    />
                  </div>
                  <span className="text-right font-mono text-[11px] tabular-nums" style={{ color: c }}>
                    {r.score}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-8 font-mono text-[9px] uppercase leading-relaxed tracking-[0.16em] text-white/25">
          AtmoAi conclusions are generated on-device from Open-Meteo forecast data using weighted comfort, rain, wind,
          UV and daylight models. Always check official warnings before travelling.
        </p>
      </div>
    </section>
  );
}
