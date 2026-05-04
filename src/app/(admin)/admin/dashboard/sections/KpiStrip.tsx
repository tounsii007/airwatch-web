/**
 * Four KPI tiles at the top of the dashboard — uptime / threats /
 * recent rejections / avg latency. All numeric inputs are precomputed
 * by the parent so this section stays pure-presentation.
 */
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { toneForUptime } from '@/app/(admin)/admin/dashboard/utils';

interface Props {
  uptimePct: number;
  portsUp: number;
  portsTotal: number;
  totalBlocked: number;
  uniqueIps: number;
  recentRate: number;
  avgLatencyMs: number;
}

export function KpiStrip({
  uptimePct,
  portsUp,
  portsTotal,
  totalBlocked,
  uniqueIps,
  recentRate,
  avgLatencyMs,
}: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
      }}
    >
      <KpiCard
        label="UPTIME"
        value={uptimePct}
        unit="%"
        decimals={1}
        tone={toneForUptime(uptimePct)}
        hint={`${portsUp}/${portsTotal} ports up`}
      />
      <KpiCard
        label="THREATS BLOCKED"
        value={totalBlocked}
        tone="error"
        hint={`${uniqueIps} unique IPs`}
      />
      <KpiCard
        label="RECENT REJECTIONS"
        value={recentRate}
        tone="warning"
        hint="last 30 events"
      />
      <KpiCard
        label="AVG LATENCY"
        value={avgLatencyMs}
        unit="ms"
        tone="info"
        hint="across all up ports"
      />
    </div>
  );
}
