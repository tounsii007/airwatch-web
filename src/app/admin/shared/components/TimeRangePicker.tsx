'use client';

/**
 * Button-group time-range selector. Seven preset windows that map to
 * minute counts the api accepts on /admin/api/monitoring/loads?minutes=…
 *
 *   1H  · 6H  · 24H  · 1W  · 1M  · 6M  · 1Y
 *
 * Renders as a single horizontal pill with the active range highlighted.
 * Compact + tabular so it doesn't dominate the chart card it sits on top of.
 */
import type { ReactNode } from 'react';

export interface TimeRange {
  key: string;
  label: string;
  minutes: number;
}

export const RANGES: readonly TimeRange[] = [
  { key: '1h',  label: '1H',  minutes: 60 },
  { key: '6h',  label: '6H',  minutes: 360 },
  { key: '24h', label: '24H', minutes: 1440 },
  { key: '1w',  label: '1W',  minutes: 10_080 },
  { key: '1m',  label: '1M',  minutes: 44_640 },
  { key: '6m',  label: '6M',  minutes: 262_800 },
  { key: '1y',  label: '1Y',  minutes: 525_600 },
];

interface Props {
  value: string;
  onChange: (key: string) => void;
  trailing?: ReactNode;
}

export function TimeRangePicker({ value, onChange, trailing }: Props) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 3,
        background: 'rgba(15, 29, 50, 0.6)',
        border: '1px solid var(--border)',
        borderRadius: 999,
      }}
    >
      {RANGES.map((r) => {
        const active = r.key === value;
        return (
          <button
            type="button"
            key={r.key}
            onClick={() => onChange(r.key)}
            aria-pressed={active}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '4px 10px',
              borderRadius: 999,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: active ? 'var(--bg)' : 'var(--text-muted)',
              background: active ? 'var(--primary-bright)' : 'transparent',
              boxShadow: active ? '0 0 12px color-mix(in srgb, var(--primary-bright) 40%, transparent)' : 'none',
              transition: 'background 200ms, color 200ms, box-shadow 200ms',
            }}
          >
            {r.label}
          </button>
        );
      })}
      {trailing && <span style={{ marginLeft: 8 }}>{trailing}</span>}
    </div>
  );
}
