/**
 * Single-replica detail card for the Instances page.
 *
 * Layout:
 *   ┌────────────────────────────────────────────────────────┐
 *   │ instance-id      [● UP]    last seen  3s ago           │
 *   │                                                        │
 *   │ CPU 47%  Heap 312 / 512 MB  Threads 84  Req/s 12.3     │
 *   │                                                        │
 *   │ ▁▂▃▅▇▆▄▃ CPU 60-min                                   │
 *   │ ▂▃▃▄▅▅▆▆ Heap 60-min                                  │
 *   └────────────────────────────────────────────────────────┘
 */
import { Sparkline } from '@/app/(admin)/admin/shared/charts/Sparkline';
import { ClientTime } from '@/app/(admin)/ClientTime';
import type { InstanceState } from '@/app/(admin)/admin/instances/page';

interface Props {
  state: InstanceState;
}

export function InstanceCard({ state: s }: Props) {
  const ageMs    = Date.now() - s.lastSeen;
  const isUp     = ageMs < 2 * 60_000;
  const cpuTone  = (s.cpuPct ?? 0) < 50 ? 'var(--success)' : (s.cpuPct ?? 0) < 80 ? 'var(--warning)' : 'var(--error)';
  const heapPct  = s.heapMaxMb && s.heapMaxMb > 0 && s.heapUsedMb != null
    ? (s.heapUsedMb / s.heapMaxMb) * 100
    : null;
  const heapTone = heapPct == null ? 'var(--text-muted)'
    : heapPct < 60 ? 'var(--success)'
    : heapPct < 85 ? 'var(--warning)'
    : 'var(--error)';

  return (
    <section
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${isUp ? 'var(--success)' : 'var(--text-muted)'}`,
        borderRadius: 6,
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      {/* Header row: id + status + last-seen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', color: 'var(--primary-bright)' }}>
            {s.shortId}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem', marginTop: 2 }} title={s.id}>
            {s.id.length > 8 ? `…${s.id.slice(-12)}` : s.id}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={pillStyle(isUp ? 'var(--success)' : 'var(--text-muted)')}>
            {isUp ? '● UP' : '○ STALE'}
          </span>
          {s.lastSeen > 0 ? (
            <ClientTime
              iso={s.lastSeen}
              mode="relative"
              style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}
            />
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>—</span>
          )}
        </div>
      </div>

      {/* Current metric values */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '0.5rem',
          fontVariantNumeric: 'tabular-nums lining-nums',
        }}
      >
        <Metric
          label="CPU"
          value={s.cpuPct != null ? `${s.cpuPct.toFixed(1)}%` : '—'}
          color={cpuTone}
        />
        <Metric
          label="HEAP"
          value={s.heapUsedMb != null && s.heapMaxMb != null
            ? `${Math.round(s.heapUsedMb)} / ${Math.round(s.heapMaxMb)} MB`
            : '—'}
          color={heapTone}
        />
        <Metric
          label="THREADS"
          value={s.threadCount != null ? `${s.threadCount}` : '—'}
          color="var(--text-primary)"
        />
        <Metric
          label="REQ/S NOW"
          value={s.requestRate != null ? s.requestRate.toFixed(1) : '—'}
          color="var(--info)"
        />
        {/*
          Window-aggregate stats — derived from every bucket the server
          returned for the chosen time-range. Total requests = sum of
          (rate × median bucket interval); downtime = inner gaps + tail
          staleness in minutes.
        */}
        <Metric
          label={`REQUESTS · ${s.windowMin >= 1440 ? `${Math.round(s.windowMin / 1440)}d` : `${Math.round(s.windowMin / 60)}h`}`}
          value={s.totalRequests > 1_000_000
                  ? (s.totalRequests / 1_000_000).toFixed(1) + 'M'
                  : s.totalRequests > 1_000
                    ? (s.totalRequests / 1_000).toFixed(1) + 'k'
                    : String(s.totalRequests)}
          color="var(--info)"
        />
        <Metric
          label="DOWNTIME"
          value={s.downtimeMin === 0 ? '0' : s.downtimeMin >= 60
            ? `${(s.downtimeMin / 60).toFixed(1)}h`
            : `${s.downtimeMin}m`}
          color={s.downtimeMin === 0
                  ? 'var(--success)'
                  : s.downtimeMin < 5 ? 'var(--warning)' : 'var(--error)'}
        />
      </div>

      {/* Sparklines: CPU + Heap (with vector-effect fix already applied
          in Sparkline.tsx so the line renders crisp 1.25 px regardless
          of how wide the card stretches in the responsive grid). */}
      <SparkRow
        label="CPU 60m"
        values={s.cpuSeries}
        unit="%"
        color={cpuTone}
        latest={s.cpuPct}
      />
      <SparkRow
        label="HEAP 60m"
        values={s.heapPctSeries}
        unit="%"
        color={heapTone}
        latest={heapPct}
      />
      {s.reqSeries.length > 0 && (
        <SparkRow
          label="REQ/S 60m"
          values={s.reqSeries}
          unit=""
          color="var(--info)"
          latest={s.requestRate}
        />
      )}
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '0.5625rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-muted)',
        fontWeight: 700,
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Inter, Roboto, sans-serif',
        fontSize: '1rem',
        fontWeight: 600,
        color,
      }}>
        {value}
      </div>
    </div>
  );
}

function SparkRow({
  label, values, unit, color, latest,
}: {
  label: string;
  values: readonly number[];
  unit: string;
  color: string;
  latest: number | null;
}) {
  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontFamily: 'var(--font-heading)',
        fontSize: '0.5625rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase' as const,
        color: 'var(--text-muted)',
        marginBottom: 2,
      }}>
        <span>{label}</span>
        <span
          style={{
            color,
            fontFamily: 'system-ui, -apple-system, "Segoe UI", Inter, Roboto, sans-serif',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: 0,
            textTransform: 'none' as const,
          }}
        >
          now {latest != null ? latest.toFixed(1) + unit : '—'}
          {values.length > 0 && (
            <>
              {' · '}
              max {Math.max(...values).toFixed(1)}{unit}
              {' · '}
              min {Math.min(...values).toFixed(1)}{unit}
            </>
          )}
        </span>
      </div>
      <div style={{ height: 36, color }}>
        <Sparkline
          values={values}
          stroke={color}
          fill={color}
          height={36}
          strokeWidth={1.25}
        />
      </div>
    </div>
  );
}

function pillStyle(color: string) {
  return {
    fontFamily: 'var(--font-heading)',
    fontSize: '0.625rem',
    letterSpacing: '0.1em',
    color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
    padding: '2px 8px',
    borderRadius: 4,
    whiteSpace: 'nowrap' as const,
  };
}
