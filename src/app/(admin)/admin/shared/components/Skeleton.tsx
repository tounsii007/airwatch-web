/**
 * Loading-state primitives.
 *
 * Animated shimmer rectangles that render in place of real content while
 * a server component is fetching. Replaces the previous "blank space"
 * loading state which made it look like the page was broken.
 *
 * Use via {@code Suspense fallback={<SkeletonCard/>}} or directly inside
 * a server component while data is being awaited.
 *
 * Design choices:
 *   * Pure CSS animation (`@keyframes admin-shimmer`) — zero JS cost.
 *   * Honors prefers-reduced-motion: disables the shimmer, keeps the
 *     placeholder shape.
 *   * Uses var(--surface-light) so it adapts to every theme without
 *     a per-theme override.
 */

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  /** Border radius in px. Default: 4. */
  radius?: number;
  /** Optional inline style overrides. */
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '1em', radius = 4, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className="admin-skeleton"
      style={{
        display: 'inline-block',
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, var(--surface-light) 0%, var(--border) 50%, var(--surface-light) 100%)',
        backgroundSize: '200% 100%',
        animation: 'admin-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

/** Standard KPI-card-shaped skeleton — drop into a KPI grid as fallback. */
export function SkeletonKpiCard() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '1.25rem 1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <Skeleton width={80}  height={10} />
      <Skeleton width={120} height={32} />
      <Skeleton width={100} height={10} />
    </div>
  );
}

/** Full-card-sized skeleton — for sections like LiveFeed / AuditTable. */
export function SkeletonCard({ rows = 5 }: { rows?: number }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '1rem 1.25rem',
      }}
    >
      <Skeleton width={120} height={14} style={{ marginBottom: '1rem' }} />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Skeleton width="20%" height={12} />
          <Skeleton width="60%" height={12} />
          <Skeleton width="20%" height={12} />
        </div>
      ))}
    </div>
  );
}

/** Mini chart-shaped placeholder. */
export function SkeletonChart({ height = 200 }: { height?: number }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '1rem 1.25rem',
    }}>
      <Skeleton width={140} height={14} style={{ marginBottom: '1rem' }} />
      <Skeleton width="100%" height={height} radius={6} />
    </div>
  );
}
