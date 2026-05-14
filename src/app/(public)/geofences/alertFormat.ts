/**
 * Pure formatting helpers for the geo-fence alert panel.
 *
 * Lives in a separate file so the heavy <AlertsPanel /> JSX doesn't
 * have to bundle in test setup, and so the formatters can be unit-
 * tested at function-level without React + happy-dom overhead.
 */

import { AIRLINES } from '@/lib/data/airlines';
import { CONVERSION } from '@/lib/constants';

/**
 * Time-since formatter that produces compact human-readable spans:
 *
 *   < 5 s    → "just now"
 *   < 60 s   → "12s"
 *   < 60 m   → "5m"
 *   < 24 h   → "3h"
 *   ≥ 24 h   → "2d"
 *
 * `nowMs` is injected so tests are deterministic — pass Date.now() at
 * call site, never let the formatter read the clock itself.
 */
export function timeAgo(timestamp: string | number, nowMs: number): string {
  const t = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (Number.isNaN(t)) return '—';
  const diffMs = nowMs - t;
  if (diffMs < 0) return 'just now'; // future timestamp (clock skew) — treat as "now"
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

/**
 * Look up an airline name from either an ICAO code or a callsign whose
 * first three letters are the ICAO. Returns undefined when the code is
 * unknown so the caller can fall back to the raw code.
 *
 * The web app already has resolveAirline() in src/lib/data/airlines.ts
 * but that one is callsign-only — we deliberately accept either form
 * here because alerts may carry the airline ICAO directly (from the
 * backend's Aircraft.airlineIcao field) when the callsign is empty.
 */
export function resolveAirlineName(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const key = code.trim().slice(0, 3).toUpperCase();
  return AIRLINES[key]?.name;
}

/**
 * Format altitude as a flight-level + meters string:
 *   - 11280 m → "FL370 (11280 m)"
 *   -  1500 m → "1500 m (4921 ft)"
 *
 * Aircraft.altitude in the backend's payload is stored in metres
 * (Airlabs delivers metres). FL = pressure altitude / 100 ft so FL370
 * = 37000 ft ≈ 11280 m. We pick FL notation only above the standard
 * transition altitude (typically 18000 ft / 5500 m); below that we
 * show metres+feet because that's how local ATC talks.
 */
export function formatAltitude(meters: number | null | undefined): string {
  if (meters == null || Number.isNaN(meters)) return '—';
  const ft = Math.round(meters * CONVERSION.metersToFeet);
  if (ft >= 18000) {
    const fl = Math.round(ft / 100);
    return `FL${fl} (${Math.round(meters)} m)`;
  }
  return `${Math.round(meters)} m (${ft.toLocaleString()} ft)`;
}

/**
 * Build a deep-link to the live map with a specific aircraft pre-
 * selected. The map page reads `?icao24=...` on mount; this helper
 * just constructs the path so test code can assert on it.
 */
export function mapDeepLink(icao24: string): string {
  return `/?icao24=${encodeURIComponent(icao24)}`;
}
