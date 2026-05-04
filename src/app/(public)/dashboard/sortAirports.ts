/**
 * Sort strategies for the dashboard airport list. Each strategy is a
 * pure comparator factory — given the loaded-data map it returns a
 * compare-fn that the parent uses with the .sort() it already does.
 *
 * Why a factory pattern rather than `airports.sort((a, b) => ...)`
 * inline: the user can switch sort mode via a dropdown without the
 * caller re-deriving its data; the comparator captures the data it
 * needs in closure so each call site is `airports.sort(comparator)`.
 */
import type { AirportScheduleFlight } from '@/lib/types';
import type { DashboardAirport } from '@/app/(public)/dashboard/dashboardData';
import { computeMetrics } from '@/app/(public)/dashboard/airportMetrics';

export type SortMode = 'alpha' | 'busiest' | 'most_delayed' | 'next_dep';

/** Stable sentinel used to push "no data" entries to the end. */
const SENTINEL = Number.POSITIVE_INFINITY;

function nextDepartureTimestamp(deps: readonly AirportScheduleFlight[]): number {
  const now = Date.now();
  let soonest = SENTINEL;
  for (const f of deps) {
    if (!f.depTime) continue;
    const t = new Date(f.depTime).getTime();
    if (Number.isNaN(t)) continue;
    if (t < now) continue; // skip past departures
    if (t < soonest) soonest = t;
  }
  return soonest;
}

export function comparatorFor(mode: SortMode): (a: DashboardAirport, b: DashboardAirport) => number {
  switch (mode) {
    case 'alpha':
      return (a, b) => a.iata.localeCompare(b.iata);

    case 'busiest':
      return (a, b) => {
        const ma = computeMetrics(a.departures, a.arrivals);
        const mb = computeMetrics(b.departures, b.arrivals);
        return mb.total - ma.total;
      };

    case 'most_delayed':
      return (a, b) => {
        const ma = computeMetrics(a.departures, a.arrivals);
        const mb = computeMetrics(b.departures, b.arrivals);
        // Higher avg delay first; ties broken by total flights.
        return mb.avgDelayMin - ma.avgDelayMin || mb.total - ma.total;
      };

    case 'next_dep':
      return (a, b) => nextDepartureTimestamp(a.departures) - nextDepartureTimestamp(b.departures);
  }
}

export const SORT_LABELS: Record<SortMode, string> = {
  alpha: 'A → Z',
  busiest: 'Busiest first',
  most_delayed: 'Most delayed',
  next_dep: 'Next departure',
};
