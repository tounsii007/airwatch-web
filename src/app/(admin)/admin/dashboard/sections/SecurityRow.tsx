/**
 * Security row — Top-Offenders bar chart on the left, live rejection
 * feed on the right. Both are fed from /admin/api/monitoring/* data
 * the orchestrator already fetched.
 */
import { HBar }     from '@/app/(admin)/admin/shared/charts/HBar';
import { LiveFeed } from '@/app/(admin)/admin/dashboard/sections/LiveFeed';
import type { BlockedIp, RejectEvent } from '@/app/(admin)/admin/dashboard/types';

interface Props {
  blocked: readonly BlockedIp[];
  recent: readonly RejectEvent[];
}

export function SecurityRow({ blocked, recent }: Props) {
  const topOffenders = blocked.slice(0, 8).map((b) => ({
    label: b.ip,
    value: b.attempt_count,
    color: 'var(--error)',
  }));

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
      className="admin-grid-2col"
    >
      <section className="admin-card">
        <h2>Top offenders by attempt count</h2>
        {topOffenders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No blocked IPs recorded yet.</p>
        ) : (
          <HBar items={topOffenders} />
        )}
      </section>
      <section className="admin-card">
        <h2>Live rejection feed</h2>
        <LiveFeed initial={recent} />
      </section>
    </div>
  );
}
