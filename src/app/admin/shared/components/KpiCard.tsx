/**
 * KPI tile for the admin dashboard. Big number, small label, optional
 * sparkline + trend chip. Uses CountUp from the public UI primitives so
 * the number animates up from zero on first paint without a separate
 * client component.
 *
 *   <KpiCard label="UPTIME" value={uptimePct} unit="%" sparkline={[...]} />
 *
 * Glow + gradient border render the "alive" feel without crossing into
 * tacky-territory; the colour adapts to status (success / warning / error).
 */
import { CountUp } from '@/components/ui';
import { Sparkline } from '@/app/admin/shared/charts/Sparkline';

type Tone = 'default' | 'success' | 'warning' | 'error' | 'info';

const COLOR: Record<Tone, string> = {
  default: 'var(--primary-bright)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error:   'var(--error)',
  info:    'var(--info)',
};

interface Props {
  label: string;
  value: number;
  unit?: string;
  decimals?: number;
  /** Tone drives accent colour. */
  tone?: Tone;
  /** Optional time-series data for the inline sparkline. */
  sparkline?: readonly number[];
  /** Optional secondary line — eg "of 11 monitored". */
  hint?: string;
  /** Optional delta string like "+12 in 24h". Coloured by deltaTone. */
  delta?: string;
  deltaTone?: Tone;
}

export function KpiCard({
  label,
  value,
  unit = '',
  decimals = 0,
  tone = 'default',
  sparkline,
  hint,
  delta,
  deltaTone = 'default',
}: Props) {
  const accent = COLOR[tone];
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '1.25rem 1.25rem 1rem',
        overflow: 'hidden',
        // Corner glow tied to the tone — same pattern as the stat-card-rich
        // component on the public app, kept lighter here to match the
        // utilitarian admin vibe.
        backgroundImage: `radial-gradient(circle at 100% 0%, color-mix(in srgb, ${accent} 12%, transparent) 0%, transparent 60%)`,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.625rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          fontWeight: 700,
          marginBottom: '0.5rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2.25rem',
          fontWeight: 700,
          lineHeight: 1,
          color: accent,
          textShadow: `0 0 24px color-mix(in srgb, ${accent} 35%, transparent)`,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        <CountUp value={value} decimals={decimals} />
        {unit && (
          <span
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              marginLeft: '0.25rem',
              letterSpacing: '0.04em',
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {(hint || delta) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.5rem',
            gap: '0.5rem',
          }}
        >
          {hint && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              {hint}
            </span>
          )}
          {delta && (
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: COLOR[deltaTone],
                background: `color-mix(in srgb, ${COLOR[deltaTone]} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${COLOR[deltaTone]} 22%, transparent)`,
                padding: '2px 6px',
                borderRadius: 3,
              }}
            >
              {delta}
            </span>
          )}
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <div style={{ marginTop: '0.75rem', height: 40, color: accent }}>
          <Sparkline values={sparkline} stroke={accent} fill={accent} height={40} />
        </div>
      )}
    </div>
  );
}
