/**
 * Per-port latency card grid. Each port renders as a tile with status
 * pill + latency value + 60-minute sparkline. Designed to give a
 * "weather front in the data centre" view at a glance.
 */
import { Sparkline } from '@/app/admin/shared/charts/Sparkline';
import type { PortRowWithHistory } from '@/app/admin/dashboard/types';
import { relativeTime } from '@/app/admin/dashboard/utils';

interface Props {
  ports: readonly PortRowWithHistory[];
}

export function PortGrid({ ports }: Props) {
  return (
    <section className="admin-card">
      <h2>Port latency · last 60 minutes</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {ports.map((p) => (
          <PortTile key={p.port_name} port={p} />
        ))}
        {ports.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', padding: '1rem' }}>
            No probes yet — first round runs 30 s after startup.
          </div>
        )}
      </div>
    </section>
  );
}

function PortTile({ port }: { port: PortRowWithHistory }) {
  const sparkColor = port.up ? 'var(--success)' : 'var(--error)';
  return (
    <div
      style={{
        background: 'rgba(15, 29, 50, 0.6)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '0.6rem 0.75rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', color: 'var(--primary-bright)' }}>
          {port.port_name}
        </span>
        <span
          className={`pill ${port.up ? 'pill-up' : 'pill-down'}`}
          style={{ fontSize: '0.5625rem', padding: '0 6px' }}
        >
          {port.up ? 'UP' : 'DOWN'}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
        <span>{port.host}:{port.port_number}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
          {port.latency_ms != null ? `${port.latency_ms} ms` : '—'} · {relativeTime(port.probed_at)}
        </span>
      </div>
      <div style={{ marginTop: 6, height: 30, color: sparkColor }}>
        <Sparkline values={port.history} stroke={sparkColor} fill={sparkColor} height={30} />
      </div>
    </div>
  );
}
