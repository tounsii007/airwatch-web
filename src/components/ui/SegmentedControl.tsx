'use client';

/**
 * Segmented control — like the iOS picker: a row of mutually-exclusive
 * choices with a sliding indicator. Use for compact mode-switchers
 * (units: ft / m, sort: name / delay / traffic, view: list / grid).
 *
 *   <SegmentedControl
 *     value={unit}
 *     onChange={setUnit}
 *     options={[
 *       { value: 'ft', label: 'FT' },
 *       { value: 'm', label: 'M' },
 *     ]}
 *   />
 *
 * The indicator is positioned via percentage transforms so the control
 * scales fluidly inside any parent without DOM measurement. Keyboard
 * support: Arrow Left / Right moves selection, focus stays on the
 * focused segment.
 */

import { type ReactNode, useId } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional icon rendered before the label (e.g. lucide icon). */
  icon?: ReactNode;
  /** Disable a single segment without disabling the whole control. */
  disabled?: boolean;
  /** Hover/long-press tooltip — pure-CSS via the title attr. */
  title?: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: readonly SegmentedOption<T>[];
  size?: 'sm' | 'md';
  /** When set, the control fills its parent width and segments share
   *  equal flex widths. Default `false` for hug-content sizing. */
  fullWidth?: boolean;
  className?: string;
  /** Optional aria-label for the radiogroup. */
  ariaLabel?: string;
}

const SIZE_PAD: Record<'sm' | 'md', string> = {
  sm: 'px-2.5 py-1 text-[0.625rem]',
  md: 'px-3.5 py-1.5 text-[0.75rem]',
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  fullWidth = false,
  className = '',
  ariaLabel,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const segmentWidthPct = 100 / Math.max(1, options.length);

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    // Skip over disabled neighbours.
    for (let i = 1; i <= options.length; i++) {
      const next = (activeIndex + dir * i + options.length) % options.length;
      const candidate = options[next];
      if (!candidate.disabled) {
        onChange(candidate.value);
        // Move focus to the newly active segment for keyboard continuity.
        const btn = document.getElementById(`${groupId}-${candidate.value}`);
        btn?.focus();
        return;
      }
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center p-0.5 rounded-xl glass-panel ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* Sliding indicator. Width and translate are kept in sync via
          percentages of the parent — no JS measurement needed. */}
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/25 shadow-[0_0_24px_-8px_var(--primary)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.2,0.5,1)]"
        style={{
          width: `calc(${segmentWidthPct}% - 4px)`,
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 0}px))`,
        }}
      />
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            id={`${groupId}-${opt.value}`}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={opt.disabled}
            onClick={() => !opt.disabled && onChange(opt.value)}
            onKeyDown={handleKey}
            title={opt.title}
            tabIndex={isActive ? 0 : -1}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 ${SIZE_PAD[size]} font-[var(--font-heading)] font-bold tracking-wider uppercase rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'text-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            } ${fullWidth ? 'flex-1' : ''}`}
          >
            {opt.icon && <span className="inline-flex shrink-0" aria-hidden>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
