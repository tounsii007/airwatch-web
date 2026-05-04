/**
 * Security-page loading skeleton — overrides the generic admin
 * loading.tsx because the security view is dominated by a long
 * audit-log table, not the KPI-then-card layout most other pages use.
 */
import { Skeleton, SkeletonCard } from '@/app/(admin)/admin/shared/components/Skeleton';

export default function SecurityLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <Skeleton width={220} height={28} />
        <div style={{ marginTop: 6 }}>
          <Skeleton width={420} height={12} />
        </div>
      </header>
      <SkeletonCard rows={3} />
      <SkeletonCard rows={12} />
    </div>
  );
}
