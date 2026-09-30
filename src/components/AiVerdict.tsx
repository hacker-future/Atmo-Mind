import { motion } from "framer-motion";
import { AlertTriangle, Backpack, Check, Clock, Sparkles } from "lucide-react";
import type { Factor, Verdict } from "../lib/advisor";
import Counter from "./Counter";

const R = 50;
const CIRC = 2 * Math.PI * R;

const STATUS_COLOR: Record<Factor["status"], string> = {
  good: "#7dd3fc",
  ok: "#e879f9",
  bad: "#fb7185",
};

/** One row of the factor breakdown — the "why" behind the score. */
function FactorRow({ f, delay }: { f: Factor; delay: number }) {
  const color = STATUS_COLOR[f.status];
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-[86px_1fr_34px] items-center gap-x-3 sm:grid-cols-[104px_1fr_40px_46px]"
    >
      <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/55">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
        {f.label}
      </span>

      <div className="flex items-center gap-2.5">
        <div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${f.score}%` }}
            transition={{ delay: delay + 0.15, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: `linear-gradient(90deg,${color}bb,${color})` }}
          />
        </div>
        {/* weight marker */}
        <span className="hidden w-9 shrink-0 text-right font-mono text-[8.5px] uppercase tracking-[0.1em] text-white/30 sm:block">
          {Math.round(f.weight * 100)}%
        </span>
      </div>

      <span className="text-right font-mono text-[11px] tabular-nums" style={{ color }}>
        {f.score}
      </span>

      <span className="hidden text-right font-mono text-[10px] tabular-nums text-white/40 sm:block">
        +{f.contribution}
      </span>
    </motion.div>
  );
}

export default function AiVerdict({ verdict, source }: { verdict: Verdict; source: "local" | "backend" | null }) {
  const { color, tone, score } = verdict;

  return (
    <div className="flex flex-col">
      {/* ---------- title row ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            <Sparkles size={12} style={{ color }} />
            AtmoAi verdict
          </div>
          <h2 className="mt-1.5 font-display text-3xl italic leading-tight text-white sm:text-4xl">
            Should you go out?
          </h2>
        </div>
        <span
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.18em] text-white/40"
          title={
            source === "backend"
              ? "Conclusion computed by the AtmoAi backend"
              : "Conclusion computed in the browser"
          }
        >
          AI generated{source ? ` · ${source}` : ""}
        </span>
      </div>

      {/* ---------- verdict ---------- */}
      <div className="mt-5 flex flex-wrap items-center gap-5 sm:gap-7">
        <div className="relative shrink-0">
          <svg viewBox="0 0 110 110" className="h-[104px] w-[104px]">
            <defs>
              <linearGradient id="aiRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#f472b6" />
              </linearGradient>
            </defs>
            <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="7" />
            <motion.circle
              cx="55"
              cy="55"
              r={R}
              fill="none"
              stroke="url(#aiRing)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: CIRC * (1 - score / 100) }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              transform="rotate(-90 55 55)"
              style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl leading-none text-white">
              <Counter value={score} />
            </span>
            <span className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.2em] text-white/40">/ 100</span>
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em]"
            style={{ color, borderColor: `${color}55`, background: `${color}14` }}
          >
            {tone === "go" ? <Check size={11} /> : tone === "no" ? <AlertTriangle size={11} /> : <Clock size={11} />}
            {verdict.label}
          </span>
          <p className="mt-2.5 font-display text-[26px] italic leading-tight text-white sm:text-3xl">
            {verdict.headline}
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-white/60">{verdict.summary}</p>
        </div>
      </div>

      {/* ---------- the explanation ---------- */}
      <div className="mt-6 grid gap-6 border-t border-white/[0.07] pt-5 lg:grid-cols-2 lg:gap-8">
        {/* narrative reasons */}
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">The reasoning</div>
          <ul className="mt-3 space-y-2.5">
            {verdict.reasons.map((r, i) => (
              <motion.li
                key={r}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.11, duration: 0.5 }}
                className="flex gap-2.5 text-[13px] leading-relaxed text-white/70"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: color }} />
                {r}
              </motion.li>
            ))}
          </ul>

          {verdict.window && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-white/50">
              <span className="flex items-center gap-1.5">
                <Clock size={11} style={{ color }} />
                best window
              </span>
              <span className="text-white/80">
                {verdict.window.startLabel} – {verdict.window.endLabel}
              </span>
              <span>{verdict.window.hours}h</span>
              <span>avg {verdict.window.avg}/100</span>
            </div>
          )}

          {verdict.cautions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
                <AlertTriangle size={11} className="text-fuchsia-300/80" />
                Watch out for
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {verdict.cautions.map((c) => (
                  <span
                    key={c}
                    className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/[0.07] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-fuchsia-100/70"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* factor breakdown */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
              How the score was built
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/25">weight · pts</span>
          </div>

          <div className="mt-3.5 space-y-3">
            {verdict.factors?.map((f, i) => (
              <FactorRow key={f.key} f={f} delay={0.4 + i * 0.09} />
            ))}
          </div>

          <div className="mt-3.5 space-y-1.5 border-t border-white/[0.07] pt-3">
            {verdict.factors?.map((f) => (
              <p key={f.key} className="flex gap-2 text-[11.5px] leading-relaxed text-white/45">
                <span
                  className="mt-[6px] h-1 w-1 shrink-0 rounded-full"
                  style={{ background: STATUS_COLOR[f.status] }}
                />
                <span>
                  <span className="text-white/65">{f.label}:</span> {f.detail}
                </span>
              </p>
            ))}
          </div>

          {verdict.gear.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
                <Backpack size={11} className="text-violet-300" />
                Bring along
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {verdict.gear.map((g) => (
                  <span
                    key={g}
                    className="rounded-lg border border-violet-300/20 bg-violet-400/[0.08] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-violet-100/75"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
