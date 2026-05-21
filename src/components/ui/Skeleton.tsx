/**
 * Skeleton placeholders. Use during data fetch instead of a spinner —
 * the layout stays stable so the user's eye knows where content will
 * land. Prevents the "spinner of doom" effect where a centered loader
 * gives no information about what's coming.
 *
 * Primitives:
 *   * <Skeleton.Line>   — short text line (heading, value)
 *   * <Skeleton.Block>  — rectangular content area (card body, image)
 *   * <Skeleton.Circle> — round avatar/icon placeholder
 *
 * Compound helpers (built from the primitives, opinionated layouts):
 *   * <Skeleton.Tile>   — card placeholder with title + two lines
 *   * <Skeleton.Row>    — list row with avatar + title + subtitle
 *   * <Skeleton.Stat>   — stat-card placeholder (value + label)
 *
 * The shimmer animation lives in globals.css (`.skeleton`) and respects
 * prefers-reduced-motion (collapses to a static surface).
 */

interface BaseProps {
  className?: string;
  style?: React.CSSProperties;
}

function SkeletonLine({
  className = '',
  width = '100%',
  height = '0.875rem',
}: BaseProps & { width?: string | number; height?: string | number }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: '4px' }}
      aria-hidden
    />
  );
}

function SkeletonBlock({
  className = '',
  width = '100%',
  height = '6rem',
}: BaseProps & { width?: string | number; height?: string | number }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: '12px' }}
      aria-hidden
    />
  );
}

function SkeletonCircle({
  size = '2.5rem',
  className = '',
}: BaseProps & { size?: string | number }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: size, height: size, borderRadius: '999px' }}
      aria-hidden
    />
  );
}

function SkeletonTile({
  className = '',
  lines = 2,
}: BaseProps & { lines?: number }) {
  return (
    <div
      className={`glass-panel p-4 ${className}`}
      aria-hidden
    >
      <SkeletonLine width="40%" height="1.25rem" className="mb-3" />
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine
          key={i}
          width={i === lines - 1 ? '55%' : '85%'}
          className="mb-2 last:mb-0"
        />
      ))}
    </div>
  );
}

function SkeletonRow({
  className = '',
  showAvatar = true,
}: BaseProps & { showAvatar?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-2 ${className}`} aria-hidden>
      {showAvatar && <SkeletonCircle size="2rem" />}
      <div className="flex-1 space-y-1.5">
        <SkeletonLine width="60%" height="0.875rem" />
        <SkeletonLine width="35%" height="0.6875rem" />
      </div>
    </div>
  );
}

function SkeletonStat({
  className = '',
}: BaseProps) {
  return (
    <div className={`stat-card stat-card-rich ${className}`} aria-hidden>
      <SkeletonLine width="3.5rem" height="1.75rem" className="mb-3" />
      <SkeletonLine width="40%" height="0.625rem" />
    </div>
  );
}

export const Skeleton = Object.assign(
  function Skeleton({ className = '', children }: BaseProps & { children?: React.ReactNode }) {
    return (
      <div className={className} role="status" aria-label="Loading content">
        {children}
        <span className="sr-only">Loading…</span>
      </div>
    );
  },
  {
    Line: SkeletonLine,
    Block: SkeletonBlock,
    Circle: SkeletonCircle,
    Tile: SkeletonTile,
    Row: SkeletonRow,
    Stat: SkeletonStat,
  },
);
