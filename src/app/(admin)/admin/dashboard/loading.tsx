/**
 * Dashboard-specific loading skeleton — overrides the generic admin
 * loading.tsx because the dashboard has a distinctive multi-section
 * layout: KPI strip → port grid → security row → load curves → world
 * map. A generic four-card placeholder doesn't match that visual
 * rhythm and feels jarring during the transition.
 *
 * <p>This skeleton mirrors the real layout closely enough that the
 * eye anticipates where each section will appear — when the real
 * content swaps in, nothing visibly jumps.
 */
import { Skeleton, SkeletonKpiCard, SkeletonCard, SkeletonChart } from '@/app/(admin)/admin/shared/components/Skeleton';

export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Page header (title + status pill on the right) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div>
          <Skeleton width={280} height={28} />
          <div style={{ marginTop: 6 }}>
            <Skeleton width={360} height={12} />
          </div>
        </div>
        <Skeleton width={120} height={22} radius={999} />
      </div>

      {/* KPI strip — 6 across on wide screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <SkeletonKpiCard /> <SkeletonKpiCard /> <SkeletonKpiCard />
        <SkeletonKpiCard /> <SkeletonKpiCard /> <SkeletonKpiCard />
      </div>

      {/* Port grid header + a few full-width port tiles */}
      <SkeletonCard rows={4} />

      {/* Two side-by-side panels for security + load curves */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '0.75rem' }}>
        <SkeletonChart height={220} />
        <SkeletonChart height={220} />
      </div>

      {/* World-map / country chart / view popularity row */}
      <SkeletonCard rows={6} />
    </div>
  );
}
