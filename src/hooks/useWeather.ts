import { useCallback, useEffect, useRef, useState } from "react";
import { getWeather, mockWeather, reverseGeocode, useBackendMode } from "../lib/api";
import { DEFAULT_LOCATION } from "../lib/geo";
import type { Location, Unit, WeatherData } from "../lib/weather";

export type Status = "loading" | "ready";

export interface WeatherState {
  location: Location;
  data: WeatherData | null;
  status: Status;
  isMock: boolean;
  lastUpdated: Date | null;
  unit: Unit;
  setUnit: (u: Unit) => void;
  setLocation: (loc: Location) => void;
  useMyLocation: () => void;
  refresh: () => void;
  mode: "backend" | "direct" | null;
}

export function useWeather(): WeatherState {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [data, setData] = useState<WeatherData | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [isMock, setIsMock] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [unit, setUnit] = useState<Unit>("C");
  const reqId = useRef(0);
  const located = useRef(false);

  /** Manual selection locks out the auto-geolocation race. */
  const setLoc = useCallback((loc: Location) => {
    located.current = true;
    setLocation(loc);
  }, []);

  const load = useCallback(async (loc: Location) => {
    const id = ++reqId.current;
    setStatus("loading");
    try {
      const d = await getWeather(loc);
      if (id !== reqId.current) return;
      setData(d);
      setIsMock(false);
      setLastUpdated(new Date());
      setStatus("ready");
    } catch {
      if (id !== reqId.current) return;
      setData(mockWeather());
      setIsMock(true);
      setLastUpdated(new Date());
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    load(location);
  }, [location, load]);

  // Auto-detect location on first mount (falls back to San Francisco silently).
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (!located.current) {
            located.current = true;
            setLocation(loc);
          }
        } catch {
          /* keep default */
        }
      },
      () => {
        /* permission denied — keep default */
      },
      { timeout: 6000, maximumAge: 300_000 },
    );
  }, []);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        located.current = true;
        setLocation(loc);
      },
      () => {
        /* ignore */
      },
      { timeout: 8000, maximumAge: 0 },
    );
  }, []);

  const refresh = useCallback(() => {
    load(location);
  }, [location, load]);

  return {
    location,
    data,
    status,
    isMock,
    lastUpdated,
    unit,
    setUnit,
    setLocation: setLoc,
    useMyLocation,
    refresh,
    /** "backend" when proxied through the AtmoAi API, "direct" for Open-Meteo */
    mode: useBackendMode(),
  };
}

/** Ticking clock hook — returns epoch ms, re-rendering on an interval. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
