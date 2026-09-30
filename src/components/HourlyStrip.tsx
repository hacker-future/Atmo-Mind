import { useMemo } from "react";
import { Clock3, Umbrella } from "lucide-react";
import { dispTemp, fmt, getCondition, hourlyWindow, parseLocalIso, type Unit } from "../lib/weather";
import type { WeatherData } from "../lib/weather";

interface HourlyStripProps {
  data: WeatherData;
  unit: Unit;
}

export default function HourlyStrip({ data, unit }: HourlyStripProps) {
  const hours = useMemo(() => hourlyWindow(data, 24), [data]);
  const maxProb = Math.max(20, ...hours.map((h) => h.precipProb));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">Next 24 hours</span>
        <span className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
          <span className="flex items-center gap-1.5">
            <Umbrella size={11} className="text-fuchsia-300/80" /> rain
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Clock3 size={11} /> local time
          </span>
        </span>
      </div>

      <div className="scroll-thin mt-4 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {hours.map((h) => {
          const { Icon, accent } = getCondition(h.code, h.day);
          const barH = Math.round((h.precipProb / maxProb) * 16) + 2;
          return (
            <div
              key={h.iso}
              className={`group flex min-w-[66px] snap-start flex-col items-center gap-2 rounded-xl border px-2 py-3 transition-colors ${
                h.isNow
                  ? "border-fuchsia-300/40 bg-fuchsia-300/[0.08]"
                  : "border-white/[0.07] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
              }`}
              title={`${getCondition(h.code, h.day).label} · ${Math.round(h.precipProb)}% rain`}
            >
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  h.isNow ? "text-fuchsia-200" : "text-white/45"
                }`}
              >
                {h.isNow ? "Now" : fmt(parseLocalIso(h.iso), { hour: "numeric", hour12: true })}
              </span>
              <Icon
                size={20}
                strokeWidth={1.5}
                style={{ color: accent, filter: `drop-shadow(0 0 8px ${accent}55)` }}
                className="transition-transform duration-500 group-hover:-translate-y-0.5"
              />
              <span className="text-sm font-medium tabular-nums text-white/90">{dispTemp(h.temp, unit)}°</span>

              {/* rain probability bar */}
              <span className="flex h-[18px] items-end">
                <span
                  className="w-[7px] rounded-full transition-all duration-700"
                  style={{
                    height: `${barH}px`,
                    background:
                      h.precipProb >= 45
                        ? "linear-gradient(180deg,#f472b6,#8b5cf6)"
                        : "linear-gradient(180deg,rgba(167,139,250,0.6),rgba(59,130,246,0.35))",
                    opacity: h.precipProb < 5 ? 0.25 : 1,
                  }}
                />
              </span>
              <span
                className={`font-mono text-[9px] tabular-nums ${
                  h.precipProb >= 45 ? "text-fuchsia-200/90" : "text-white/35"
                }`}
              >
                {Math.round(h.precipProb)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
