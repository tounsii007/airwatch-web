/**
 * Status-overview row — port-up donut on the left, threat-origin
 * world map on the right.
 */
import { Donut }    from '@/app/(admin)/admin/shared/charts/Donut';
import { WorldMap } from '@/app/(admin)/admin/shared/charts/WorldMap';
import { toneForUptime } from '@/app/(admin)/admin/dashboard/utils';

const TONE_COLOR = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  error:   'var(--error)',
} as const;

interface Props {
  portsUp: number;
  portsTotal: number;
  uptimePct: number;
  /** Pre-aggregated country → blocked-attempt counts. Empty until
   *  GeoIP enrichment is in place; the WorldMap renders its own
   *  "no geo data" placeholder for that case. */
  countryCounts: Readonly<Record<string, number>>;
}

export function StatusOverviewRow({ portsUp, portsTotal, uptimePct, countryCounts }: Props) {
  const tone = toneForUptime(uptimePct);
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1rem' }}
      className="admin-grid-2col"
    >
      <section
        className="admin-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h2>Port status</h2>
        <Donut value={portsUp} total={portsTotal || 1} color={TONE_COLOR[tone]}>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {portsUp}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/{portsTotal}</span>
          </div>
          <div
            style={{
              fontSize: '0.625rem',
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            UP
          </div>
        </Donut>
      </section>
      <section className="admin-card">
        <h2>Threat origins (Phase-1 placeholder)</h2>
        <WorldMap data={countryCounts} height={280} />
      </section>
    </div>
  );
}
