'use client';

/**
 * Postgres replication state (Phase 8).
 *
 * Polls /admin/api/monitoring/db-replication and renders:
 *  * the role of the api's connected node (primary vs replica)
 *  * one row per connected standby with sync state + lag in seconds
 *  * one row per replication slot (so a stale slot pinning WAL is
 *    obvious before the primary's disk fills)
 *
 * The query is cheap (system view + small slots table) so we poll on
 * the same 30s cadence as the rest of the System page.
 */

import { useLiveData } from '@/app/(admin)/admin/shared/live/useLiveData';
import { LiveWidgetHeader } from '@/app/(admin)/admin/shared/live/LiveWidgetHeader';

interface Standby {
  pid: number;
  usename: string | null;
  application_name: string | null;
  client_addr: string | null;
  state: string | null;
  sync_state: string | null;
  sent_lsn: string | null;
  write_lsn: string | null;
  flush_lsn: string | null;
  replay_lsn: string | null;
  write_lag_sec: number | null;
  flush_lag_sec: number | null;
  replay_lag_sec: number | null;
  connected_for_sec: number | null;
}

interface Slot {
  slot_name: string;
  slot_type: string;
  active: boolean;
  restart_lsn: string | null;
}

interface ReplicationState {
  self?: { role: 'primary' | 'replica'; checkedAt: string };
  standbys?: Standby[];
  standbyCount?: number;
  slots?: Slot[];
  error?: string;
}

export function ReplicationPanel() {
  const live = useLiveData<ReplicationState>('/admin/api/monitoring/db-replication',
                                             { intervalMs: 30_000 });
  const data = live.data;

  return (
    <section className="admin-card">
      <LiveWidgetHeader
        title="Postgres replication"
        subtitle={
          data === null   ? 'Loading…'
          : data?.error   ? `Error: ${data.error}`
          : data?.self    ? `This api is on the ${data.self.role} (${data.standbyCount ?? 0} standby connected)`
          : 'No data'
        }
        loading={live.loading}
        lastUpdatedMs={live.lastUpdatedMs}
        onRefresh={() => void live.refresh()}
      />

      {data?.error && (
        <p style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>{data.error}</p>
      )}

      {data?.standbys && data.standbys.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Standby</th>
                <th style={thStyle}>State</th>
                <th style={thStyle}>Sync</th>
                <th style={thStyle}>Write lag</th>
                <th style={thStyle}>Flush lag</th>
                <th style={thStyle}>Replay lag</th>
                <th style={thStyle}>Connected</th>
              </tr>
            </thead>
            <tbody>
              {data.standbys.map(s => (
                <tr key={s.pid}>
                  <td style={tdStyle}>
                    <code>{s.application_name ?? '—'}</code>
                    {s.client_addr && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      {s.client_addr}
                    </span>}
                  </td>
                  <td style={tdStyle}>
                    <span style={statePillStyle(s.state)}>{s.state ?? '—'}</span>
                  </td>
                  <td style={tdStyle}>{s.sync_state ?? '—'}</td>
                  <td style={tdStyle}>{lagLabel(s.write_lag_sec)}</td>
                  <td style={tdStyle}>{lagLabel(s.flush_lag_sec)}</td>
                  <td style={tdStyle}>{lagLabel(s.replay_lag_sec)}</td>
                  <td style={tdStyle}>{durationLabel(s.connected_for_sec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : data?.self ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
          No standbys connected. Replication is configured by docker-compose
          on production; this panel will populate once a replica streams from
          this primary.
        </p>
      ) : null}

      {data?.slots && data.slots.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <h3 style={subheadStyle}>Replication slots</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Restart LSN</th>
              </tr>
            </thead>
            <tbody>
              {data.slots.map(s => (
                <tr key={s.slot_name}>
                  <td style={tdStyle}><code>{s.slot_name}</code></td>
                  <td style={tdStyle}>{s.slot_type}</td>
                  <td style={tdStyle}>
                    {s.active
                      ? <span style={{ color: 'var(--success)' }}>● active</span>
                      : <span style={{ color: 'var(--warning)' }}>● inactive — pinning WAL</span>}
                  </td>
                  <td style={tdStyle}><code>{s.restart_lsn ?? '—'}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function lagLabel(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 1)   return `${Math.round(sec * 1000)} ms`;
  if (sec < 60)  return `${sec.toFixed(1)} s`;
  if (sec < 3600) return `${Math.round(sec / 60)} m`;
  return `${(sec / 3600).toFixed(1)} h`;
}

function durationLabel(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 60)    return `${sec} s`;
  if (sec < 3600)  return `${Math.round(sec / 60)} m`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h`;
  return `${Math.round(sec / 86400)} d`;
}

function statePillStyle(state: string | null): React.CSSProperties {
  // streaming = healthy; catchup = falling behind initial sync;
  // backup = base backup running; startup = brand-new, not ready.
  const ok = state === 'streaming';
  const tone = ok ? 'var(--success)'
             : state === 'startup' ? 'var(--text-muted)'
             : 'var(--warning)';
  return {
    fontSize: '0.65rem',
    color: tone,
    background: `color-mix(in srgb, ${tone} 14%, transparent)`,
    border: `1px solid color-mix(in srgb, ${tone} 28%, transparent)`,
    padding: '1px 6px',
    borderRadius: 3,
  };
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' };
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  fontFamily: 'var(--font-heading)',
  fontSize: '0.65rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
};
const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)',
};
const subheadStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
  margin: '0 0 0.5rem',
};
