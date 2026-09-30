import { useMemo, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { COUNTRIES, districtsOf, GEO_STATS, hasDistricts, type GeoPlace } from "../lib/geo";
import type { Location } from "../lib/weather";

interface LocationPickerProps {
  onSelect: (loc: Location) => void;
}

/* ---------------- styled native select ---------------- */

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  accent: string;
}) {
  return (
    <label className="group flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.2em] text-white/35">
        {label}
        <span className="tabular-nums text-white/20">{options.length}</span>
      </span>
      <span className="relative block">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none truncate rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-8 text-left text-[12.5px] text-white/90 outline-none transition-colors hover:border-white/25 focus:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0d0a1c] text-white">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35 transition-colors group-hover:text-white/60"
        />
        {/* accent rail */}
        <span
          className="pointer-events-none absolute left-[3px] top-1/2 w-[3px] -translate-y-1/2 rounded-full transition-opacity"
          style={{ background: accent, height: "55%", opacity: disabled ? 0.2 : 0.75 }}
        />
      </span>
    </label>
  );
}

/* ---------------- picker ---------------- */

export default function LocationPicker({ onSelect }: LocationPickerProps) {
  const [countryName, setCountryName] = useState(COUNTRIES[0].name); // India by default
  const [regionName, setRegionName] = useState(COUNTRIES[0].regions[0].name);
  const [districtName, setDistrictName] = useState("");
  const [placeName, setPlaceName] = useState("");

  const country = useMemo(
    () => COUNTRIES.find((c) => c.name === countryName) ?? COUNTRIES[0],
    [countryName],
  );

  const region = useMemo(
    () => country.regions.find((r) => r.name === regionName) ?? country.regions[0],
    [country, regionName],
  );

  const districts = useMemo(() => districtsOf(region), [region]);
  const deep = hasDistricts(region);

  const district = useMemo(
    () => districts.find((d) => d.name === districtName) ?? districts[0],
    [districts, districtName],
  );

  const place: GeoPlace | undefined = useMemo(
    () => district?.locations.find((p) => p.name === placeName) ?? district?.locations[0],
    [district, placeName],
  );

  /** Emit the resolved location whenever the selection changes. */
  const emit = (cName: string, rName: string, dName: string, pName: string) => {
    const c = COUNTRIES.find((x) => x.name === cName);
    const r = c?.regions.find((x) => x.name === rName);
    if (!c || !r) return;
    const ds = districtsOf(r);
    const d = ds.find((x) => x.name === dName) ?? ds[0];
    const p = d?.locations.find((x) => x.name === pName) ?? d?.locations[0];
    if (!p) return;

    // For India we show "District, State" so the header reads naturally.
    const admin1 = c.name === "India" ? `${d.name}, ${r.name}` : r.name;

    onSelect({
      name: p.name,
      admin1,
      country: c.name,
      latitude: p.lat,
      longitude: p.lon,
    });
  };

  const pickCountry = (v: string) => {
    const c = COUNTRIES.find((x) => x.name === v) ?? COUNTRIES[0];
    const r = c.regions[0];
    const d = districtsOf(r)[0];
    const p = d?.locations[0];
    setCountryName(c.name);
    setRegionName(r.name);
    setDistrictName(d?.name ?? "");
    setPlaceName(p?.name ?? "");
    emit(c.name, r.name, d?.name ?? "", p?.name ?? "");
  };

  const pickRegion = (v: string) => {
    const r = country.regions.find((x) => x.name === v) ?? country.regions[0];
    const d = districtsOf(r)[0];
    const p = d?.locations[0];
    setRegionName(r.name);
    setDistrictName(d?.name ?? "");
    setPlaceName(p?.name ?? "");
    emit(country.name, r.name, d?.name ?? "", p?.name ?? "");
  };

  const pickDistrict = (v: string) => {
    const d = districts.find((x) => x.name === v) ?? districts[0];
    const p = d?.locations[0];
    setDistrictName(d?.name ?? "");
    setPlaceName(p?.name ?? "");
    emit(country.name, region.name, d?.name ?? "", p?.name ?? "");
  };

  const pickPlace = (v: string) => {
    setPlaceName(v);
    emit(country.name, region.name, district?.name ?? "", v);
  };

  const accent = "#a78bfa";

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-3.5 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.24em] text-white/45">
        <MapPin size={11} style={{ color: accent }} />
        Choose a location
        <span className="hidden text-white/25 sm:inline">— country · state · district · place</span>
        <span
          className="ml-auto hidden font-mono text-[8.5px] uppercase tracking-[0.16em] text-white/25 md:inline"
          title={`${GEO_STATS.districts} districts · ${GEO_STATS.places} locations · ${GEO_STATS.countries} countries`}
        >
          {GEO_STATS.countries} countries · {GEO_STATS.places} places
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 lg:gap-5">
        <Select
          label="Country"
          value={country.name}
          onChange={pickCountry}
          accent={accent}
          options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
        />

        <Select
          label="State / UT"
          value={region?.name ?? ""}
          onChange={pickRegion}
          accent={accent}
          options={country.regions.map((r) => ({ value: r.name, label: r.name }))}
        />

        <Select
          label="District"
          value={deep ? (district?.name ?? "") : "—"}
          onChange={pickDistrict}
          disabled={!deep}
          accent={accent}
          options={
            deep
              ? districts.map((d) => ({ value: d.name, label: d.name }))
              : [{ value: "—", label: "No district level" }]
          }
        />

        <Select
          label="Location"
          value={place?.name ?? ""}
          onChange={pickPlace}
          accent={accent}
          options={(district?.locations ?? []).map((p) => ({ value: p.name, label: p.name }))}
        />
      </div>

      {place && (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.07] pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
          <span className="text-white/60">{place.name}</span>
          <span>·</span>
          <span>{district?.name}</span>
          <span>·</span>
          <span>{region?.name}</span>
          <span>·</span>
          <span>{country.name}</span>
          <span className="ml-auto tabular-nums">
            {place.lat.toFixed(3)}°, {place.lon.toFixed(3)}°
          </span>
        </div>
      )}
    </div>
  );
}
