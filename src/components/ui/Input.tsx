'use client';

/**
 * Glass-styled text input that matches the design language. Optional
 * leading/trailing icon slots, clearable affordance, and an inline label
 * helper. Forwards the ref so React Hook Form / focus management works.
 *
 *   <Input label="Callsign" value={cs} onChange={setCs} placeholder="DLH1JC" />
 *
 *   <Input
 *     leadingIcon={<Search size={14} />}
 *     value={q}
 *     onChange={setQ}
 *     clearable
 *   />
 */

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

type Size = 'sm' | 'md' | 'lg';

const SIZE_PAD: Record<Size, string> = {
  sm: 'py-1.5 text-[0.75rem]',
  md: 'py-2.5 text-sm',
  lg: 'py-3 text-base',
};

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  size?: Size;
  label?: string;
  /** Helper text shown below the field. */
  hint?: ReactNode;
  /** Error string — when set, applies the error styling and ignores `hint`. */
  error?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Show a clear (×) button when the field has a value. */
  clearable?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    value,
    onChange,
    size = 'md',
    label,
    hint,
    error,
    leadingIcon,
    trailingIcon,
    clearable = false,
    className = '',
    id,
    disabled,
    placeholder,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const language = useSettingsStore((s) => s.language);

  const showClear = clearable && value.length > 0 && !disabled;

  const padLeft = leadingIcon ? 'pl-9' : 'pl-3';
  const padRight = showClear || trailingIcon ? 'pr-9' : 'pr-3';

  const ringCls = error
    ? 'ring-1 ring-[var(--error)]/60 focus-within:ring-[var(--error)]'
    : 'focus-within:ring-1 focus-within:ring-[var(--primary)]';

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block t-label t-mono font-bold tracking-wider text-[var(--text-secondary)] mb-1.5 uppercase"
        >
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center glass-panel rounded-xl ${ringCls} transition-shadow duration-150`}
      >
        {leadingIcon && (
          <span
            className="absolute left-3 inline-flex text-[var(--text-muted)] pointer-events-none"
            aria-hidden
          >
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? hintId : undefined}
          className={`w-full bg-transparent outline-none font-[var(--font-body)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-50 ${padLeft} ${padRight} ${SIZE_PAD[size]}`}
          {...rest}
        />
        {showClear ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 p-1 rounded-md hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label={t('aria_clear_input', language)}
          >
            <X size={14} aria-hidden />
          </button>
        ) : (
          trailingIcon && (
            <span className="absolute right-3 inline-flex text-[var(--text-muted)] pointer-events-none" aria-hidden>
              {trailingIcon}
            </span>
          )
        )}
      </div>
      {(hint || error) && (
        <p
          id={hintId}
          className={`mt-1.5 t-meta ${error ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
});
