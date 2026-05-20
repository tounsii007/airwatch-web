/**
 * Labelled detail row used in panels, info readouts, and "more details"
 * drawers. Pairs a tiny uppercase label with a value that's either a
 * single line, a copyable string, or arbitrary children. Mirrors the
 * existing detail-row pattern in FlightDetailsPanel but as a typed,
 * tested primitive that any page can reuse.
 *
 *   <KeyValueRow label="Altitude" value="36 000 ft" />
 *   <KeyValueRow label="ICAO24" value="3C6AC2" copyable />
 *   <KeyValueRow label="Status">
 *     <StatusBadge status="en-route" />
 *   </KeyValueRow>
 *
 * Why a dedicated primitive: the existing detail rows live inside
 * MobileDetailsPanel and DesktopDetailsPanel and re-implement the same
 * grid + label + truncation tricks. Hoisting it lets us style the
 * copyable affordance once and reuse the row on the airport / airline
 * detail pages.
 */

'use client';

import { type ReactNode, useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface KeyValueRowProps {
  label: ReactNode;
  /** Short value rendered as the row's main content. Ignored if
   *  `children` is supplied. */
  value?: ReactNode;
  /** Custom value content (badge, link, anything). Takes precedence
   *  over `value`. */
  children?: ReactNode;
  /** When true and `value` is a string, render a small copy button.
   *  The button shows a check glyph for 1.2s after a successful copy. */
  copyable?: boolean;
  /** Optional helper rendered below the value in muted small text. */
  hint?: ReactNode;
  /** Override the layout. 'inline' (default) keeps label + value on a
   *  single row; 'stacked' puts the label above the value (handy for
   *  long values that would otherwise truncate). */
  variant?: 'inline' | 'stacked';
  className?: string;
}

export function KeyValueRow({
  label,
  value,
  children,
  copyable = false,
  hint,
  variant = 'inline',
  className = '',
}: KeyValueRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof value !== 'string') return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // The button is opportunistic — if clipboard isn't available
      // (insecure context, denied permission) we silently no-op.
    }
  };

  const labelEl = (
    <dt className="t-meta t-mono font-bold tracking-wider text-[var(--text-muted)] uppercase shrink-0">
      {label}
    </dt>
  );

  const valueEl = (
    <dd className="t-body text-[var(--text-primary)] tabular flex items-center gap-1.5 min-w-0">
      <span className="truncate">{children ?? value}</span>
      {copyable && typeof value === 'string' && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : `Copy ${typeof label === 'string' ? label : 'value'}`}
          className="shrink-0 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 active:scale-95 transition-all"
        >
          {copied ? (
            <Check size={12} className="text-[var(--success)]" aria-hidden />
          ) : (
            <Copy size={12} aria-hidden />
          )}
        </button>
      )}
    </dd>
  );

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {labelEl}
        {valueEl}
        {hint && (
          <p className="t-meta text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-baseline justify-between gap-3 ${className}`}>
      {labelEl}
      <div className="flex-1 min-w-0 text-right">
        {valueEl}
        {hint && (
          <p className="t-meta text-[var(--text-muted)] mt-0.5">{hint}</p>
        )}
      </div>
    </div>
  );
}
