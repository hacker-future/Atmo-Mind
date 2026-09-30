import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, Droplets, Umbrella } from "lucide-react";
import { fmt, hourlyWindow, parseLocalIso, rainOutlook } from "../lib/weather";
import type { WeatherData } from "../lib/weather";
import Counter from "./Counter";

interface RainForecastProps {
  data: WeatherData;
}

/* ---------- chart geometry ---------- */
const W = 340;
const H = 118;
const PAD_T = 10;
const PAD_B = 26;
const BASE = H - PAD_B;
const PLOT_H = BASE - PAD_T;

/** Catmull-Rom → cubic bezier for a soft precipitation curve. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export default function RainForecast({ data }: RainForecastProps) {
  const [hover, setHover] = useState<number | null>(null);

  const hours = useMemo(() => hourlyWindow(data, 24), [data]);
  const outlook = useMemo(() => rainOutlook(hours), [hours]);

  const series = useMemo(() => {
    if (hours.length === 0) return [];
    const step = W / Math.max(1, hours.length - 1);
    return hours.map((h, i) => ({
      x: i * step,
      y: BASE - (Math.min(100, h.precipProb) / 100) * PLOT_H,
      h,
    }));
  }, [hours]);

  const maxMm = Math.max(0.6, ...hours.map((h) => h.precip));
  const areaPath = series.length
    ? `${smoothPath(series)} L ${series[series.length - 1].x} ${BASE} L ${series[0].x} ${BASE} Z`
    : "";

  const active = hover !== null ? series[hover] : null;
  const activeProb = active ? Math.round(active.h.precipProb) : outlook.nextHourProb;
  const activeMm = active ? active.h.precip : data.current.precipitation;
  const activeLabel = active
    ? active.h.isNow
      ? "Now"
      : fmt(parseLocalIso(active.h.iso), { hour: "numeric", hour12: true })
    : "Next hour";

  const wet = outlook.nextHourProb >= 45 || outlook.hoursToRain !== null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
          <CloudRain size={12} className="text-sky-300" />
          Rain forecast
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] ${
            wet
              ? "border-sky-300/40 bg-sky-300/[0.08] text-sky-200"
              : "border-white/10 bg-white/[0.04] text-white/45"
          }`}
        >
          <Umbrella size={10} />
          {outlook.headline}
        </span>
      </div>

      {/* headline numbers */}
      <div className="mt-4 flex items-end gap-5">
        <div>
          <div className="flex items-baseline">
            <span className="font-display text-5xl leading-none text-white">
              <Counter value={activeProb} />
            </span>
            <span className="ml-1 font-display text-2xl leading-none text-white/40">%</span>
          </div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            {activeLabel} · chance
          </div>
        </div>
        <div className="border-l border-white/[0.09] pl-5">
          <div className="flex items-baseline gap-1">
            <Droplets size={12} className="mb-0.5 text-fuchsia-300" />
            <span className="font-display text-3xl leading-none text-white/90">
              {Math.round(activeMm * 10) / 10}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">mm</span>
          </div>
          <div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            {active ? "expected" : "falling now"}
          </div>
        </div>
      </div>

      {/* chart */}
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="rainArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.5" />
              <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="rainLine" x1="0" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>

          {/* horizontal guides */}
          {[0, 50, 100].map((g) => {
            const y = BASE - (g / 100) * PLOT_H;
            return (
              <g key={g}>
                <line x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2 5" />
                <text x="0" y={y - 3} fontSize="7" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.28)">
                  {g}
                </text>
              </g>
            );
          })}

          {/* precipitation amount bars (mm) */}
          {series.map((p, i) => {
            const bw = W / Math.max(1, hours.length) - 3;
            const bh = (p.h.precip / maxMm) * PLOT_H;
            return p.h.precip > 0 ? (
              <rect
                key={`mm-${i}`}
                x={p.x - bw / 2}
                y={BASE - bh}
                width={Math.max(1.5, bw)}
                height={bh}
                rx={1}
                fill="rgba(96,165,250,0.28)"
              />
            ) : null;
          })}

          {/* area + curve */}
          <motion.path
            d={areaPath}
            fill="url(#rainArea)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.35 }}
          />
          <motion.path
            d={smoothPath(series)}
            fill="none"
            stroke="url(#rainLine)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* now marker */}
          {series.length > 0 && (
            <g>
              <line x1={series[0].x} y1={PAD_T - 4} x2={series[0].x} y2={BASE} stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
              <circle cx={series[0].x} cy={series[0].y} r="3" fill="#fff" />
            </g>
          )}

          {/* hover cursor */}
          {active && (
            <g>
              <line x1={active.x} y1={PAD_T - 6} x2={active.x} y2={BASE} stroke="rgba(244,114,182,0.55)" strokeWidth="1" />
              <circle cx={active.x} cy={active.y} r="4" fill="#f472b6" stroke="#fff" strokeWidth="1.5" />
            </g>
          )}

          {/* baseline + hour labels */}
          <line x1="0" y1={BASE} x2={W} y2={BASE} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
          {series.map((p, i) =>
            i % 4 === 0 || p.h.isNow ? (
              <text
                key={`lbl-${i}`}
                x={Math.min(W - 14, Math.max(10, p.x))}
                y={H - 9}
                textAnchor="middle"
                fontSize="7.5"
                fontFamily="JetBrains Mono, monospace"
                fill={p.h.isNow ? "#93c5fd" : "rgba(255,255,255,0.32)"}
                fontWeight={p.h.isNow ? 600 : 400}
              >
                {p.h.isNow ? "NOW" : fmt(parseLocalIso(p.h.iso), { hour: "numeric", hour12: true })}
              </text>
            ) : null,
          )}

          {/* invisible hit areas for hover */}
          {series.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={(i - 0.5) * (W / Math.max(1, hours.length))}
              y={0}
              width={W / Math.max(1, hours.length)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: "crosshair" }}
            />
          ))}
        </svg>
      </div>

      {/* footer stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-3">
        {[
          { k: "Peak chance", v: `${outlook.peakProb}%` },
          { k: "24h total", v: `${outlook.totalMm} mm` },
          {
            k: "Starts",
            v: outlook.rainStartISO ? fmt(parseLocalIso(outlook.rainStartISO), { hour: "numeric", hour12: true }) : "—",
          },
        ].map((s) => (
          <div key={s.k}>
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">{s.k}</div>
            <div className="mt-1 font-mono text-xs tabular-nums tracking-wide text-white/80">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
