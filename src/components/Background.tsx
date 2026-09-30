import { useMemo } from "react";

interface BackgroundProps {
  accent: string;
  isDay: boolean;
}

const NIGHT_BASE =
  "radial-gradient(1100px 760px at 72% -12%, rgba(112,60,168,0.40), transparent 62%)," +
  "radial-gradient(900px 680px at 8% 112%, rgba(56,44,160,0.34), transparent 62%)," +
  "radial-gradient(760px 560px at 92% 62%, rgba(190,24,140,0.20), transparent 64%)," +
  "linear-gradient(180deg, #06040e 0%, #0b0720 46%, #120a2b 100%)";

const DAY_BASE =
  "radial-gradient(1100px 760px at 74% -12%, rgba(56,102,235,0.36), transparent 62%)," +
  "radial-gradient(950px 700px at 12% 110%, rgba(124,58,237,0.30), transparent 62%)," +
  "radial-gradient(760px 560px at 94% 58%, rgba(219,39,160,0.22), transparent 64%)," +
  "linear-gradient(180deg, #050818 0%, #0b1036 46%, #17103f 100%)";

export default function Background({ accent, isDay }: BackgroundProps) {
  const stars = useMemo(
    () =>
      Array.from({ length: 110 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 72,
        size: Math.random() * 1.7 + 0.6,
        delay: Math.random() * 5,
        dur: 2.4 + Math.random() * 4.5,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* base sky — crossfades between night and day palettes */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ background: NIGHT_BASE, opacity: isDay ? 0 : 1 }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ background: DAY_BASE, opacity: isDay ? 1 : 0 }}
      />

      {/* drifting aurora orbs */}
      <div
        className="absolute -top-36 left-[18%] h-[26rem] w-[26rem] rounded-full opacity-35 blur-[130px]"
        style={{ background: accent, animation: "float-slow 16s ease-in-out infinite" }}
      />
      <div
        className="absolute top-[30%] -right-28 h-80 w-80 rounded-full bg-blue-600/25 blur-[120px]"
        style={{ background: "rgba(37,99,235,0.28)", animation: "float-slow 21s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute bottom-[-6rem] left-[6%] h-72 w-72 rounded-full bg-violet-800/20 blur-[110px]"
        style={{ background: "rgba(124,58,237,0.26)", animation: "float-slow 26s ease-in-out infinite" }}
      />
      <div
        className="absolute top-[12%] left-[46%] h-64 w-64 rounded-full blur-[120px]"
        style={{ background: "rgba(236,72,153,0.22)", animation: "float-slow 19s ease-in-out infinite 1.5s" }}
      />

      {/* starfield (night only) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: isDay ? 0 : 1 }}
      >
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* faint survey grid */}
      <div className="dot-grid absolute inset-0 opacity-40" />

      {/* vignette + grain */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(2,4,10,0.75) 100%)" }}
      />
      <div className="noise absolute inset-0 opacity-[0.05]" />
    </div>
  );
}
