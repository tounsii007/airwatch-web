/**
 * Operator UI for runtime feature flags. (Phase 2.8)
 *
 * Lists every flag from the backend's catalog with a toggle. Flips
 * persist via /admin/api/features/flags/{key}?enabled=… and a toast
 * confirms. The "Reset to default" button clears the override so the
 * flag returns to its compiled-in default — useful after an experiment.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';

interface Flag {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  enabled: boolean;
  isOverridden: boolean;
}

export function FeatureFlagsCard({ csrfToken }: { csrfToken: string }) {
  const [flags, setFlags] = useState<Record<string, Flag>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/features/flags', { credentials: 'include' });
      if (!res.ok) return;
      const body = await res.json();
      setFlags(body.flags ?? {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  async function toggle(flag: Flag) {
    if (!csrfToken) return;
    setBusy(flag.key);
    try {
      // CSRF token rides in the X-CSRF-Token header, never the URL — a
      // query-string token leaks via access logs, the Referer header and
      // browser history. The backend CsrfTokenService accepts the header.
      const params = new URLSearchParams({ enabled: String(!flag.enabled) });
      const res = await fetch(`/admin/api/features/flags/${encodeURIComponent(flag.key)}?${params}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) { toast.success(`${flag.label} ${!flag.enabled ? 'enabled' : 'disabled'}`); await reload(); }
      else        { toast.error(`Could not toggle ${flag.key}`); }
    } finally {
      setBusy(null);
    }
  }

  async function reset(flag: Flag) {
    if (!csrfToken) return;
    setBusy(flag.key);
    try {
      const res = await fetch(`/admin/api/features/flags/${encodeURIComponent(flag.key)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) { toast.success(`${flag.label} reset to default`); await reload(); }
      else        { toast.error('Reset failed'); }
    } finally {
      setBusy(null);
    }
  }

  const entries = Object.values(flags);

  return (
    <section className="admin-card">
      <h2>Feature flags</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
        Runtime toggles for behaviour shipped behind a flag. Consumer code calls{' '}
        <code style={inlineCode}>FeatureFlagService.isEnabled(key, default)</code>.
        Flipping a flag here takes effect on the next call — no restart required.
      </p>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No flags defined.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {entries.map(f => (
            <div key={f.key} style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: 4,
              borderLeft: `3px solid ${f.isOverridden ? 'var(--warning)' : (f.enabled ? 'var(--success)' : 'var(--text-muted)')}`,
              background: 'var(--sunken)',
            }}>
              <Toggle
                enabled={f.enabled}
                onChange={() => void toggle(f)}
                disabled={busy === f.key || !csrfToken}
                ariaLabel={`Toggle ${f.label}`}
              />
              <div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'var(--font-heading)' }}>
                  {f.label}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 1 }}>
                  <code style={{ ...inlineCode, fontSize: '0.7rem' }}>{f.key}</code> · {f.description}
                </div>
              </div>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Default: {f.defaultEnabled ? 'on' : 'off'}
              </span>
              {f.isOverridden && csrfToken && (
                <button type="button" disabled={busy === f.key} onClick={() => void reset(f)}
                        style={resetButtonStyle}>
                  Reset
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Toggle({ enabled, onChange, disabled, ariaLabel }: {
  enabled: boolean; onChange: () => void; disabled: boolean; ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: enabled ? 'color-mix(in srgb, var(--success) 35%, var(--surface))' : 'var(--sunken)',
        border: `1px solid ${enabled ? 'color-mix(in srgb, var(--success) 50%, var(--border))' : 'var(--border)'}`,
        position: 'relative',
        cursor: disabled ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 200ms, border-color 200ms',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 1,
        left: enabled ? 17 : 1,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: enabled ? 'var(--success)' : 'var(--text-muted)',
        transition: 'left 200ms',
      }} />
    </button>
  );
}

const inlineCode = { color: 'var(--primary-bright)', background: 'var(--sunken)', padding: '1px 5px', borderRadius: 3, fontSize: '0.75rem' };
const resetButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--warning)',
  background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
  padding: '0.3rem 0.65rem',
  borderRadius: 3,
  cursor: 'pointer',
};
