import { useEffect, useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { ArrowDown, ArrowUp, Droplets, MapPin, Sun, SunMedium, Wind, type LucideIcon } from "lucide-react";
import { dispSpeed, dispTemp, fmt, getCondition, speedUnit } from "../lib/weather";
import { goOutNow, type Verdict } from "../lib/advisor";
import { aiGoOutNow, useBackendMode } from "../lib/api";
import { useNow, type WeatherState } from "../hooks/useWeather";
import AiVerdict from "./AiVerdict";
import Counter from "./Counter";
import HourlyStrip from "./HourlyStrip";
import RainForecast from "./RainForecast";
import SunArc from "./SunArc";
import UvGauge from "./UvGauge";
import WindCompass from "./WindCompass";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 70, damping: 17 } },
};

function TileHead({ icon: Icon, label, tint }: { icon: LucideIcon; label: string; tint?: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
      <Icon size={12} style={tint ? { color: tint } : undefined} />
      {label}
    </div>
  );
}

export default function Dashboard({ state }: { state: WeatherState }) {
  const { data, location, unit } = state;
  const now = useNow(1000);

  /** Always computed locally so the tile renders instantly. */
  const localVerdict = useMemo(() => (data ? goOutNow(data, unit) : null), [data, unit]);

  /** Upgraded to the server-side conclusion when a backend is configured. */
  const mode = useBackendMode();
  const [remote, setRemote] = useState<Verdict | null>(null);
  useEffect(() => {
    if (mode !== "backend" || !data) {
      setRemote(null);
      return;
    }
    let alive = true;
    aiGoOutNow(location, unit).then((v) => {
      // the backend returns the same shape we compute locally
      if (alive && v) setRemote(v as unknown as Verdict);
    });
    return () => {
      alive = false;
    };
  }, [location, unit, data]);

  const verdict: Verdict | null = remote ?? localVerdict;

  if (!data || !verdict) return null;

  const c = getCondition(data.current.code, data.current.isDay);
  const { Icon } = c;

  const shifted = new Date(now + data.utcOffsetSeconds * 1000);
  const clock = fmt(shifted, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateLine = fmt(shifted, { weekday: "long", month: "long", day: "numeric" });

  const temp = dispTemp(data.current.temperature, unit);
  const feels = dispTemp(data.current.feelsLike, unit);
  const hi = dispTemp(data.daily.max[0] ?? data.current.temperature, unit);
  const lo = dispTemp(data.daily.min[0] ?? data.current.temperature, unit);

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="glass w-full rounded-[28px] p-5 sm:p-7 lg:p-8"
    >
      {/* ---------------- header ---------------- */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <MapPin size={14} style={{ color: c.accent }} className="shrink-0" />
            <span className="text-xl font-semibold tracking-tight text-white/95 sm:text-2xl">{location.name}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
              {[location.admin1, location.country].filter(Boolean).join(" · ")}
            </span>
          </div>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
            {dateLine} — {c.label}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 rounded-full border border-sky-300/25 bg-sky-300/[0.06] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-sky-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" />
            </span>
            Live
          </span>
          <div className="text-right">
            <div className="font-mono text-lg tabular-nums tracking-wide text-white/90">{clock}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
              {data.timezoneAbbrev} local
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- bento grid ---------------- */}
      <div className="mt-6 grid grid-cols-12 gap-3 sm:gap-4">
        {/* AtmoAi verdict — always the first thing you read */}
        <motion.div
          variants={item}
          className="glass-tile relative col-span-12 overflow-hidden rounded-2xl p-5 sm:p-6 lg:p-7"
          style={{
            borderColor: `${verdict.color}30`,
            background: `linear-gradient(135deg, ${verdict.color}0d, rgba(255,255,255,0.02) 60%)`,
          }}
        >
          <div className="relative">
            <AiVerdict verdict={verdict} source={remote ? "backend" : "local"} />
          </div>
        </motion.div>

        {/* current conditions — half width */}
        <motion.div
          variants={item}
          className="glass-tile relative col-span-12 overflow-hidden rounded-2xl p-5 sm:p-6 lg:col-span-6"
        >
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Icon
                    size={30}
                    strokeWidth={1.2}
                    style={{ color: c.accent, filter: `drop-shadow(0 0 16px ${c.accent}66)` }}
                  />
                </div>
                <div>
                  <div className="text-base font-medium text-white/90 sm:text-lg">{c.label}</div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
                    Current conditions
                  </div>
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/60 sm:flex">
                <Droplets size={11} className="text-sky-300/80" />
                {data.current.humidity}%
              </span>
            </div>

            <div>
              <div className="flex items-start">
                <span className="font-display text-[clamp(4rem,8vw,6.25rem)] leading-[0.84] tracking-tight text-white">
                  <Counter value={temp} />
                </span>
                <span className="mt-3 font-display text-4xl text-white/45">°</span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-white/50">
                <span>
                  feels <span className="text-white/80">{feels}°</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ArrowUp size={11} className="text-fuchsia-300/80" />
                  <span className="text-white/80">{hi}°</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ArrowDown size={11} className="text-sky-300/80" />
                  <span className="text-white/80">{lo}°</span>
                </span>
                <span className="sm:hidden">{data.current.humidity}% humidity</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* rain forecast — sits beside current conditions */}
        <motion.div variants={item} className="glass-tile col-span-12 rounded-2xl p-5 lg:col-span-6">
          <RainForecast data={data} />
        </motion.div>

        {/* wind */}
        <motion.div variants={item} className="glass-tile col-span-12 rounded-2xl p-5 sm:col-span-6 lg:col-span-4">
          <TileHead icon={Wind} label="Wind speed" tint="#7dd3fc" />
          <div className="mt-4">
            <WindCompass
              speed={dispSpeed(data.current.windSpeed, unit)}
              unitLabel={speedUnit(unit)}
              direction={data.current.windDirection}
              gusts={dispSpeed(data.current.windGusts, unit)}
              accent={c.accent}
            />
          </div>
        </motion.div>

        {/* uv */}
        <motion.div variants={item} className="glass-tile col-span-12 rounded-2xl p-5 sm:col-span-6 lg:col-span-4">
          <TileHead icon={SunMedium} label="UV intensity" tint="#e879f9" />
          <div className="mt-4">
            <UvGauge value={data.current.uv} dailyMax={data.daily.uvMax[0] ?? 0} />
          </div>
        </motion.div>

        {/* solar cycle */}
        <motion.div variants={item} className="glass-tile col-span-12 rounded-2xl p-5 lg:col-span-4">
          <TileHead icon={Sun} label="Sunrise & sunset" tint="#a78bfa" />
          <div className="mt-3">
            <SunArc
              sunriseISO={data.daily.sunrise[0]}
              sunsetISO={data.daily.sunset[0]}
              nowMs={now + data.utcOffsetSeconds * 1000}
              accent={c.accent}
            />
          </div>
        </motion.div>

        {/* hourly */}
        <motion.div variants={item} className="glass-tile col-span-12 rounded-2xl p-5">
          <HourlyStrip data={data} unit={unit} />
        </motion.div>
      </div>
    </motion.section>
  );
}
