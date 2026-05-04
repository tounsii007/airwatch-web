/**
 * API Keys management card.
 *
 * Lists existing keys, lets the operator mint new ones, and revoke. The
 * plaintext token is returned ONLY by the mint endpoint and is shown in
 * a one-time modal — once dismissed, it can never be retrieved from the
 * backend again. We make the only-shown-once contract obvious in the UI
 * with a copy button + a deliberately-styled warning, so an operator
 * doesn't blow past it and find themselves locked out of their own
 * automation tomorrow.
 *
 * <h3>Why a client component</h3>
 * Mint/revoke are async with mutating fetches, the modal is local state,
 * and the post-mint reveal requires capturing JSON from the response —
 * none of which fit the server-rendered form-POST flow used by the
 * password / 2FA sections above. The CSRF token is passed in from the
 * server-rendered parent so we don't need a second client-side fetch.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

type Role = 'ADMIN' | 'AUDITOR' | 'VIEWER';

interface ApiKey {
  id: number;
  keyId: string;
  name: string;
  role: Role;
  createdAt: string;
  createdBy: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revoked: boolean;
  expired: boolean;
  usable: boolean;
}

interface MintResponse {
  id: number;
  keyId: string;
  token: string;
  name: string;
  role: Role;
  createdAt: string;
  expiresAt: string | null;
  warning: string;
}

export function ApiKeysCard({ csrfToken }: { csrfToken: string }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<MintResponse | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [expiresInDays, setExpiresInDays] = useState('');

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/admin/api/keys', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setKeys(body.keys ?? []);
      setError(null);
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleMint(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const params = new URLSearchParams();
      params.set('_csrf', csrfToken);
      params.set('name', name.trim());
      params.set('role', role);
      if (expiresInDays.trim()) params.set('expiresInDays', expiresInDays.trim());
      const res = await fetch('/admin/api/keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setMinted(body as MintResponse);
      setName('');
      setRole('VIEWER');
      setExpiresInDays('');
      await reload();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'mint failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: number, keyName: string) {
    if (!confirm(`Revoke key "${keyName}"? Existing automation using it will start receiving 401.`)) return;
    setBusy(true);
    try {
      const params = new URLSearchParams();
      params.set('_csrf', csrfToken);
      const res = await fetch(`/admin/api/keys/${id}?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 404) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      await reload();
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'revoke failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card">
      <h2>API Keys</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
        Long-lived bearer tokens for programmatic admin access. Send as{' '}
        <code style={inlineCode}>Authorization: Bearer aw_&lt;keyId&gt;_&lt;secret&gt;</code> on{' '}
        <code style={inlineCode}>/admin/api/*</code>. Tokens inherit their role&apos;s capabilities — an
        ADMIN-bound key can mutate, an AUDITOR-bound key cannot.
      </p>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Mint form */}
      <form onSubmit={handleMint} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ci-deploy-bot"
            required
            maxLength={80}
            style={{ ...inputStyle, minWidth: 220 }}
          />
        </label>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Role</span>
          <select
            value={role}
            onChange={e => setRole(e.target.value as Role)}
            style={{ ...inputStyle, minWidth: 140 }}
          >
            <option value="VIEWER">VIEWER</option>
            <option value="AUDITOR">AUDITOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Expires in (days)</span>
          <input
            type="number"
            value={expiresInDays}
            onChange={e => setExpiresInDays(e.target.value)}
            placeholder="never"
            min={1}
            max={3650}
            style={{ ...inputStyle, width: 120 }}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !name.trim()}
          style={{ ...primaryButtonStyle, opacity: busy || !name.trim() ? 0.4 : 1 }}
        >
          {busy ? 'Minting…' : 'Mint key'}
        </button>
      </form>

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading…</p>
      ) : keys.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No keys minted yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>KeyId</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Expires</th>
                <th style={thStyle}>Last used</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id}>
                  <td style={tdStyle}>{k.name}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem' }}>{k.keyId}</td>
                  <td style={tdStyle}>{k.role}</td>
                  <td style={tdStyle}>{fmtDate(k.createdAt)}</td>
                  <td style={tdStyle}>{k.expiresAt ? fmtDate(k.expiresAt) : <span style={{ color: 'var(--text-muted)' }}>never</span>}</td>
                  <td style={tdStyle}>{k.lastUsedAt ? fmtDate(k.lastUsedAt) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={tdStyle}>
                    <StatusBadge usable={k.usable} revoked={k.revoked} expired={k.expired} />
                  </td>
                  <td style={tdStyle}>
                    {!k.revoked && (
                      <button
                        type="button"
                        onClick={() => void handleRevoke(k.id, k.name)}
                        disabled={busy}
                        style={smallDangerButtonStyle}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* One-time reveal modal */}
      {minted && <RevealModal minted={minted} onClose={() => setMinted(null)} />}
    </section>
  );
}

function RevealModal({ minted, onClose }: { minted: MintResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(minted.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available — operator can select manually */
    }
  }

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: 'var(--primary-bright)' }}>API key minted</h3>
        <p style={{ color: 'var(--warn)', fontSize: '0.8125rem', margin: 0 }}>
          ⚠ {minted.warning}
        </p>
        <div>
          <div style={fieldLabelStyle}>Token (copy now)</div>
          <code
            style={{
              display: 'block',
              padding: '0.75rem 1rem',
              background: 'var(--sunken)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              wordBreak: 'break-all',
              fontSize: '0.8125rem',
              fontFamily: 'monospace',
              color: 'var(--primary-bright)',
            }}
          >
            {minted.token}
          </code>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => void copy()} style={primaryButtonStyle}>
            {copied ? 'Copied ✓' : 'Copy to clipboard'}
          </button>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            I&apos;ve saved it
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ usable, revoked, expired }: { usable: boolean; revoked: boolean; expired: boolean }) {
  if (revoked) return <span style={{ ...badgeStyle, color: 'var(--error)' }}>Revoked</span>;
  if (expired) return <span style={{ ...badgeStyle, color: 'var(--warn)' }}>Expired</span>;
  if (usable)  return <span style={{ ...badgeStyle, color: 'var(--success)' }}>Active</span>;
  return <span style={badgeStyle}>—</span>;
}

function Alert({ tone, children }: { tone: 'success' | 'error'; children: React.ReactNode }) {
  const color = tone === 'success' ? 'var(--success)' : 'var(--error)';
  return (
    <div style={{
      padding: '0.6rem 0.875rem',
      borderRadius: 4,
      color,
      background: `color-mix(in srgb, ${color} 8%, transparent)`,
      border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      fontSize: '0.8125rem',
      marginBottom: '0.75rem',
    }}>
      {children}
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const inlineCode = { color: 'var(--primary-bright)', fontSize: '0.75rem', background: 'var(--sunken)', padding: '1px 6px', borderRadius: 3 };
const fieldLabelStyle = { fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', fontWeight: 700 };
const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: 4 };
const inputStyle = {
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0.5rem 0.75rem',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
};
const primaryButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
  padding: '0.6rem 1.25rem',
  borderRadius: 4,
  cursor: 'pointer' as const,
};
const secondaryButtonStyle = {
  ...primaryButtonStyle,
  color: 'var(--text-primary)',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
};
const smallDangerButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--error)',
  background: 'color-mix(in srgb, var(--error) 10%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 24%, transparent)',
  padding: '0.3rem 0.65rem',
  borderRadius: 3,
  cursor: 'pointer' as const,
};
const badgeStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
};
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: '0.8125rem',
};
const thStyle = {
  textAlign: 'left' as const,
  padding: '0.5rem 0.5rem',
  borderBottom: '1px solid var(--border)',
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  fontWeight: 700,
};
const tdStyle = {
  padding: '0.5rem 0.5rem',
  borderBottom: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
};
const modalBackdropStyle = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
};
const modalCardStyle = {
  background: 'var(--bg-card, #0f1d32)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '1.25rem 1.5rem',
  maxWidth: 640,
  width: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1rem',
};
