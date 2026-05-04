/**
 * Loading skeleton for ANY admin sub-route during navigation.
 *
 * Next.js fires this {@code loading.tsx} automatically while a sibling
 * (or nested) {@code page.tsx} server-component is being rendered. It
 * replaces the "page freezes on the previous content" UX where an
 * operator clicking a nav item would see no feedback at all until the
 * new page's data finished loading — which on a cold cache could be
 * 1–2 seconds.
 *
 * <p>The skeleton is intentionally generic (header + KPI strip + a few
 * card placeholders) because the layout of every admin page follows
 * roughly the same shape: title → KPIs → wide content. A page-shaped
 * placeholder feels "the right thing is coming" instead of a blank spinner.
 *
 * <p>Per-route loading.tsx files override this one for pages with
 * meaningfully different layouts (e.g. the audit table doesn't have
 * a KPI strip), but for now this single fallback covers all pages.
 */
import { Skeleton, SkeletonKpiCard, SkeletonCard } from '@/app/(admin)/admin/shared/components/Skeleton';

export default function AdminLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header (heading + subtitle) */}
      <header>
        <Skeleton width={220} height={28} />
        <div style={{ marginTop: 6 }}>
          <Skeleton width={420} height={12} />
        </div>
      </header>

      {/* KPI strip — 4 across on wide screens, fits responsive grid below */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
        <SkeletonKpiCard />
      </div>

      {/* Main content card */}
      <SkeletonCard rows={6} />
    </div>
  );
}
