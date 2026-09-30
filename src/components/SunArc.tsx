import { motion } from "framer-motion";
import { Moon, Sunrise, Sunset } from "lucide-react";
import { durLabel, fmt, parseLocalIso } from "../lib/weather";

interface SunArcProps {
  sunriseISO: string;
  sunsetISO: string;
  nowMs: number; // location wall-clock, in the shifted UTC frame
  accent: string;
}

const CX = 150;
const CY = 112;
const R = 126;
const ARC_D = "M 24 112 A 126 126 0 0 1 276 112";

export default function SunArc({ sunriseISO, sunsetISO, nowMs, accent }: SunArcProps) {
  const sunrise = parseLocalIso(sunriseISO).getTime();
  const sunset = parseLocalIso(sunsetISO).getTime();
  const p = Math.max(0, Math.min(1, (nowMs - sunrise) / (sunset - sunrise)));
  const daylight = sunset - sunrise;

  // sun position along the semicircle (left -> over the top -> right)
  const phi = Math.PI * (1 - p);
  const sunX = CX + R * Math.cos(phi);
  const sunY = CY - R * Math.sin(phi);

  const time = (iso: string) => fmt(parseLocalIso(iso), { hour: "2-digit", minute: "2-digit", hour12: true });

  let status: string;
  if (nowMs < sunrise) status = `Sunrise in ${durLabel(sunrise - nowMs)}`;
  else if (nowMs >= sunset) status = `Daylight was ${durLabel(daylight)}`;
  else status = `${durLabel(sunset - nowMs)} of light left`;

  return (
    <div className="flex h-full flex-col">
      <div className="relative">
        <svg viewBox="0 0 300 132" className="w-full">
          <defs>
            <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="55%" stopColor={accent} />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>

          {/* horizon */}
          <line x1="6" y1="112" x2="294" y2="112" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="2 6" />

          {/* full track */}
          <path d={ARC_D} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />

          {/* elapsed daylight */}
          <motion.path
            d={ARC_D}
            fill="none"
            stroke="url(#sunGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: p }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* the sun, if above the horizon */}
          {p > 0 && p < 1 && (
            <g style={{ filter: "drop-shadow(0 0 10px rgba(232,121,249,0.9))" }}>
              <motion.circle
                cx={sunX}
                cy={sunY}
                r="5"
                fill="#f0abfc"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 14 }}
                style={{ transformOrigin: `${sunX}px ${sunY}px`, transformBox: "view-box" }}
              />
              <motion.circle
                cx={sunX}
                cy={sunY}
                r="5"
                fill="none"
                stroke="rgba(232,121,249,0.6)"
                strokeWidth="1.2"
                animate={{ r: [5, 18], opacity: [0.7, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              />
            </g>
          )}

          {/* the moon, when the sun is down */}
          {(p <= 0 || p >= 1) && (
            <motion.g
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <foreignObject x="136" y="26" width="28" height="28">
                <div className="grid h-7 w-7 place-items-center text-indigo-300/90">
                  <Moon size={18} />
                </div>
              </foreignObject>
            </motion.g>
          )}
        </svg>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            <Sunrise size={12} className="text-violet-300/80" /> Sunrise
          </span>
          <span className="font-display text-2xl leading-none">{time(sunriseISO)}</span>
        </div>

        <div className="hidden flex-col items-center gap-1 pb-1 sm:flex">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">Daylight</span>
          <span className="font-mono text-[11px] tracking-[0.08em] text-white/70">{durLabel(daylight)}</span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
            Sunset <Sunset size={12} className="text-fuchsia-300/80" />
          </span>
          <span className="font-display text-2xl leading-none">{time(sunsetISO)}</span>
        </div>
      </div>

      <div className="mt-3 border-t border-white/[0.07] pt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
        {status}
      </div>
    </div>
  );
}
