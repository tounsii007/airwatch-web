'use client';

/**
 * Tiny, self-rate-limited weather cache for the map's airport-label
 * layer. Each airport's WMO weather code is fetched once on demand,
 * cached in module scope (survives component remounts), and shared
 * across every consumer.
 *
 * <h3>Why module-scope and not a Zustand slice</h3>
 * The map re-creates marker layers on every zoom / pan / style change.
 * Re-fetching weather for the same 200 visible airports on every
 * gesture would crush the upstream proxy. Module-scope keeps the
 * cache outside the component tree so neither React's reconciliation
 * nor the user navigating away resets it.
 *
 * <h3>Cache freshness</h3>
 * Open-Meteo updates roughly every 15 minutes. We hold each entry
 * for 30 minutes — the user sees a slightly stale icon at worst,
 * never a blank during a long pan.
 *
 * <h3>API for consumers</h3>
 * Imperative Leaflet code (the airport-labels layer) needs a
 * synchronous getter, not a hook. Pattern:
 *
 *   prefetchAirportWeather(iata, lat, lon, enabled);  // fire-and-forget
 *   const entry = getCachedWeather(iata);             // sync read
 *   useWeatherCacheTick();                            // re-render on any landing
 */
import { useEffect, useState } from 'react';
import { API } from '@/lib/constants';

/** ms — how long a cached weather code is considered fresh. */
export const WEATHER_TTL_MS = 30 * 60 * 1000;

/** ms — minimum gap between any two upstream calls (rate-limit guard). */
const MIN_INTERVAL_MS = 250;

export interface WeatherCacheEntry {
  /** WMO code 0-99, or null when the upstream returned no data. */
  code: number | null;
  /** Whether the local sun is up (controls day-vs-night icon). */
  isDay: boolean;
  /** ms since epoch — used by the freshness check. */
  fetchedAt: number;
}

const cache = new Map<string, WeatherCacheEntry>();
/** Set of in-flight icao keys so two parallel callers don't re-fetch. */
const inFlight = new Set<string>();
let lastCallAt = 0;

/** Subscribers are notified each time a NEW entry lands in the cache. */
const subscribers = new Set<() => void>();

/** Test-only — wipe the module-scope state between specs. */
export function _resetWeatherCache(): void {
  cache.clear();
  inFlight.clear();
  lastCallAt = 0;
  subscribers.clear();
}

function isFresh(entry: WeatherCacheEntry, now: number): boolean {
  return now - entry.fetchedAt < WEATHER_TTL_MS;
}

function notify(): void {
  subscribers.forEach((fn) => {
    try { fn(); } catch { /* a single bad subscriber must not poison the rest */ }
  });
}

/** Sync read for a previously-cached entry. Returns null if missing. */
export function getCachedWeather(iata: string): WeatherCacheEntry | null {
  return cache.get(iata) ?? null;
}

async function fetchOnce(iata: string, lat: number, lon: number): Promise<void> {
  // Soft global rate-limit so a fast-zoom pulls the visible airport
  // set in a staggered fashion instead of opening 200 sockets at once.
  const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastCallAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();

  try {
    const res = await fetch(API.weather(lat, lon));
    if (!res.ok) return;
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object') return;
    const current = (data as { current?: { weather_code?: number; is_day?: number | boolean } }).current ?? {};
    const code = typeof current.weather_code === 'number' ? current.weather_code : null;
    const isDay = current.is_day === true || current.is_day === 1;
    cache.set(iata, { code, isDay, fetchedAt: Date.now() });
    notify();
  } catch {
    // Fail-soft. The next render will retry next time the airport is
    // visible — no entry in the cache means re-fetch on next frame.
  }
}

/**
 * Schedule a weather fetch for the given airport if there's no fresh
 * entry already cached. No-op when `enabled` is false. Always safe to
 * call from inside a render loop — the in-flight set deduplicates and
 * the rate-limit timer staggers bursts.
 */
export function prefetchAirportWeather(
  iata: string | null | undefined,
  lat: number | null | undefined,
  lon: number | null | undefined,
  enabled: boolean,
): void {
  if (!enabled || !iata || lat == null || lon == null) return;
  const existing = cache.get(iata);
  if (existing && isFresh(existing, Date.now())) return;
  if (inFlight.has(iata)) return;
  inFlight.add(iata);
  void fetchOnce(iata, lat, lon).finally(() => inFlight.delete(iata));
}

/**
 * React hook: re-render the caller whenever ANY new weather entry
 * lands in the cache. The label layer uses this to flush its tooltip
 * HTML once weather codes arrive after the initial paint.
 */
export function useWeatherCacheTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, []);
  return tick;
}
