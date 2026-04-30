/**
 * Skeleton placeholders. Use during data fetch instead of a spinner —
 * the layout stays stable so the user's eye knows where content will
 * land. Prevents the "spinner of doom" effect where a centered loader
 * gives no information about what's coming.
 *
 * Three primitives:
 *   * <Skeleton.Line> — short text line (heading, value)
 *   * <Skeleton.Block> — rectangular content area (card body, image)
 *   * <Skeleton.Circle> — round avatar/icon placeholder
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
  },
);
