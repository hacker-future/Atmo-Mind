import { motion } from "framer-motion";
import { uvInfo } from "../lib/weather";
import Counter from "./Counter";

interface UvGaugeProps {
  value: number;
  dailyMax: number;
}

const ARC_D = "M 24 104 A 76 76 0 0 1 176 104";
const PIVOT = { x: 100, y: 104 };
const R = 58;

export default function UvGauge({ value, dailyMax }: UvGaugeProps) {
  const p = Math.max(0, Math.min(1, value / 11));
  const info = uvInfo(value);

  // needle tip when drawn pointing left (180°), rotated clockwise by p * 180
  const tipX = PIVOT.x - R;
  const tipY = PIVOT.y;

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const theta = Math.PI - (i / 11) * Math.PI;
    return {
      x1: PIVOT.x + 84 * Math.cos(theta),
      y1: PIVOT.y - 84 * Math.sin(theta),
      x2: PIVOT.x + 90 * Math.cos(theta),
      y2: PIVOT.y - 90 * Math.sin(theta),
    };
  });

  return (
    <div className="flex h-full flex-col">
      <div className="relative mx-auto w-full max-w-[220px]">
        <svg viewBox="0 0 200 120" className="w-full">
          <defs>
            <linearGradient id="uvGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="32%" stopColor="#818cf8" />
              <stop offset="56%" stopColor="#a78bfa" />
              <stop offset="78%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>

          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="1.4"
            />
          ))}

          {/* track */}
          <path d={ARC_D} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="10" strokeLinecap="round" />

          {/* animated value arc */}
          <motion.path
            d={ARC_D}
            fill="none"
            stroke="url(#uvGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: p }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* needle */}
          <motion.g
            initial={{ rotate: 0 }}
            animate={{ rotate: p * 180 }}
            transition={{ type: "spring", stiffness: 46, damping: 14 }}
            style={{ transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`, transformBox: "view-box" }}
          >
            <line x1={PIVOT.x} y1={PIVOT.y} x2={tipX} y2={tipY} stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" />
            <circle cx={tipX} cy={tipY} r="2.6" fill="#ffffff" />
          </motion.g>
          <circle cx={PIVOT.x} cy={PIVOT.y} r="4.2" fill="#0b1120" stroke="rgba(255,255,255,0.4)" strokeWidth="1.3" />

          {/* scale ends */}
          <text x="24" y="118" textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.35)">
            0
          </text>
          <text x="176" y="118" textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.35)">
            11+
          </text>
        </svg>

        {/* value readout */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[-6px] flex flex-col items-center">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-5xl leading-none">
              <Counter value={Math.round(value * 10) / 10} decimals={1} />
            </span>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col items-center gap-1.5 text-center">
        <span
          className="rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: info.color, borderColor: `${info.color}55`, background: `${info.color}14` }}
        >
          {info.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{info.tip}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
          today's peak {Math.round(dailyMax * 10) / 10}
        </span>
      </div>
    </div>
  );
}
