'use client';

import { Activity, Plane } from 'lucide-react';
import type { GeoFenceAlert } from '@/lib/stores/geofenceStore';
import { computeFenceStats } from '@/app/(public)/geofences/fenceStats';
import { timeAgo } from '@/app/(public)/geofences/alertFormat';
import { useEffect, useMemo, useState } from 'react';

/**
 * Compact stats badge rendered next to each fence row. Shows nothing
 * when the fence has zero triggers — keeps the empty-state list clean.
 */
export function FenceStatsBadge({
  fenceId,
  alerts,
}: {
  fenceId: number | undefined;
  alerts: readonly GeoFenceAlert[];
}) {
  // Refresh the "X ago" caption every 30 s without recomputing the
  // stats themselves — alerts are already memoised below.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    if (fenceId == null) return null;
    return computeFenceStats(alerts, fenceId);
  }, [alerts, fenceId]);

  if (!stats || stats.total === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2 mt-1 text-[10px] text-[var(--text-muted)]"
      data-testid="fence-stats"
      data-fence-id={fenceId}
    >
      <span
        className="inline-flex items-center gap-1"
        title={`${stats.total} alerts in the local history (max 100)`}
      >
        <Activity size={9} /> {stats.total} hit{stats.total === 1 ? '' : 's'}
      </span>
      <span title={`${stats.uniqueAircraft} unique aircraft`}>
        <Plane size={9} className="inline" /> {stats.uniqueAircraft} aircraft
      </span>
      {stats.topAirline && (
        <span
          title={
            stats.topAirline.name
              ? `Top airline: ${stats.topAirline.name} (${stats.topAirline.count}× this fence)`
              : `Top airline: ${stats.topAirline.code}`
          }
        >
          top: <span className="text-[var(--info)]">{stats.topAirline.code}</span>{' '}
          ×{stats.topAirline.count}
        </span>
      )}
      {stats.latestAt && (
        <span title={new Date(stats.latestAt).toLocaleString()}>
          last {timeAgo(stats.latestAt, nowMs)}
        </span>
      )}
    </div>
  );
}
