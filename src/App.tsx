import { motion } from "framer-motion";
import { Cloud, LocateFixed, RefreshCw, Sparkles } from "lucide-react";
import Background from "./components/Background";
import DailyOutlook from "./components/DailyOutlook";
import Dashboard from "./components/Dashboard";
import LocationPicker from "./components/LocationPicker";
import SearchBar from "./components/SearchBar";
import TripPlanner from "./components/TripPlanner";
import { useWeather } from "./hooks/useWeather";
import { getCondition, type Unit } from "./lib/weather";

function UnitToggle({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
      {(["C", "F"] as const).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`relative rounded-full px-3 py-1.5 font-mono text-[11px] transition-colors ${
            unit === u ? "text-[#0a0616]" : "text-white/55 hover:text-white/85"
          }`}
        >
          {unit === u && (
            <motion.span
              layoutId="unitPill"
              className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-300 via-violet-300 to-fuchsia-300"
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            />
          )}
          <span className="relative">°{u}</span>
        </button>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="glass flex flex-col items-center gap-7 rounded-[28px] px-16 py-16">
      <div className="relative grid place-items-center">
        <div
          className="absolute h-16 w-16 rounded-full bg-fuchsia-400/25 blur-2xl"
          style={{ animation: "twinkle 2.2s ease-in-out infinite" }}
        />
        <Sparkles size={30} className="text-fuchsia-200/90" style={{ animation: "spin 3.2s linear infinite" }} />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/50">Reading the sky…</span>
    </div>
  );
}

export default function App() {
  const w = useWeather();
  const condition = w.data
    ? getCondition(w.data.current.code, w.data.current.isDay)
    : { label: "Atmosphere", Icon: Cloud, accent: "#a78bfa" };
  const loading = w.status === "loading";

  return (
    <div className="relative min-h-screen">
      {/* ================= HERO ================= */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <Background accent={condition.accent} isDay={w.data?.current.isDay ?? false} />

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-8">
          {/* top bar */}
          <header className="flex flex-wrap items-center justify-between gap-3 py-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/25 via-violet-500/25 to-fuchsia-500/25">
                <Sparkles size={16} className="text-fuchsia-200" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-[0.3em] text-white/95">
                  Atmo<span className="text-fuchsia-300">Ai</span>
                </div>
                <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.26em] text-white/40">
                  ai weather intelligence
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <SearchBar onSelect={w.setLocation} />
              <button
                onClick={w.useMyLocation}
                title="Use my location"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-fuchsia-300/40 hover:text-white"
              >
                <LocateFixed size={14} />
              </button>
              <UnitToggle unit={w.unit} onChange={w.setUnit} />
              <button
                onClick={w.refresh}
                title="Refresh"
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-fuchsia-300/40 hover:text-white"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </header>

          {/* cascading location picker — country → state → district → place */}
          <LocationPicker onSelect={w.setLocation} />

          {/* dashboard */}
          <main className="flex flex-1 items-center justify-center py-8 sm:py-10">
            {w.data ? <Dashboard state={w} /> : <LoadingState />}
          </main>

          {/* hero footer */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] py-5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
            <span className="flex items-center gap-2.5">
              <span>AtmoAi · forecast by Open-Meteo</span>
              <span
                className={`rounded-full border px-2 py-0.5 ${
                  w.mode === "backend"
                    ? "border-violet-300/30 bg-violet-300/[0.07] text-violet-200/80"
                    : "border-white/10 bg-white/[0.03] text-white/30"
                }`}
                title={
                  w.mode === "backend"
                    ? "Requests are proxied through the AtmoAi backend with caching and rate limiting"
                    : "The browser talks to Open-Meteo directly. Serve this build with the AtmoAi API to enable the backend."
                }
              >
                {w.mode === "backend" ? "backend" : w.mode === "direct" ? "direct" : "detecting…"}
              </span>
            </span>
            <span className="flex items-center gap-3">
              {w.isMock && <span className="text-amber-300/80">Offline — sample data</span>}
              <span>
                Updated{" "}
                {w.lastUpdated
                  ? w.lastUpdated.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </span>
            </span>
          </footer>
        </div>
      </section>

      {/* ================= TRIP PLANNER ================= */}
      {w.data && (
        <TripPlanner data={w.data} unit={w.unit} locationName={w.location.name} location={w.location} />
      )}

      {/* ================= 7-DAY OUTLOOK ================= */}
      {w.data && <DailyOutlook data={w.data} unit={w.unit} locationName={w.location.name} />}
    </div>
  );
}
