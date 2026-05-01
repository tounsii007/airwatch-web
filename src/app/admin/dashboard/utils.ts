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
