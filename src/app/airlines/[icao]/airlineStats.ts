import type { AirlineFlight } from '@/app/airlines/[icao]/airlineTypes';

export interface AirlineStats {
  active: number;
  routes: number;
  ground: number;
}

function isActive(status: string | undefined): boolean {
  const s = status?.toLowerCase();
  return s === 'en-route' || s === 'active';
}

function isOnGround(status: string | undefined): boolean {
  return status?.toLowerCase() === 'landed';
}

function routeKey(f: AirlineFlight): string | null {
  return f.depIata && f.arrIata ? `${f.depIata}-${f.arrIata}` : null;
}

/** Aggregate per-airline stats (active flights / unique routes / on-ground). */
export function computeAirlineStats(flights: readonly AirlineFlight[]): AirlineStats {
  const routes = new Set<string>();
  let active = 0;
  let ground = 0;
  for (const f of flights) {
    if (isActive(f.status)) active++;
    if (isOnGround(f.status)) ground++;
    const key = routeKey(f);
    if (key) routes.add(key);
  }
  return { active, ground, routes: routes.size };
}

/** Case-insensitive substring filter over icao/iata/dep/arr codes. */
export function filterFlights(flights: readonly AirlineFlight[], search: string): AirlineFlight[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...flights];
  return flights.filter((f) =>
    f.flightIcao.toLowerCase().includes(q) ||
    f.flightIata.toLowerCase().includes(q) ||
    f.depIata.toLowerCase().includes(q) ||
    f.arrIata.toLowerCase().includes(q),
  );
}
