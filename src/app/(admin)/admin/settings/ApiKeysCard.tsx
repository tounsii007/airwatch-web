/**
 * API Keys management card (Phase 1.3 + V12).
 *
 * <h3>What changed in V12</h3>
 * The mint form now accepts:
 *   * Scopes (multi-select chips, validated server-side against
 *     ApiKeyScope.ALL — typos are rejected with a clear error).
 *   * IP allowlist (textarea, comma-separated CIDR).
 *   * Per-key rate limit (req/min, NULL = no per-key cap).
 * The list shows the new fields per row, plus a "Rotate" action that
 * mints a new secret while keeping the old one alive for 24h, and a
 * "Usage" expander that shows top endpoints + p95 latency + the last
 * 50 calls.
 *
 * <h3>Why useLiveData here, not raw fetch</h3>
 * The keys list also doubles as a "did my last mint go through" check;
 * after a mutation we want the table to refresh without spinning the
 * whole page. useLiveData (now SWR-backed) gives us free de-dup with
 * any other widget that subscribes to /admin/api/keys, automatic retry
 * with exponential backoff on a transient 5xx, and an `optimistic`
 * mutate path for the row-level Revoke / Rotate actions.
 */
'use client';

import { useState } from 'react';
import { useLiveData } from '@/app/(admin)/admin/shared/live/useLiveData';

type Role = 'ADMIN' | 'AUDITOR' | 'VIEWER';

interface ApiKey {
  id: number;
  keyId: string;
  name: string;
  role: Role;
  scopes: string | null;
  ipAllowlist: string | null;
  rateLimitPerMin: number | null;
  rotationGraceUntil: string | null;
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
  scopes: string | null;
  ipAllowlist: string | null;
  rateLimitPerMin: number | null;
  warning: string;
}

interface RotateResponse {
  id: number;
  keyId: string;
  token: string;
  graceWindowSec: number;
  warning: string;
}

interface ApiKeyCall {
  occurredAt: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  ip: string | null;
}

interface UsageStats {
  keyId: number;
  windowSec: number;
  topPaths: Array<{
    path: string;
    callCount: number;
    p95LatencyMs: number;
    lastCalledAt: string | null;
  }>;
  totalCalls: number;
}

/**
 * Logical grouping for the scope chips. Mirrors the resource groups in
 * the backend ApiKeyScope class — kept in sync manually because there
 * are only ~12 well-known scopes and changing one is rare.
 */
const SCOPE_GROUPS: Array<{ label: string; scopes: readonly string[] }> = [
  { label: 'Keys',        scopes: ['keys:read', 'keys:write'] },
  { label: 'Incidents',   scopes: ['incidents:read', 'incidents:write'] },
  { label: 'Alerts',      scopes: ['alerts:read', 'alerts:write'] },
  { label: 'Jobs',        scopes: ['jobs:read', 'jobs:write', 'jobs:run'] },
  { label: 'Features',    scopes: ['features:read', 'features:write'] },
  { label: 'Probes',      scopes: ['probes:read', 'probes:write'] },
  { label: 'Maintenance', scopes: ['maintenance:read', 'maintenance:write'] },
  { label: 'Audit',       scopes: ['audit:read'] },
  { label: 'Monitoring',  scopes: ['monitoring:read'] },
  { label: 'Users',       scopes: ['users:read', 'users:write'] },
  { label: 'Settings',    scopes: ['settings:read', 'settings:write'] },
  { label: 'Errors',      scopes: ['errors:read', 'errors:write'] },
];

export function ApiKeysCard({ csrfToken }: { csrfToken: string }) {
  // useLiveData (SWR-backed) — no manual reload, the global refresh
  // button + a successful mutate fan out automatically. We don't poll
  // here because the keys table is operator-edited, not live-changing.
  const live = useLiveData<{ total: number; keys: ApiKey[] }>('/admin/api/keys', {});
  const keys = live.data?.keys ?? [];
  const error = live.error;

  const [minted,   setMinted]   = useState<MintResponse | null>(null);
  const [rotated,  setRotated]  = useState<RotateResponse | null>(null);
  const [busy,     setBusy]     = useState(false);
  const [opError,  setOpError]  = useState<string | null>(null);

  // Mint form state
  const [name,            setName]           = useState('');
  const [role,            setRole]           = useState<Role>('VIEWER');
  const [expiresInDays,   setExpires]        = useState('');
  const [pickedScopes,    setPickedScopes]   = useState<Set<string>>(new Set());
  const [ipAllowlist,     setIpAllowlist]    = useState('');
  const [rateLimit,       setRateLimit]      = useState('');

  // Per-row expanded usage panel
  const [expandedKeyId, setExpandedKeyId] = useState<number | null>(null);

  function toggleScope(scope: string) {
    setPickedScopes(prev => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope); else next.add(scope);
      return next;
    });
  }

  async function handleMint(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setOpError(null);
    try {
      const params = new URLSearchParams();
      params.set('name', name.trim());
      params.set('role', role);
      if (expiresInDays.trim())   params.set('expiresInDays', expiresInDays.trim());
      if (pickedScopes.size > 0)  params.set('scopes', Array.from(pickedScopes).join(','));
      if (ipAllowlist.trim())     params.set('ipAllowlist', ipAllowlist.trim());
      if (rateLimit.trim())       params.set('rateLimitPerMin', rateLimit.trim());
      const res = await fetch('/admin/api/keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRF-Token': csrfToken },
        body: params.toString(),
      });
      const body = await res.json();
      if (!res.ok) {
        setOpError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setMinted(body as MintResponse);
      setName('');
      setRole('VIEWER');
      setExpires('');
      setPickedScopes(new Set());
      setIpAllowlist('');
      setRateLimit('');
      void live.refresh();
    } catch (ex) {
      setOpError(ex instanceof Error ? ex.message : 'mint failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: number, keyName: string) {
    if (!confirm(`Revoke key "${keyName}"? Existing automation using it will start receiving 401.`)) return;
    setBusy(true);
    setOpError(null);
    // Optimistic: flip `revoked` true + `usable` false on this row so the
    // status badge changes the instant the operator confirms. SWR rolls
    // back the cache if the writer throws.
    const optimistic = {
      total: live.data?.total ?? 0,
      keys: keys.map(k => k.id === id ? { ...k, revoked: true, usable: false } : k),
    };
    try {
      await live.mutate(async () => {
        const res = await fetch(`/admin/api/keys/${id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'X-CSRF-Token': csrfToken },
        });
        if (!res.ok && res.status !== 404) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
      }, { optimisticData: optimistic });
    } catch (ex) {
      setOpError(ex instanceof Error ? ex.message : 'revoke failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRotate(id: number, keyName: string) {
    if (!confirm(`Rotate key "${keyName}"? The old token works for 24h, then only the new one.`)) return;
    setBusy(true);
    setOpError(null);
    try {
      const res = await fetch(`/admin/api/keys/${id}/rotate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const body = await res.json();
      if (!res.ok) {
        setOpError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      setRotated(body as RotateResponse);
      void live.refresh();
    } catch (ex) {
      setOpError(ex instanceof Error ? ex.message : 'rotate failed');
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
        <code style={inlineCode}>/admin/api/*</code>. Tokens inherit their role&apos;s capabilities AND
        any scope restrictions you configure — an ADMIN-bound key with only{' '}
        <code style={inlineCode}>jobs:run</code> can trigger jobs but not mint other keys.
      </p>

      {(error || opError) && <Alert tone="error">{opError ?? error}</Alert>}

      {/* Mint form */}
      <form onSubmit={handleMint} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
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
              onChange={e => setExpires(e.target.value)}
              placeholder="never"
              min={1}
              max={3650}
              style={{ ...inputStyle, width: 120 }}
            />
          </label>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Rate limit (req/min)</span>
            <input
              type="number"
              value={rateLimit}
              onChange={e => setRateLimit(e.target.value)}
              placeholder="unlimited"
              min={1}
              max={100000}
              style={{ ...inputStyle, width: 140 }}
            />
          </label>
        </div>

        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>IP allowlist (comma-separated CIDRs)</span>
          <textarea
            value={ipAllowlist}
            onChange={e => setIpAllowlist(e.target.value)}
            placeholder="10.0.0.0/8, 192.168.1.5"
            rows={2}
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8125rem' }}
          />
        </label>

        <div>
          <div style={{ ...fieldLabelStyle, marginBottom: 6 }}>
            Scopes <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
              ({pickedScopes.size === 0 ? 'no restriction — inherits role only' : `${pickedScopes.size} selected`})
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {SCOPE_GROUPS.map(group => (
              <fieldset key={group.label} style={fieldsetStyle}>
                <legend style={legendStyle}>{group.label}</legend>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {group.scopes.map(scope => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      aria-pressed={pickedScopes.has(scope)}
                      style={{
                        ...scopeChipStyle,
                        ...(pickedScopes.has(scope) ? scopeChipActiveStyle : {}),
                      }}
                    >
                      {scope.split(':')[1]}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            style={{ ...primaryButtonStyle, opacity: busy || !name.trim() ? 0.4 : 1 }}
          >
            {busy ? 'Minting…' : 'Mint key'}
          </button>
        </div>
      </form>

      {/* List */}
      {live.loading && keys.length === 0 ? (
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
                <th style={thStyle}>Scopes</th>
                <th style={thStyle}>IP allowlist</th>
                <th style={thStyle}>Rate</th>
                <th style={thStyle}>Last used</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle} />
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <KeyRow
                  key={k.id}
                  k={k}
                  busy={busy}
                  expanded={expandedKeyId === k.id}
                  onToggleExpand={() => setExpandedKeyId(expandedKeyId === k.id ? null : k.id)}
                  onRevoke={() => void handleRevoke(k.id, k.name)}
                  onRotate={() => void handleRotate(k.id, k.name)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* One-time reveal for fresh mint */}
      {minted && (
        <TokenRevealModal
          title="API key minted"
          token={minted.token}
          subtitle={minted.warning}
          onClose={() => setMinted(null)}
        />
      )}
      {/* One-time reveal for rotated key */}
      {rotated && (
        <TokenRevealModal
          title="API key rotated"
          token={rotated.token}
          subtitle={rotated.warning}
          onClose={() => setRotated(null)}
        />
      )}
    </section>
  );
}

function KeyRow({
  k, busy, expanded, onToggleExpand, onRevoke, onRotate,
}: {
  k: ApiKey;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onRevoke: () => void;
  onRotate: () => void;
}) {
  const scopeList = (k.scopes ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const ipList    = (k.ipAllowlist ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return (
    <>
      <tr>
        <td style={tdStyle}>{k.name}</td>
        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.75rem' }}>{k.keyId}</td>
        <td style={tdStyle}>{k.role}</td>
        <td style={tdStyle}>
          {scopeList.length === 0
            ? <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>unrestricted</span>
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {scopeList.map(s => <span key={s} style={scopeBadgeStyle}>{s}</span>)}
              </div>}
        </td>
        <td style={tdStyle}>
          {ipList.length === 0
            ? <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>any</span>
            : <span style={{ fontFamily: 'monospace', fontSize: '0.7rem' }} title={k.ipAllowlist ?? ''}>
                {ipList.length === 1 ? ipList[0] : `${ipList.length} CIDRs`}
              </span>}
        </td>
        <td style={tdStyle}>
          {k.rateLimitPerMin == null
            ? <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>
            : <span style={{ fontVariantNumeric: 'tabular-nums' }}>{k.rateLimitPerMin}/min</span>}
        </td>
        <td style={tdStyle}>
          {k.lastUsedAt ? fmtDate(k.lastUsedAt) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
        </td>
        <td style={tdStyle}>
          <StatusBadge usable={k.usable} revoked={k.revoked} expired={k.expired} rotation={!!k.rotationGraceUntil} />
        </td>
        <td style={tdStyle}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" onClick={onToggleExpand} disabled={busy} style={smallNeutralButtonStyle}>
              {expanded ? '−' : '⊕'} Usage
            </button>
            {!k.revoked && (
              <>
                <button type="button" onClick={onRotate} disabled={busy} style={smallNeutralButtonStyle}>
                  ↺ Rotate
                </button>
                <button type="button" onClick={onRevoke} disabled={busy} style={smallDangerButtonStyle}>
                  Revoke
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9} style={{ padding: 0, background: 'var(--sunken)' }}>
            <UsagePanel keyId={k.id} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Drop-in expansion under a key row. Loads usage stats + last-50 calls
 * lazily — only when expanded — so the keys table doesn't waste cycles
 * fetching analytics for every row on first paint.
 */
function UsagePanel({ keyId }: { keyId: number }) {
  const usage = useLiveData<UsageStats>(`/admin/api/keys/${keyId}/usage`, {});
  const calls = useLiveData<{ keyId: number; calls: ApiKeyCall[] }>(`/admin/api/keys/${keyId}/calls?limit=50`, {});

  if (usage.loading && !usage.data) {
    return <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Loading usage…</div>;
  }
  if (usage.error) {
    return <div style={{ padding: '0.75rem 1rem', color: 'var(--error)', fontSize: '0.75rem' }}>Failed to load usage: {usage.error}</div>;
  }

  const stats = usage.data;
  const callsList = calls.data?.calls ?? [];

  return (
    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.7rem' }}>
        <span><strong>Total calls:</strong> {stats?.totalCalls ?? 0}</span>
        <span><strong>Window:</strong> last {Math.round((stats?.windowSec ?? 86400) / 3600)} h</span>
        <span style={{ color: 'var(--text-muted)' }}>(history capped at last 100 per key)</span>
      </div>

      {/* Top paths */}
      <div>
        <div style={{ ...fieldLabelStyle, marginBottom: 4 }}>Top endpoints</div>
        {!stats || stats.topPaths.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No calls recorded.</div>
        ) : (
          <table style={{ ...tableStyle, fontSize: '0.75rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Path</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Calls</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>p95 (ms)</th>
                <th style={thStyle}>Last call</th>
              </tr>
            </thead>
            <tbody>
              {stats.topPaths.map(p => (
                <tr key={p.path}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{p.path}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.callCount}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(p.p95LatencyMs)}
                  </td>
                  <td style={tdStyle}>{p.lastCalledAt ? fmtDate(p.lastCalledAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Last calls */}
      <div>
        <div style={{ ...fieldLabelStyle, marginBottom: 4 }}>Last {callsList.length} calls</div>
        {callsList.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No calls recorded yet.</div>
        ) : (
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            <table style={{ ...tableStyle, fontSize: '0.7rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Method</th>
                  <th style={thStyle}>Path</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Latency</th>
                  <th style={thStyle}>IP</th>
                </tr>
              </thead>
              <tbody>
                {callsList.map((c, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{fmtDate(c.occurredAt)}</td>
                    <td style={tdStyle}>{c.method}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{c.path}</td>
                    <td style={{
                      ...tdStyle,
                      color: c.status >= 500 ? 'var(--error)'
                          : c.status >= 400 ? 'var(--warn)'
                          : 'var(--success)',
                    }}>{c.status}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.latencyMs}ms</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.65rem' }}>{c.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TokenRevealModal({ title, token, subtitle, onClose }: {
  title: string;
  token: string;
  subtitle: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available — operator can select manually */
    }
  }

  return (
    <div style={modalBackdropStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: 0, color: 'var(--primary-bright)' }}>{title}</h3>
        <p style={{ color: 'var(--warn)', fontSize: '0.8125rem', margin: 0 }}>
          ⚠ {subtitle}
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
            {token}
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

function StatusBadge({ usable, revoked, expired, rotation }: {
  usable: boolean; revoked: boolean; expired: boolean; rotation: boolean;
}) {
  if (revoked)  return <span style={{ ...badgeStyle, color: 'var(--error)' }}>Revoked</span>;
  if (expired)  return <span style={{ ...badgeStyle, color: 'var(--warn)' }}>Expired</span>;
  if (rotation) return <span style={{ ...badgeStyle, color: 'var(--info)' }}>Rotating</span>;
  if (usable)   return <span style={{ ...badgeStyle, color: 'var(--success)' }}>Active</span>;
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
const fieldsetStyle = {
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '4px 8px 6px',
  margin: 0,
  background: 'color-mix(in srgb, var(--surface) 60%, transparent)',
};
const legendStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.6rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-muted)',
  padding: '0 4px',
};
const scopeChipStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.6rem',
  letterSpacing: '0.05em',
  textTransform: 'lowercase' as const,
  color: 'var(--text-secondary)',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '2px 7px',
  cursor: 'pointer' as const,
};
const scopeChipActiveStyle = {
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 14%, transparent)',
  borderColor: 'color-mix(in srgb, var(--primary-bright) 32%, transparent)',
};
const scopeBadgeStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.6rem',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  background: 'color-mix(in srgb, var(--primary-bright) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 22%, transparent)',
  borderRadius: 3,
  padding: '1px 5px',
  whiteSpace: 'nowrap' as const,
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
const smallNeutralButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-secondary)',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  padding: '0.3rem 0.65rem',
  borderRadius: 3,
  cursor: 'pointer' as const,
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
