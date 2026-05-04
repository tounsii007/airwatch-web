/**
 * Per-port latency card grid. Each port renders as a tile with status
 * pill + latency value + 60-minute sparkline. Designed to give a
 * "weather front in the data centre" view at a glance.
 */
import { Sparkline } from '@/app/(admin)/admin/shared/charts/Sparkline';
import type { PortRowWithHistory } from '@/app/(admin)/admin/dashboard/types';
import { ClientTime } from '@/app/(admin)/ClientTime';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';

interface Props {
  ports: readonly PortRowWithHistory[];
}

export function PortGrid({ ports }: Props) {
  return (
    <section className="admin-card">
      <h2>Port latency · last 60 minutes</h2>
      {/*
        Single column with full-width tiles. The previous grid (auto-fill
        minmax 280px) compressed each sparkline to ~30 px tall and 200 px
        wide — operators couldn't see latency spikes at a glance. Stacked
        full-width gives every port a wide, tall sparkline where small
        bumps become visible.
      */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {ports.map((p) => (
          <PortTile key={p.port_name} port={p} />
        ))}
        {ports.length === 0 && (
          <EmptyState
            icon="⏳"
            title="No probes yet"
            hint="First port-monitor round fires 30 s after startup."
          />
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
        background: 'var(--sunken)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '1rem 1.25rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', color: 'var(--primary-bright)', letterSpacing: '0.04em' }}>
            {port.port_name}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {port.host}:{port.port_number}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600 }}>
            {port.latency_ms != null ? `${port.latency_ms} ms` : '—'}
          </span>
          {/* Hydration-safe: SSR renders absolute Berlin time, client swaps
              to "Xm ago" on mount and re-ticks every 30s. Tooltip carries
              the absolute timestamp on hover for precise reads. */}
          <ClientTime
            iso={port.probed_at}
            mode="relative"
            style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}
          />
          <span
            className={`pill ${port.up ? 'pill-up' : 'pill-down'}`}
            style={{ fontSize: '0.6875rem', padding: '2px 10px' }}
          >
            {port.up ? 'UP' : 'DOWN'}
          </span>
        </div>
      </div>
      <div style={{ height: 80, color: sparkColor }}>
        {/*
          strokeWidth={1} for the full-width PortGrid sparkline — combined
          with vector-effect="non-scaling-stroke" inside Sparkline this
          renders a 1-px hairline regardless of how wide the container
          stretches, which gives the chart room to breathe instead of
          looking like a heavy ribbon.
        */}
        <Sparkline values={port.history} stroke={sparkColor} fill={sparkColor} height={80} strokeWidth={1} />
      </div>
    </div>
  );
}
