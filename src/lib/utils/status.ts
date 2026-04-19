import { COLORS } from '@/lib/constants';

const STATUS_COLORS: Record<string, string> = {
  'en-route': COLORS.success,
  active: COLORS.success,
  landed: COLORS.primary,
  scheduled: COLORS.warning,
  cancelled: COLORS.error,
};

/** Hex color for a flight status string. Falls back to ground grey. */
export function getStatusColor(status: string | undefined): string {
  return STATUS_COLORS[status?.toLowerCase() ?? ''] ?? COLORS.ground;
}

const STATUS_LABELS: Record<string, string> = {
  'en-route': 'LIVE',
  active: 'LIVE',
  landed: 'LANDED',
  scheduled: 'SCHED',
  cancelled: 'CNCL',
};

/** Short English label for a flight status string. */
export function getStatusLabel(status: string | undefined): string {
  const key = status?.toLowerCase() ?? '';
  return STATUS_LABELS[key] ?? status?.toUpperCase() ?? '';
}
