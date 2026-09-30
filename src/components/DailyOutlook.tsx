import { motion } from "framer-motion";
import { dayName, dispTemp, getCondition, type Unit, type WeatherData } from "../lib/weather";

interface DailyOutlookProps {
  data: WeatherData;
  unit: Unit;
  locationName: string;
}

export default function DailyOutlook({ data, unit, locationName }: DailyOutlookProps) {
  const { days, min, max, codes, uvMax } = data.daily;
  const weekMin = Math.min(...min);
  const weekMax = Math.max(...max);
  const span = Math.max(1, weekMax - weekMin);

  return (
    <section className="relative border-t border-white/[0.06] bg-[#03050a]">
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.04]" />
      <div className="relative mx-auto max-w-5xl px-4 py-20 sm:px-8 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap items-end justify-between gap-6"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-violet-300/70">
              7-day outlook — {locationName}
            </div>
            <h2 className="mt-3 font-display text-5xl italic leading-none text-white/95 sm:text-6xl">
              The week ahead
            </h2>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
            {dispTemp(weekMin, unit)}° — {dispTemp(weekMax, unit)}° range
          </div>
        </motion.div>

        <div className="mt-12">
          {days.map((d, i) => {
            const { Icon, accent, label } = getCondition(codes[i], true);
            const lo = dispTemp(min[i], unit);
            const hi = dispTemp(max[i], unit);
            const left = ((min[i] - weekMin) / span) * 100;
            const width = Math.max(4, ((max[i] - min[i]) / span) * 100);
            return (
              <motion.div
                key={d}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="group grid grid-cols-[44px_26px_1fr_52px] items-center gap-3 border-b border-white/[0.06] py-4 transition-colors last:border-0 hover:bg-white/[0.025] sm:grid-cols-[64px_30px_1fr_62px_88px] sm:gap-6"
                title={label}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                  {dayName(d, i)}
                </span>
                <Icon size={18} strokeWidth={1.5} style={{ color: accent }} className="transition-transform duration-500 group-hover:scale-110" />

                <div className="flex items-center gap-3">
                  <span className="w-8 shrink-0 text-right text-sm tabular-nums text-white/50">{lo}°</span>
                  <div className="relative h-1 flex-1 rounded-full bg-white/[0.08]">
                    <motion.div
                      className="absolute inset-y-0 rounded-full"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: "linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6)",
                        transformOrigin: "left",
                      }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.2 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-sm font-medium tabular-nums text-white/95">{hi}°</span>
                </div>

                <div className="flex items-center justify-end gap-1 font-mono text-[9px] uppercase tracking-[0.14em] tabular-nums">
                  <span
                    className={
                      (data.daily.precipProbMax[i] ?? 0) >= 45
                        ? "text-fuchsia-200/90"
                        : (data.daily.precipProbMax[i] ?? 0) >= 20
                          ? "text-violet-200/70"
                          : "text-white/30"
                    }
                  >
                    {Math.round(data.daily.precipProbMax[i] ?? 0)}%
                  </span>
                </div>

                <div className="hidden justify-end font-mono text-[9px] uppercase tracking-[0.18em] text-white/35 sm:flex">
                  UV {Math.round(uvMax[i])}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
