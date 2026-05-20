/**
 * Animated loading spinner — sized + tinted via props.
 *
 *   <Spinner size={16} />
 *   <Spinner size={20} variant="primary" />
 *
 * For long-lived loading states prefer a Skeleton — spinners are best
 * reserved for the moment between submit and response.
 */

type Variant = 'primary' | 'muted' | 'inherit';

const VARIANT_COLOR: Record<Variant, string> = {
  primary: 'text-[var(--primary-bright)]',
  muted: 'text-[var(--text-muted)]',
  inherit: 'text-current',
};

export function Spinner({
  size = 16,
  variant = 'primary',
  className = '',
  label = 'Loading',
}: {
  size?: number;
  variant?: Variant;
  className?: string;
  /** Screen-reader label — visually hidden but announced. */
  label?: string;
}) {
  const px = `${size}px`;
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center ${VARIANT_COLOR[variant]} ${className}`}
    >
      <span
        aria-hidden
        className="inline-block rounded-full border-2 border-current border-r-transparent animate-spin"
        style={{ width: px, height: px }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
