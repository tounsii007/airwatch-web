/**
 * Pure functions that derive dashboard-card statistics from the schedule
 * + arrival data we already fetch per airport. No new server round-trip
 * — just a different read of the same payload.
 *
 * The thresholds match what aviation-industry dashboards typically use:
 *   * "On-time" = delay ≤ 15 minutes (FAA / EU 261 boundary)
 *   * "Delayed" = 16–60 minutes
 *   * "Severely delayed" = > 60 minutes (counts toward delays but
 *     usually triggers compensation rules)
 *
 * Unit tests in airportMetrics.test.ts cover the edge cases (empty
 * inputs, missing time fields, mixed-type delay values).
 */
import type { AirportScheduleFlight } from '@/lib/types';

export interface AirportMetrics {
  /** Total flights scheduled (departures + arrivals). */
  total: number;
  /** Count of flights with delay ≤ 15 min (or no delay reported). */
  onTime: number;
  /** Count of flights delayed > 15 min. */
  delayed: number;
  /** On-time percentage 0–100 (rounded). 0 when total is 0. */
  onTimePercent: number;
  /** Average non-zero delay in minutes (rounded). 0 when no delays. */
  avgDelayMin: number;
  /** Hour of day (0–23) with the most flights, or null when total = 0. */
  busiestHour: number | null;
  /** 24-element array: flights per local hour. Used for the inline bar chart. */
  hourBuckets: number[];
}

const ON_TIME_THRESHOLD_MIN = 15;

/** Extract hour-of-day (0–23) from an ISO 8601 datetime, or null.
 *  Uses UTC so the result is deterministic regardless of where the
 *  client is — `getHours()` would return a different value depending
 *  on the user's timezone, which makes both the chart and our tests
 *  flaky. The display layer is responsible for converting to local
 *  time when shown to the user. */
function hourOf(time: string | undefined): number | null {
  if (!time) return null;
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCHours();
}

/** Combine departures + arrivals into a single delay vector. Each entry
 *  is the relevant delay for its direction (dep delay for departures,
 *  arr delay for arrivals). */
function delayMinutes(flight: AirportScheduleFlight, direction: 'dep' | 'arr'): number {
  const raw = direction === 'dep' ? flight.depDelayed : flight.arrDelayed;
  return Number.isFinite(raw) ? Math.max(0, raw as number) : 0;
}

export function computeMetrics(
  departures: readonly AirportScheduleFlight[],
  arrivals: readonly AirportScheduleFlight[],
): AirportMetrics {
  const total = departures.length + arrivals.length;
  if (total === 0) {
    return {
      total: 0,
      onTime: 0,
      delayed: 0,
      onTimePercent: 0,
      avgDelayMin: 0,
      busiestHour: null,
      hourBuckets: new Array(24).fill(0),
    };
  }

  let onTime = 0;
  let delayed = 0;
  let delaySum = 0;
  let delayCount = 0;
  const hourBuckets = new Array<number>(24).fill(0);

  for (const f of departures) {
    const delay = delayMinutes(f, 'dep');
    if (delay <= ON_TIME_THRESHOLD_MIN) onTime++;
    else { delayed++; delaySum += delay; delayCount++; }
    const h = hourOf(f.depTime);
    if (h !== null) hourBuckets[h]++;
  }
  for (const f of arrivals) {
    const delay = delayMinutes(f, 'arr');
    if (delay <= ON_TIME_THRESHOLD_MIN) onTime++;
    else { delayed++; delaySum += delay; delayCount++; }
    const h = hourOf(f.arrTime);
    if (h !== null) hourBuckets[h]++;
  }

  // Find the peak hour. argmax over the buckets; ties resolve to the
  // earliest hour so the result is stable across re-fetches.
  let busiestHour = 0;
  let busiestCount = -1;
  for (let h = 0; h < 24; h++) {
    if (hourBuckets[h] > busiestCount) {
      busiestCount = hourBuckets[h];
      busiestHour = h;
    }
  }

  return {
    total,
    onTime,
    delayed,
    onTimePercent: Math.round((onTime / total) * 100),
    avgDelayMin: delayCount > 0 ? Math.round(delaySum / delayCount) : 0,
    busiestHour: busiestCount > 0 ? busiestHour : null,
    hourBuckets,
  };
}
