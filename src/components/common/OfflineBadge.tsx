'use client';

import { WifiOff } from 'lucide-react';
import { ageSeconds, isCached } from '@/lib/flights/aircraftFreshness';
import type { AircraftState } from '@/lib/types';

interface Props {
  aircraft: AircraftState;
  /** Current epoch ms — passed in so lists can render one timestamp for the whole batch. */
  nowMs?: number;
}

function formatAge(seconds: number): string {
  if (seconds < 120) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

/**
 * Small "OFFLINE 2m" pill shown on list rows when an aircraft hasn't sent a
 * fresh position lately. Returns null for live aircraft so callers can just
 * drop it in and forget about it.
 */
export function OfflineBadge({ aircraft, nowMs }: Props) {
  // Default computed inside the component body. Date.now() is intentionally
  // called at render time — the badge label is a read-only staleness glance,
  // not something that feeds state.
  // eslint-disable-next-line react-hooks/purity
  const now = nowMs ?? Date.now();
  if (!isCached(aircraft, now)) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[8px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-[var(--text-muted)]/20 text-[var(--text-muted)] tracking-wider">
      <WifiOff size={8} />
      OFFLINE {formatAge(ageSeconds(aircraft, now))}
    </span>
  );
}
