/**
 * Tiny formatters used across multiple dashboard sections. Kept here
 * rather than scattered as private helpers so the section files stay
 * focused on layout.
 */

/**
 * Compact relative-time string ("12s", "5m", "3h"). The dashboard
 * uses this in dense table rows where "5 minutes ago" wouldn't fit.
 * Falls back to the raw ISO string when parsing fails — the caller
 * sees something visible rather than an empty cell.
 */
export function relativeTime(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
    return `${Math.round(ms / 3_600_000)}h`;
  } catch {
    return iso;
  }
}

/**
 * Absolute timestamp in German locale + Berlin timezone.
 * Returns "02.05.2026, 14:23:45" — the format an operator who lives
 * in Germany would see on their wall clock.
 *
 * Why explicitly Europe/Berlin and not the browser default:
 *   * The api logs everything in UTC (Instant). Server-side rendering
 *     would otherwise format in the SERVER's timezone (the api
 *     container's TZ, which is UTC) — operators would see UTC
 *     values, not their local time. Hard-coding Berlin guarantees a
 *     consistent reading for the German ops team regardless of
 *     where the page renders.
 *   * If you ever need per-user timezones, replace the literal with
 *     a lookup of the operator's preference from /admin/settings.
 *
 * `suppressHydrationWarning` is still recommended on the surrounding
 * element because, with daylight-saving transitions, the SSR output
 * can drift from the CSR output by an hour. Using a fixed timezone
 * narrows but does not eliminate this risk.
 */
const DE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function formatDeDateTime(iso: string | number | Date | null | undefined): string {
  if (iso == null || iso === '') return '—';
  try {
    const d = iso instanceof Date ? iso : new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return DE_FORMATTER.format(d);
  } catch {
    return String(iso);
  }
}

/**
 * Tone derived from an uptime-percentage value. Used by both the
 * PageHeader status pill and the StatusOverviewRow donut so they stay
 * colour-consistent without each computing the threshold separately.
 */
export type StatusTone = 'success' | 'warning' | 'error';

export function toneForUptime(uptimePct: number): StatusTone {
  if (uptimePct === 100) return 'success';
  if (uptimePct >= 80)   return 'warning';
  return 'error';
}

/**
 * Human-readable status caption matching {@link toneForUptime}.
 */
export function captionForUptime(uptimePct: number): string {
  if (uptimePct === 100) return 'ALL SYSTEMS NOMINAL';
  if (uptimePct >= 80)   return 'DEGRADED';
  return 'CRITICAL';
}
