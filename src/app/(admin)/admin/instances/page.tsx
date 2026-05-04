/**
 * Instances view — per-replica resource utilisation at a glance.
 *
 * Adapts to the current cluster size:
 *   * 1 replica  → single full-width card
 *   * 2 replicas → side-by-side
 *   * 3-5+       → auto-fit grid (~minmax(420px, 1fr))
 *
 * Each card carries CPU%, heap usage, thread count, request rate plus
 * mini sparklines for CPU and heap so spikes / drift across the last
 * 60 min are visible without leaving the page.
 *
 * Server-rendered. The global RefreshButton in the layout header (and the
 * per-page button below) re-runs this server component for fresh data.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import { RefreshButton } from '@/app/(admin)/RefreshButton';
import { InstanceCard } from '@/app/(admin)/admin/instances/InstanceCard';
// rangeFromQuery is the SERVER-safe helper (no 'use client') so we can
// call it during SSR. The picker itself is the client widget.
import { rangeFromQuery } from '@/app/(admin)/admin/instances/rangeOptions';
import { InstancesRangePicker } from '@/app/(admin)/admin/instances/InstancesRangePicker';
// New Tailwind/shadcn-style primitives — used here as the showcase
// page for the new UI layer. Existing pages keep using KpiCard until
// they're migrated.
import { StatCard } from '@/app/(admin)/admin/shared/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/(admin)/admin/shared/ui/Card';

export interface LoadRow {
  bucket_at: string;
  instance_id: string;
  cpu_pct: number | null;
  heap_used_mb: number | null;
  heap_max_mb: number | null;
  thread_count: number | null;
  request_rate: number | null;
  replica_count: number | null;
}

export interface InstanceState {
  id: string;
  shortId: string;       // last 6 chars for display compactness
  /** Most-recent observation time (ms epoch). */
  lastSeen: number;
  /** Most-recent values (or null when no data point in the window). */
  cpuPct: number | null;
  heapUsedMb: number | null;
  heapMaxMb: number | null;
  threadCount: number | null;
  requestRate: number | null;
  /** Per-metric sparkline series, oldest → newest. */
  cpuSeries: number[];
  heapSeries: number[];
  reqSeries: number[];
  /** Heap-utilisation-% derived per point for the heap spark. */
  heapPctSeries: number[];
  /** Total requests across the selected window — sum(rate × bucketSec). */
  totalRequests: number;
  /** Minutes the replica was unreachable (gaps + tail-staleness). */
  downtimeMin: number;
  /** Window covered by this card, in minutes. */
  windowMin: number;
}

export default async function AdminInstancesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = rangeFromQuery(sp.range);
  // The api down-samples server-side so even a 30-day window stays
  // under ~600 buckets per instance.
  const rows = (await fetchJson<LoadRow[]>(`/admin/api/monitoring/loads?service=api&minutes=${range.minutes}`)) ?? [];

  const instances = groupByInstance(rows, range.minutes);
  const total     = instances.length;
  const upNow     = instances.filter((i) => Date.now() - i.lastSeen < 2 * 60_000).length;
  const avgCpu    = avg(instances.map((i) => i.cpuPct).filter((v): v is number => v != null));
  const avgHeap   = avg(instances.map((i) => i.heapPctNow()).filter((v): v is number => v != null));
  const reqRateNow = sum(instances.map((i) => i.requestRate ?? 0));
  const totalRequestsWindow = sum(instances.map((i) => i.totalRequests));
  const totalDowntimeMin    = sum(instances.map((i) => i.downtimeMin));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header style={headerRowStyle}>
        <div>
          <h1 style={headingStyle}>Instances</h1>
          <p style={subtitleStyle}>
            Per-replica resource utilisation over the selected window. Layout
            adapts to the current cluster size; totals (requests, downtime)
            are computed across every bucket in the chosen range.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <InstancesRangePicker active={range.id} />
          <RefreshButton />
        </div>
      </header>

      {/*
        KPI strip — migrated to the new shadcn/Tremor-style StatCard.
        Same visual language as the rest of the admin (CSS variables
        flow through Tailwind theme tokens), but composed via utility
        classes instead of inline styles. Sparklines opt-in per card.
      */}
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <StatCard label="REPLICAS"    value={total} hint={`${upNow} reporting now`} />
        <StatCard
          label="HEALTHY"
          value={upNow}
          tone={upNow === total && total > 0 ? 'success' : upNow === 0 ? 'danger' : 'warning'}
          hint={total - upNow > 0 ? `${total - upNow} stale or down` : 'all reporting'}
        />
        <StatCard
          label="AVG CPU"
          value={avgCpu.toFixed(1)}
          unit="%"
          tone={avgCpu < 50 ? 'success' : avgCpu < 80 ? 'warning' : 'danger'}
          hint="cluster mean"
        />
        <StatCard
          label="AVG HEAP"
          value={avgHeap.toFixed(1)}
          unit="%"
          tone={avgHeap < 60 ? 'success' : avgHeap < 85 ? 'warning' : 'danger'}
          hint="cluster mean"
        />
        <StatCard
          label="REQ/S NOW"
          value={reqRateNow.toFixed(1)}
          tone="info"
          hint="across all replicas"
        />
        <StatCard
          label={`REQUESTS · ${range.label.toUpperCase()}`}
          value={totalRequestsWindow}
          tone="info"
          hint={`${formatNumberShort(totalRequestsWindow)} total in window`}
        />
        <StatCard
          label="DOWNTIME"
          value={totalDowntimeMin}
          unit="min"
          tone={totalDowntimeMin === 0 ? 'success' : totalDowntimeMin < 5 ? 'warning' : 'danger'}
          hint={`across all replicas in ${range.label}`}
        />
      </div>

      {total === 0 ? (
        // Showcase the new shadcn-style Card composition. Functionally
        // equivalent to the previous .admin-card div + paragraph, but
        // self-documents the slot semantics.
        <Card>
          <CardHeader>
            <CardTitle>Awaiting first sample</CardTitle>
            <CardDescription>
              Each replica posts its first load snapshot ~30 s after startup.
              Refresh once it has settled.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <div
          /*
            Responsive grid:
              * 1 replica  → minmax(100%, 1fr) effectively, takes the whole row
              * 2 replicas → two equal columns down to ~880 px viewport, then stacks
              * 3+         → 2-3 columns depending on width, never narrower than 420 px
            420 px is the threshold below which the per-card sparklines
            stop being legible.
          */
          style={{
            display: 'grid',
            gridTemplateColumns: total === 1
              ? '1fr'
              : 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '1rem',
          }}
        >
          {instances.map((inst) => (
            <InstanceCard key={inst.id} state={inst.toState()} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Aggregation helpers ────────────────────────────────────────────────

class InstanceAccumulator {
  cpuSeries: number[] = [];
  heapSeries: number[] = [];
  reqSeries: number[] = [];
  heapPctSeries: number[] = [];
  /** Bucket timestamps in ms, oldest → newest. */
  bucketTimes: number[] = [];
  lastSeen = 0;
  firstSeen = Infinity;
  cpuPct: number | null = null;
  heapUsedMb: number | null = null;
  heapMaxMb: number | null = null;
  threadCount: number | null = null;
  requestRate: number | null = null;

  constructor(public id: string, public windowMin: number) {}

  push(row: LoadRow) {
    const t = new Date(row.bucket_at).getTime();
    if (t > this.lastSeen) {
      this.lastSeen     = t;
      this.cpuPct       = row.cpu_pct;
      this.heapUsedMb   = row.heap_used_mb;
      this.heapMaxMb    = row.heap_max_mb;
      this.threadCount  = row.thread_count;
      this.requestRate  = row.request_rate;
    }
    if (t < this.firstSeen) this.firstSeen = t;
    this.bucketTimes.push(t);
    if (row.cpu_pct      != null) this.cpuSeries.push(row.cpu_pct);
    if (row.heap_used_mb != null) this.heapSeries.push(row.heap_used_mb);
    if (row.request_rate != null) this.reqSeries.push(row.request_rate);
    if (row.heap_used_mb != null && row.heap_max_mb && row.heap_max_mb > 0) {
      this.heapPctSeries.push((row.heap_used_mb / row.heap_max_mb) * 100);
    }
  }

  heapPctNow(): number | null {
    if (this.heapUsedMb == null || !this.heapMaxMb) return null;
    return (this.heapUsedMb / this.heapMaxMb) * 100;
  }

  /**
   * Total request count across the window — sum(rate × seconds-per-bucket)
   * using the median inter-bucket delta as the sampling interval. Median
   * is robust against the one-off long gap a downtime period would
   * produce.
   */
  get totalRequests(): number {
    if (this.reqSeries.length === 0) return 0;
    const intervalSec = this.medianDeltaSec();
    return Math.round(this.reqSeries.reduce((a, v) => a + v, 0) * intervalSec);
  }

  /**
   * Minutes the replica was unreachable inside the chosen window.
   *
   * Two contributors:
   *   1. INNER GAPS — any inter-bucket delta longer than 3× the
   *      median sampling interval is treated as missing data; the
   *      excess (delta - median) is downtime.
   *   2. TAIL STALENESS — if the last bucket is older than the median
   *      interval, the time from lastSeen to "now" counts as downtime
   *      (clamped to the window length).
   */
  get downtimeMin(): number {
    if (this.bucketTimes.length === 0) return this.windowMin;
    const sorted = [...this.bucketTimes].sort((a, b) => a - b);
    const intervalMs = this.medianDeltaSec() * 1000;
    let gapMs = 0;
    for (let i = 1; i < sorted.length; i++) {
      const d = sorted[i] - sorted[i - 1];
      if (d > intervalMs * 3) gapMs += d - intervalMs;
    }
    // Tail staleness — but only if the last sample is genuinely stale,
    // not just "the request landed mid-bucket".
    const tailMs = Date.now() - sorted[sorted.length - 1];
    if (tailMs > intervalMs * 2) gapMs += tailMs;
    const min = Math.round(gapMs / 60_000);
    return Math.max(0, Math.min(min, this.windowMin));
  }

  private medianDeltaSec(): number {
    if (this.bucketTimes.length < 2) return 60; // 1-minute default
    const sorted = [...this.bucketTimes].sort((a, b) => a - b);
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) deltas.push(sorted[i] - sorted[i - 1]);
    deltas.sort((a, b) => a - b);
    return Math.max(1, (deltas[Math.floor(deltas.length / 2)] || 60_000) / 1000);
  }

  toState(): InstanceState {
    return {
      id:           this.id,
      shortId:      this.id.length > 8 ? this.id.slice(-6) : this.id,
      lastSeen:     this.lastSeen,
      cpuPct:       this.cpuPct,
      heapUsedMb:   this.heapUsedMb,
      heapMaxMb:    this.heapMaxMb,
      threadCount:  this.threadCount,
      requestRate:  this.requestRate,
      cpuSeries:    this.cpuSeries,
      heapSeries:   this.heapSeries,
      reqSeries:    this.reqSeries,
      heapPctSeries: this.heapPctSeries,
      totalRequests: this.totalRequests,
      downtimeMin:  this.downtimeMin,
      windowMin:    this.windowMin,
    };
  }
}

function groupByInstance(rows: readonly LoadRow[], windowMin: number): InstanceAccumulator[] {
  const map = new Map<string, InstanceAccumulator>();
  // Sort oldest → newest so each accumulator's `lastSeen` ends up correct
  // and the sparkline arrays are time-ordered without an extra pass.
  const sorted = [...rows].sort((a, b) => a.bucket_at.localeCompare(b.bucket_at));
  for (const r of sorted) {
    let acc = map.get(r.instance_id);
    if (!acc) { acc = new InstanceAccumulator(r.instance_id, windowMin); map.set(r.instance_id, acc); }
    acc.push(r);
  }
  // Most-recently-active first — operators usually want to see the
  // active replica before the stale one.
  return [...map.values()].sort((a, b) => b.lastSeen - a.lastSeen);
}

function formatNumberShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function avg(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

const headingStyle    = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle   = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4, maxWidth: 640 };
const headerRowStyle  = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0.75rem' };
const kpiGridStyle    = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' };
