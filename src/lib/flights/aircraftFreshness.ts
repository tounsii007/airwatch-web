import type { AircraftState } from '@/lib/types';

/** How long an aircraft stays "live" after its last update.
 *  Set to 200 s so the freshness window comfortably outlasts the backend's
 *  WS broadcast cadence (push-interval-ms, default 180 s). With the previous
 *  90 s value flights would go stale-and-hidden between broadcasts, causing
 *  the map to visibly thin out every cycle. */
export const FRESH_THRESHOLD_MS = 200 * 1000;

/** How long we remember an aircraft after it goes silent — useful for search/saved. */
export const CACHED_TTL_MS = 15 * 60 * 1000;

export function isFresh(ac: AircraftState, nowMs: number): boolean {
  return nowMs - ac.lastUpdate < FRESH_THRESHOLD_MS;
}

export function isCached(ac: AircraftState, nowMs: number): boolean {
  const age = nowMs - ac.lastUpdate;
  return age >= FRESH_THRESHOLD_MS && age < CACHED_TTL_MS;
}

export function isExpired(ac: AircraftState, nowMs: number): boolean {
  return nowMs - ac.lastUpdate >= CACHED_TTL_MS;
}

/** Seconds since the last position update — handy for "offline since X" labels. */
export function ageSeconds(ac: AircraftState, nowMs: number): number {
  return Math.round((nowMs - ac.lastUpdate) / 1000);
}

/**
 * Merge a freshly-polled aircraft batch into the previous map.
 * Fresh entries win; silent-but-recent entries are preserved; expired ones drop.
 */
export function mergeAircraftMaps(
  previous: ReadonlyMap<string, AircraftState>,
  fresh: ReadonlyMap<string, AircraftState>,
  nowMs: number,
): Map<string, AircraftState> {
  const out = new Map<string, AircraftState>();
  fresh.forEach((ac, id) => out.set(id, ac));
  previous.forEach((ac, id) => {
    if (out.has(id)) return;
    if (isExpired(ac, nowMs)) return;
    out.set(id, ac);
  });
  return out;
}
