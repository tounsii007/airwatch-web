'use client';

/**
 * Toggle switch — for boolean settings (units, theme, notifications).
 * Renders a track + thumb that slides between states with a spring
 * curve. Keyboard accessible (Space toggles, Tab focusable) via the
 * underlying <button role="switch">.
 *
 *   <Switch checked={metric} onChange={setMetric} label="Use metric units" />
 *
 * The label is rendered inline (right side) by default; pass
 * `labelPosition="left"` for setting-row layouts. When `label` is
 * omitted, the consumer is responsible for an external `aria-label`.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Size = 'sm' | 'md';

const SIZE_TRACK: Record<Size, string> = {
  sm: 'w-8 h-4',
  md: 'w-10 h-5',
};

const SIZE_THUMB: Record<Size, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
};

const SIZE_TRANSLATE: Record<Size, string> = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
};

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'type'> {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  /** Sub-label rendered beneath the main label. */
  hint?: ReactNode;
  labelPosition?: 'left' | 'right';
  size?: Size;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    onChange,
    label,
    hint,
    labelPosition = 'right',
    size = 'md',
    disabled,
    className = '',
    ...rest
  },
  ref,
) {
  const track = SIZE_TRACK[size];
  const thumb = SIZE_THUMB[size];
  const translate = SIZE_TRANSLATE[size];

  const switchBtn = (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex items-center ${track} shrink-0 rounded-full transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'bg-[var(--primary)] shadow-[0_0_12px_-2px_var(--primary)]'
          : 'bg-white/10 border border-[var(--glass-border)]'
      }`}
      {...rest}
    >
      <span
        aria-hidden
        className={`absolute left-0.5 ${thumb} rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.34,1.4,0.5,1)] ${
          checked ? translate : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (!label) return switchBtn;

  const labelBlock = (
    <span className="flex-1 min-w-0">
      <span className="block t-body text-[var(--text-primary)]">{label}</span>
      {hint && <span className="block t-meta text-[var(--text-muted)] mt-0.5">{hint}</span>}
    </span>
  );

  return (
    <label
      className={`flex items-center gap-3 ${
        labelPosition === 'left' ? 'flex-row' : 'flex-row-reverse'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {labelBlock}
      {switchBtn}
    </label>
  );
});
