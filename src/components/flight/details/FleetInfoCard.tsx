'use client';

/**
 * FleetInfoCard — "About this airframe" tile on the flight detail panel.
 *
 * <h3>Data sources merged server-side</h3>
 * Calls {@code /api/proxy/aircraft/<icao24>}, which the API merges from:
 *  - hexdb.io registry record (manufacturer, type, registration,
 *    operator, year built when present)
 *  - AirWatch's own sighting history (first/last seen, total sightings)
 *
 * The merge is server-side so we don't pay two round-trips on every
 * panel open — the open-panel-then-close-immediately mobile gesture
 * was the original motivation for collapsing this into a single fetch.
 *
 * <h3>Render strategy</h3>
 * Sections that have no data hide entirely; the card itself only
 * renders if at least one section has content. We never show "Unknown"
 * placeholders — they're noise.
 */

import { useEffect, useState } from 'react';
import { History, Plane } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import type { AppLanguage } from '@/lib/types';

interface Props {
  icao24: string;
  language: AppLanguage;
}

interface RegistryRaw {
  Registration?: string;
  Manufacturer?: string;
  Type?: string;
  ICAOTypeCode?: string;
  RegisteredOwners?: string;
  OperatorFlagCode?: string;
  ManufacturerYear?: string | number;
  Built?: string | number;
}

interface Sightings {
  firstSeenAt?: string;
  lastSeenAt?: string;
  count?: number;
  registration?: string;
  typeCode?: string;
}

interface AircraftResponse {
  icao24: string;
  registry?: RegistryRaw;
  sightings?: Sightings;
}

/**
 * Best-effort year extraction from hexdb's loosely-typed registry.
 * Returns null if no plausible 4-digit year can be parsed.
 */
function pickYear(reg: RegistryRaw | undefined): number | null {
  if (!reg) return null;
  const candidates: Array<string | number | undefined> = [reg.ManufacturerYear, reg.Built];
  for (const c of candidates) {
    if (c == null) continue;
    const m = String(c).match(/(19|20)\d{2}/);
    if (m) {
      const y = Number.parseInt(m[0], 10);
      // Sanity bound — anything outside 1950..currentYear+1 is junk.
      const now = new Date().getUTCFullYear();
      if (y >= 1950 && y <= now + 1) return y;
    }
  }
  return null;
}

/** Number of full years between {@code from} and now. Negative → 0. */
function yearsSince(year: number): number {
  const now = new Date().getUTCFullYear();
  return Math.max(0, now - year);
}

/**
 * Lightweight relative-time formatter used for "first/last seen". Uses
 * Intl.RelativeTimeFormat where available; falls back to plain English
 * fragments so older tests with a stripped-down happy-dom still pass.
 */
function relativeFromNow(iso: string, language: AppLanguage): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return iso;
  const diffMs = then - Date.now();
  const absSec = Math.abs(diffMs) / 1000;
  // Pick the largest unit where |value| >= 1.
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year',   60 * 60 * 24 * 365],
    ['month',  60 * 60 * 24 * 30],
    ['week',   60 * 60 * 24 * 7],
    ['day',    60 * 60 * 24],
    ['hour',   60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, secs] of units) {
    if (absSec >= secs || unit === 'second') {
      const v = Math.round(diffMs / 1000 / secs);
      try {
        return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(v, unit);
      } catch {
        return `${v} ${unit}${Math.abs(v) === 1 ? '' : 's'}`;
      }
    }
  }
  return iso;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-[var(--primary)]/30 pl-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
          {title}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function FleetInfoCard({ icao24, language }: Props) {
  const [data, setData] = useState<AircraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!icao24) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/proxy/aircraft/${icao24}`, { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) { setError(true); return; }
        const body: AircraftResponse = await res.json();
        if (!cancelled) setData(body);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [icao24]);

  // Loading: don't render the card at all to avoid layout pop. The
  // existing MetadataSection above us covers the gap.
  if (loading) return null;
  if (error || !data) return null;

  const year = pickYear(data.registry);
  const hasRegistry = Boolean(
    data.registry && (data.registry.RegisteredOwners || year || data.registry.OperatorFlagCode));
  const hasSightings = Boolean(data.sightings && data.sightings.count);

  // Hide the card when neither subsection has content; nothing to surface.
  if (!hasRegistry && !hasSightings) return null;

  return (
    <div className="px-4 py-3 border-b border-[var(--glass-border)]">
      <div className="flex items-center gap-2 mb-3">
        <Plane size={14} className="text-[var(--primary)]" />
        <span className="text-xs font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
          {t('fleet_info_title', language)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hasRegistry && (
          <Section icon={<Plane size={11} className="text-[var(--primary)]/60" />} title={t('fleet_registry', language)}>
            {data.registry?.RegisteredOwners && (
              <KeyValueRow label={t('fleet_owner', language)} value={data.registry.RegisteredOwners} />
            )}
            {year && (
              <KeyValueRow
                label={t('fleet_built', language)}
                value={`${year}`}
                hint={`${yearsSince(year)} ${t('fleet_years_old', language)}`}
              />
            )}
            {data.registry?.Registration && (
              <KeyValueRow label="REG" value={data.registry.Registration} copyable />
            )}
            {data.registry?.OperatorFlagCode && (
              <KeyValueRow label={t('fleet_flag', language)} value={data.registry.OperatorFlagCode} />
            )}
          </Section>
        )}

        {hasSightings && (
          <Section icon={<History size={11} className="text-[var(--primary)]/60" />} title={t('fleet_sightings', language)}>
            {data.sightings?.firstSeenAt && (
              <KeyValueRow label={t('fleet_first_seen', language)} value={relativeFromNow(data.sightings.firstSeenAt, language)} />
            )}
            {data.sightings?.lastSeenAt && (
              <KeyValueRow label={t('fleet_last_seen', language)} value={relativeFromNow(data.sightings.lastSeenAt, language)} />
            )}
            {typeof data.sightings?.count === 'number' && (
              <KeyValueRow label={t('fleet_total_sightings', language)} value={data.sightings.count.toLocaleString(language)} />
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
