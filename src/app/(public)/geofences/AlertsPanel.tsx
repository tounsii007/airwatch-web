'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, ExternalLink, X, Filter } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { GeoFenceAlert } from '@/lib/stores/geofenceStore';
import { timeAgo, resolveAirlineName, formatAltitude, mapDeepLink } from '@/app/(public)/geofences/alertFormat';

interface Props {
  alerts: GeoFenceAlert[];
  onDismiss: (icao24: string, fenceId: number) => void;
  onClear: () => void;
}

function Header({
  shown,
  total,
  onClear,
}: {
  shown: number;
  total: number;
  onClear: () => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const alertsWord =
    total === 1 ? t('alerts_count_one', language) : t('alerts_count_other', language);
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-[var(--warning)]">
        <Bell size={14} className="animate-pulse-glow" />
        <span className="text-xs font-[var(--font-heading)] font-bold tracking-wider">
          {shown === total ? `${total} ${alertsWord}` : `${shown} / ${total} ${alertsWord}`}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        title={t('clear_all_tooltip', language)}
      >
        {t('clear_all', language)}
      </Button>
    </div>
  );
}

/**
 * Chip selector for filtering alerts by fence. Built from the live
 * alerts array so it always reflects the actual sources of incidents.
 *
 *   All (12)   Fences1 (8)   Frankfurt approach (4)
 *
 * `selected === null` means "no filter — show everything". Clicking
 * "All" clears the filter; clicking a fence chip toggles its membership
 * in the active set.
 */
function FenceFilterBar({
  fenceCounts,
  selected,
  onChange,
}: {
  fenceCounts: { id: number; name: string; count: number }[];
  selected: Set<number> | null;
  onChange: (next: Set<number> | null) => void;
}) {
  if (fenceCounts.length <= 1) return null; // Nothing to filter against.

  const allActive = selected === null;
  const toggle = (id: number) => {
    const next = new Set(selected ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next.size === 0 ? null : next);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3 pb-3 border-b border-[var(--glass-border)]/30">
      <Filter size={10} className="text-[var(--text-muted)] shrink-0" aria-hidden />
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded border tracking-wider font-[var(--font-heading)] transition-colors ${
          allActive
            ? 'bg-[var(--primary)]/20 text-[var(--primary)] border-[var(--primary)]/40 shadow-[0_0_12px_-4px_var(--primary)]'
            : 'bg-transparent text-[var(--text-muted)] border-[var(--glass-border)] hover:text-[var(--text)]'
        }`}
        aria-pressed={allActive}
      >
        ALL
      </button>
      {fenceCounts.map((fc) => {
        const active = selected?.has(fc.id) ?? false;
        return (
          <button
            key={fc.id}
            type="button"
            onClick={() => toggle(fc.id)}
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border tracking-wider font-[var(--font-heading)] transition-colors ${
              active
                ? 'bg-[var(--info)]/25 text-[var(--info)] border-[var(--info)]/50 shadow-[0_0_12px_-4px_var(--info)]'
                : 'bg-transparent text-[var(--text-muted)] border-[var(--glass-border)] hover:text-[var(--text)]'
            }`}
            aria-pressed={active}
            title={`Toggle alerts from "${fc.name}"`}
          >
            <span>{fc.name}</span>
            <span className="opacity-60 tabular">({fc.count})</span>
          </button>
        );
      })}
    </div>
  );
}

function AlertRow({
  alert,
  nowMs,
  onDismiss,
}: {
  alert: GeoFenceAlert;
  nowMs: number;
  onDismiss: (icao24: string, fenceId: number) => void;
}) {
  const language = useSettingsStore((s) => s.language);
  const airlineName = resolveAirlineName(alert.callsign ?? alert.airlineIcao);
  const callsign = alert.callsign ?? alert.icao24;
  const age = timeAgo(alert.timestamp, nowMs);

  return (
    <li
      className="flex items-start gap-2 text-xs border-l-2 border-[var(--warning)]/60 pl-2 py-1 hover:bg-[var(--surface)]/30 rounded-r"
      data-testid="alert-row"
      data-icao24={alert.icao24}
      data-fence-id={alert.fenceId}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={mapDeepLink(alert.icao24)}
            className="font-[var(--font-heading)] text-[var(--warning)] hover:underline inline-flex items-center gap-1"
            title="Show this flight on the live map"
          >
            {callsign} <ExternalLink size={9} />
          </Link>
          <span className="text-[var(--text-muted)]">→ {alert.fenceName}</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-2 flex-wrap">
          {airlineName && <span>{airlineName}</span>}
          <span>{formatAltitude(alert.altitude)}</span>
          {alert.speed > 0 && <span>{Math.round(alert.speed)} km/h</span>}
          <span className="text-[var(--text-muted)]/70" title={new Date(alert.timestamp).toLocaleString()}>
            {age}
          </span>
        </div>
      </div>
      <IconButton
        aria-label={t('dismiss', language)}
        title="Dismiss this alert (does not affect history)"
        onClick={() => onDismiss(alert.icao24, alert.fenceId)}
        variant="ghost"
        size="sm"
        className="shrink-0"
      >
        <X size={11} />
      </IconButton>
    </li>
  );
}

/**
 * Tick the "now" reference every 30 s so all the timeAgo() captions
 * refresh together. Slower than per-second to save renders — 30 s
 * granularity is fine because the captions only print integer minutes/
 * hours after the first minute anyway.
 */
function useNowMs(intervalMs = 30_000): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return nowMs;
}

/** Geofence alert panel with per-fence filter chips, airline names, relative time, and a "show on map" link. */
export function AlertsPanel({ alerts, onDismiss, onClear }: Props) {
  const [selectedFences, setSelectedFences] = useState<Set<number> | null>(null);
  const nowMs = useNowMs();

  // Aggregate the alerts into a per-fence count for the filter bar.
  // useMemo because `alerts` is a frequently-changing reference but
  // the aggregation cost (O(n)) only matters at the cap (100).
  const fenceCounts = useMemo(() => {
    const m = new Map<number, { id: number; name: string; count: number }>();
    for (const a of alerts) {
      const cur = m.get(a.fenceId);
      if (cur) cur.count++;
      else m.set(a.fenceId, { id: a.fenceId, name: a.fenceName, count: 1 });
    }
    return [...m.values()].sort((x, y) => y.count - x.count);
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (selectedFences === null) return alerts;
    return alerts.filter((a) => selectedFences.has(a.fenceId));
  }, [alerts, selectedFences]);

  // The store sometimes deletes fences whose alerts still hang in
  // history. When the filter selection refers to a fence with zero
  // alerts left, drop it from the set so the UI doesn't get stuck on
  // an invisible filter. Empty result after pruning falls back to "no
  // filter" (null).
  useEffect(() => {
    if (selectedFences === null) return;
    const liveIds = new Set(fenceCounts.map((fc) => fc.id));
    const pruned = new Set([...selectedFences].filter((id) => liveIds.has(id)));
    if (pruned.size !== selectedFences.size) {
      setSelectedFences(pruned.size === 0 ? null : pruned);
    }
  }, [fenceCounts, selectedFences]);

  if (alerts.length === 0) return null;

  return (
    <GlassPanel className="mb-6 p-4" data-testid="alerts-panel">
      <Header shown={filteredAlerts.length} total={alerts.length} onClear={onClear} />
      <FenceFilterBar fenceCounts={fenceCounts} selected={selectedFences} onChange={setSelectedFences} />
      {filteredAlerts.length === 0 ? (
        <p className="text-[10px] text-[var(--text-muted)] italic">
          No alerts match the active filter. Tap ALL to clear.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {filteredAlerts.map((a) => (
            <AlertRow key={`${a.fenceId}-${a.icao24}`} alert={a} nowMs={nowMs} onDismiss={onDismiss} />
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
