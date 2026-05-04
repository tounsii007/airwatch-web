/**
 * Per-job pause + min-interval controls. (Phase 2.7)
 *
 * The backend doesn't (yet) reschedule the underlying @Scheduled —
 * each job's first action is a JobOverrideService.shouldRunNow() check
 * that returns false when paused or when min-interval hasn't elapsed.
 * So this UI changes the *effective* cadence without restarting any
 * Spring Boot context.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/(admin)/Toast';

interface Props {
  jobId: string;
  csrfToken: string;
  currentPaused: boolean;
  currentMinIntervalMin: number;
  overrideBy?: string;
}

export function JobOverrideControls({ jobId, csrfToken, currentPaused, currentMinIntervalMin, overrideBy }: Props) {
  const router = useRouter();
  const toast  = useToast();
  const [busy, setBusy] = useState(false);
  const [minInterval, setMinInterval] = useState(String(currentMinIntervalMin));

  async function setOverride(paused: boolean, intervalMin: number) {
    setBusy(true);
    try {
      const params = new URLSearchParams({
        _csrf: csrfToken,
        paused: String(paused),
        minIntervalMin: String(intervalMin),
      });
      const res = await fetch(`/admin/api/jobs/${encodeURIComponent(jobId)}/override?${params}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success(paused ? 'Job paused' : intervalMin > 0 ? `Throttled to every ${intervalMin}min` : 'Override set');
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message ?? `HTTP ${res.status}`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function clearOverride() {
    setBusy(true);
    try {
      const params = new URLSearchParams({ _csrf: csrfToken });
      const res = await fetch(`/admin/api/jobs/${encodeURIComponent(jobId)}/override?${params}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) { toast.success('Override cleared'); setMinInterval('0'); router.refresh(); }
      else        { toast.error('Could not clear'); }
    } finally {
      setBusy(false);
    }
  }

  const hasOverride = currentPaused || currentMinIntervalMin > 0;

  return (
    <div style={{
      marginTop: '0.5rem',
      padding: '0.5rem 0.75rem',
      borderRadius: 4,
      background: hasOverride ? 'color-mix(in srgb, var(--warning) 6%, transparent)' : 'var(--sunken)',
      border: `1px solid ${hasOverride ? 'color-mix(in srgb, var(--warning) 24%, transparent)' : 'var(--border)'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      flexWrap: 'wrap',
      fontSize: '0.7rem',
    }}>
      <span style={{
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-muted)',
      }}>Override:</span>

      <button type="button" disabled={busy}
              onClick={() => void setOverride(!currentPaused, currentMinIntervalMin)}
              style={btnStyle(currentPaused ? 'var(--warning)' : 'var(--text-secondary)')}>
        {currentPaused ? '▶ Resume' : '⏸ Pause'}
      </button>

      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>min interval (min):</span>
        <input type="number" min={0} max={1440} value={minInterval}
               onChange={e => setMinInterval(e.target.value)}
               style={inputStyle} />
        <button type="button" disabled={busy}
                onClick={() => void setOverride(currentPaused, Math.max(0, Number(minInterval) || 0))}
                style={btnStyle('var(--primary-bright)')}>Apply</button>
      </label>

      {hasOverride && (
        <button type="button" disabled={busy} onClick={() => void clearOverride()} style={btnStyle('var(--text-muted)')}>
          Clear all
        </button>
      )}

      {overrideBy && (
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '0.625rem' }}>
          set by {overrideBy}
        </span>
      )}
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color,
    background: `color-mix(in srgb, ${color} 10%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 24%, transparent)`,
    padding: '0.25rem 0.6rem',
    borderRadius: 3,
    cursor: 'pointer' as const,
  };
}
const inputStyle: React.CSSProperties = {
  width: 56,
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '0.2rem 0.4rem',
  color: 'var(--text-primary)',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
};
