import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { ALL_PLACES } from "../lib/geo";
import type { Location } from "../lib/weather";

interface SearchBarProps {
  onSelect: (loc: Location) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const id = setTimeout(() => {
      const q = query.toLowerCase();
      // search the same curated tree the picker uses — instant, and consistent
      const r = ALL_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          p.region.toLowerCase().includes(q),
      )
        .slice(0, 8)
        .map<Location>((p) => ({
          name: p.name,
          admin1: p.country === "India" ? `${p.district}, ${p.region}` : p.region,
          country: p.country,
          latitude: p.lat,
          longitude: p.lon,
        }));
      setResults(r);
      setOpen(r.length > 0);
    }, 120);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const choose = (loc: Location) => {
    onSelect(loc);
    setQ("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 transition-colors focus-within:border-sky-300/40 focus-within:bg-white/[0.08]">
        <Search size={13} className="shrink-0 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) choose(results[0]);
            if (e.key === "Escape") setOpen(false);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search city…"
          className="w-32 bg-transparent text-sm text-white placeholder-white/35 outline-none sm:w-48"
        />
      </div>

      {open && (
        <div className="glass absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl p-1.5" style={{ animation: "rise-fade 0.25s ease both" }}>
          {results.map((r) => (
            <button
              key={`${r.name}-${r.latitude}-${r.longitude}`}
              onClick={() => choose(r)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
            >
              <MapPin size={13} className="shrink-0 text-sky-300/70" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white/90">{r.name}</span>
                {r.admin1 && (
                  <span className="block truncate font-mono text-[9px] uppercase tracking-[0.15em] text-white/40">
                    {r.admin1}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.15em] text-white/40">
                {r.country}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
