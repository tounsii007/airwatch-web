import type { FlightStatEntry } from '@/lib/stores/statsStore';

const TOP_AIRLINES_LIMIT = 5;
const RECENT_FLIGHTS_LIMIT = 20;

export function countUniqueAirlines(flights: readonly FlightStatEntry[]): number {
  const set = new Set<string>();
  flights.forEach((f) => { if (f.airlineIcao) set.add(f.airlineIcao); });
  return set.size;
}

export function countUniqueAirports(flights: readonly FlightStatEntry[]): number {
  const set = new Set<string>();
  flights.forEach((f) => {
    if (f.depIata) set.add(f.depIata);
    if (f.arrIata) set.add(f.arrIata);
  });
  return set.size;
}

/** Top airlines by total view count (icao, count) tuples. */
export function topAirlines(flights: readonly FlightStatEntry[]): [string, number][] {
  const counts = new Map<string, number>();
  flights.forEach((f) => {
    if (!f.airlineIcao) return;
    counts.set(f.airlineIcao, (counts.get(f.airlineIcao) ?? 0) + f.viewCount);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, TOP_AIRLINES_LIMIT);
}

/** Most recently viewed flights, newest first. */
export function recentFlights(flights: readonly FlightStatEntry[]): FlightStatEntry[] {
  return [...flights].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, RECENT_FLIGHTS_LIMIT);
}
