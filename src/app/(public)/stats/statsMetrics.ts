import type { FlightStatEntry } from '@/lib/stores/statsStore';

const TOP_AIRLINES_LIMIT = 5;
const TOP_ROUTES_LIMIT = 5;
const TOP_AIRPORTS_LIMIT = 5;
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

export interface RouteEntry {
  key: string;
  dep: string;
  arr: string;
  views: number;
}

/**
 * Most-viewed routes by total view count. Only counts flights that have
 * both a departure and arrival IATA — partial route data is dropped so
 * the list doesn't include phantom "→ ?" entries.
 */
export function topRoutes(flights: readonly FlightStatEntry[]): RouteEntry[] {
  const counts = new Map<string, RouteEntry>();
  flights.forEach((f) => {
    if (!f.depIata || !f.arrIata) return;
    const key = `${f.depIata}-${f.arrIata}`;
    const existing = counts.get(key);
    if (existing) {
      existing.views += f.viewCount;
    } else {
      counts.set(key, { key, dep: f.depIata, arr: f.arrIata, views: f.viewCount });
    }
  });
  return Array.from(counts.values()).sort((a, b) => b.views - a.views).slice(0, TOP_ROUTES_LIMIT);
}

/** Top airports by appearance count across both departure and arrival sides. */
export function topAirports(flights: readonly FlightStatEntry[]): [string, number][] {
  const counts = new Map<string, number>();
  flights.forEach((f) => {
    if (f.depIata) counts.set(f.depIata, (counts.get(f.depIata) ?? 0) + f.viewCount);
    if (f.arrIata) counts.set(f.arrIata, (counts.get(f.arrIata) ?? 0) + f.viewCount);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, TOP_AIRPORTS_LIMIT);
}

/** Most recently viewed flights, newest first. */
export function recentFlights(flights: readonly FlightStatEntry[]): FlightStatEntry[] {
  return [...flights].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, RECENT_FLIGHTS_LIMIT);
}

/**
 * 24-element histogram of views indexed by the hour of `lastSeenAt`
 * (local browser time). Each bucket is the *sum of viewCount* for
 * flights last seen in that hour — a useful proxy for "when do you
 * usually open the app" without storing a per-view timestamp.
 */
export function viewsByHour(flights: readonly FlightStatEntry[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  flights.forEach((f) => {
    const hour = new Date(f.lastSeenAt).getHours();
    buckets[hour] += f.viewCount;
  });
  return buckets;
}

export interface ActivitySummary {
  /** Timestamp of the earliest `firstSeenAt` across all flights, or null when empty. */
  trackingSince: number | null;
  /** Number of distinct calendar days on which any flight was last seen. */
  daysActive: number;
  /** ISO date (YYYY-MM-DD) of the most active day, or null when empty. */
  peakDay: string | null;
  /** Total views recorded on the peak day. */
  peakDayViews: number;
}

/**
 * Aggregate "how you've been using AirWatch" facts in a single pass.
 * Operates on `lastSeenAt` for activity bucketing and `firstSeenAt` for
 * the tracking-since anchor.
 */
export function activitySummary(flights: readonly FlightStatEntry[]): ActivitySummary {
  if (flights.length === 0) {
    return { trackingSince: null, daysActive: 0, peakDay: null, peakDayViews: 0 };
  }

  let earliest = flights[0].firstSeenAt;
  const byDay = new Map<string, number>();

  flights.forEach((f) => {
    if (f.firstSeenAt < earliest) earliest = f.firstSeenAt;
    const day = isoDay(f.lastSeenAt);
    byDay.set(day, (byDay.get(day) ?? 0) + f.viewCount);
  });

  let peakDay: string | null = null;
  let peakDayViews = 0;
  byDay.forEach((views, day) => {
    if (views > peakDayViews) {
      peakDay = day;
      peakDayViews = views;
    }
  });

  return {
    trackingSince: earliest,
    daysActive: byDay.size,
    peakDay,
    peakDayViews,
  };
}

/** Render a date as `YYYY-MM-DD` in local time — used as a stable map key. */
function isoDay(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
