/**
 * Pure aggregation helpers for the geo-fence stats widget.
 *
 * Stats are derived from the in-browser `geofenceStore` alerts list, not
 * from a backend endpoint — alerts already arrive over WebSocket and the
 * store caps the history at 100 entries, so a per-fence rollup is cheap
 * to compute on every render with useMemo.
 */

import type { GeoFenceAlert } from '@/lib/stores/geofenceStore';
import { resolveAirlineName } from '@/app/(public)/geofences/alertFormat';

export interface FenceStats {
  /** Total alerts recorded for this fence in the history window. */
  total: number;
  /** Most frequent airline (resolved name + count). null when callsigns
   *  are absent or the dedup map sees no winners. */
  topAirline: { code: string; name: string | undefined; count: number } | null;
  /** Unique aircraft (by icao24) that triggered this fence. */
  uniqueAircraft: number;
  /** ISO timestamp of the newest alert. null when no alerts. */
  latestAt: string | null;
  /** Average altitude across all alerts (metres). null when no alerts. */
  avgAltitudeMeters: number | null;
}

const EMPTY: FenceStats = {
  total: 0,
  topAirline: null,
  uniqueAircraft: 0,
  latestAt: null,
  avgAltitudeMeters: null,
};

/**
 * Compute the per-fence rollup. O(n) over the alerts list — caller is
 * expected to memoise on the alerts reference.
 *
 * `fenceId` matches against `GeoFenceAlert.fenceId`. Alerts with no
 * matching fence id contribute nothing.
 */
export function computeFenceStats(alerts: readonly GeoFenceAlert[], fenceId: number): FenceStats {
  const subset = alerts.filter((a) => a.fenceId === fenceId);
  if (subset.length === 0) return EMPTY;

  // Top airline: prefer the airlineIcao field; fall back to the first 3 chars
  // of the callsign because the backend may omit airlineIcao for non-airline
  // traffic (private jets, military, GA).
  const airlineCounts = new Map<string, number>();
  let altSum = 0;
  const seenAircraft = new Set<string>();
  let latestAt: string | null = null;

  for (const a of subset) {
    seenAircraft.add(a.icao24);
    altSum += a.altitude;
    if (!latestAt || a.timestamp > latestAt) latestAt = a.timestamp;
    const code = (a.airlineIcao ?? a.callsign ?? '').trim().slice(0, 3).toUpperCase();
    if (code.length === 3) airlineCounts.set(code, (airlineCounts.get(code) ?? 0) + 1);
  }

  let topAirline: FenceStats['topAirline'] = null;
  if (airlineCounts.size > 0) {
    let bestCode = '';
    let bestCount = 0;
    for (const [code, count] of airlineCounts) {
      if (count > bestCount) { bestCode = code; bestCount = count; }
    }
    topAirline = { code: bestCode, name: resolveAirlineName(bestCode), count: bestCount };
  }

  return {
    total: subset.length,
    topAirline,
    uniqueAircraft: seenAircraft.size,
    latestAt,
    avgAltitudeMeters: Math.round(altSum / subset.length),
  };
}
