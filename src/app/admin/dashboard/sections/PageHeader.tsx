/**
 * Dashboard page header — title, last-refresh hint, and the colour-coded
 * top-right status pill.
 */
import { captionForUptime, toneForUptime } from '@/app/admin/dashboard/utils';

const TONE_COLOR = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  error:   'var(--error)',
} as const;

interface Props {
  uptimePct: number;
  portsTotal: number;
}

export function PageHeader({ uptimePct, portsTotal }: Props) {
  const tone = toneForUptime(uptimePct);
  const colour = TONE_COLOR[tone];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: 'var(--primary-bright)',
          }}
        >
          Operations Overview
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 }}>
          Live monitoring · {portsTotal} ports · last refreshed just now
        </p>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.6875rem',
          letterSpacing: '0.15em',
          color: colour,
          background: `color-mix(in srgb, ${colour} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${colour} 22%, transparent)`,
          padding: '4px 10px',
          borderRadius: 999,
        }}
      >
        ● {captionForUptime(uptimePct)}
      </span>
    </div>
  );
}
