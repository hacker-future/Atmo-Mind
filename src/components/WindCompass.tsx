import { useMemo } from "react";
import { motion } from "framer-motion";
import { cardinal } from "../lib/weather";
import Counter from "./Counter";

interface WindCompassProps {
  speed: number; // already unit-converted
  unitLabel: string;
  direction: number; // meteorological degrees (origin)
  gusts: number;
  accent: string;
}

export default function WindCompass({ speed, unitLabel, direction, gusts, accent }: WindCompassProps) {
  const ticks = useMemo(() => {
    const arr: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = [];
    for (let i = 0; i < 72; i++) {
      const a = (i * 5 * Math.PI) / 180;
      const major = i % 18 === 0;
      const mid = i % 6 === 0;
      const r1 = major ? 43 : mid ? 46.5 : 49.5;
      arr.push({
        x1: 60 + r1 * Math.sin(a),
        y1: 60 - r1 * Math.cos(a),
        x2: 60 + 53 * Math.sin(a),
        y2: 60 - 53 * Math.cos(a),
        major,
      });
    }
    return arr;
  }, []);

  return (
    <div className="flex items-center gap-5">
      {/* dial */}
      <div className="relative shrink-0">
        <svg viewBox="0 0 120 120" className="h-28 w-28 sm:h-32 sm:w-32">
          <circle cx="60" cy="60" r="55" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.major ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"}
              strokeWidth={t.major ? 1.6 : 1}
            />
          ))}
          {[
            { l: "N", x: 60, y: 33 },
            { l: "E", x: 88, y: 63 },
            { l: "S", x: 60, y: 93 },
            { l: "W", x: 32, y: 63 },
          ].map((c) => (
            <text
              key={c.l}
              x={c.x}
              y={c.y}
              textAnchor="middle"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              fill={c.l === "N" ? accent : "rgba(255,255,255,0.45)"}
              fontWeight={c.l === "N" ? 600 : 400}
            >
              {c.l}
            </text>
          ))}

          {/* needle — points where the wind is traveling toward */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: direction + 180 }}
            transition={{ type: "spring", stiffness: 42, damping: 13 }}
            style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}
          >
            <path d="M60 12 L66.5 44 L60 37.5 L53.5 44 Z" fill={accent} />
            <path d="M60 37.5 L60 63" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="60" cy="63" r="2.6" fill="rgba(255,255,255,0.55)" />
          </motion.g>

          <circle cx="60" cy="60" r="3.4" fill="#0b1120" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
        </svg>
      </div>

      {/* readout */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-5xl leading-none tracking-tight">
            <Counter value={speed} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">{unitLabel}</span>
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          from {cardinal(direction)} · {direction}°
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
          gusts {gusts} {unitLabel}
        </div>
      </div>
    </div>
  );
}

