'use client';

import { useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Kbd } from '@/components/ui/Kbd';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** When true, render a small spinner in place of the clear button to
   *  signal that suggestions are being fetched. The clear button still
   *  appears once `loading` flips back to false. */
  loading?: boolean;
  /** Optional inline keyboard hint shown on the right side when the
   *  field is empty (e.g. ["⌘", "K"] or ["Esc"]). Hidden the moment the
   *  user starts typing — once there's a value the clear button takes
   *  precedence. */
  kbdHint?: readonly string[];
  /** Optional callback fired when the Escape key is pressed inside the
   *  input. Useful for closing a search overlay. */
  onEscape?: () => void;
}

/**
 * Top-level search field used on /search and the command palette. Built
 * on a glass-panel with a focus glow, an optional inline loading
 * spinner, and a keyboard-hint slot. Keeps the same external API as the
 * original implementation so the existing test-suite and call-sites
 * stay green; new behaviour is opt-in via additional props.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search flights, airlines...',
  autoFocus = true,
  loading = false,
  kbdHint,
  onEscape,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const language = useSettingsStore((s) => s.language);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const showClear = value.length > 0;
  const showKbd = !showClear && kbdHint && kbdHint.length > 0;

  return (
    <div
      className={`relative group rounded-xl glass-panel transition-shadow duration-200 ease-out
        ring-0 focus-within:ring-2 focus-within:ring-[var(--primary)]/40
        focus-within:shadow-[0_0_32px_-6px_var(--primary)] overflow-hidden`}
    >
      {/* Decorative scan-line gradient that runs along the bottom edge
          while the field is focused. Pure CSS, GPU-only animation. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 bottom-0 h-px opacity-0 group-focus-within:opacity-100 transition-opacity duration-200"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--primary) 50%, transparent 100%)',
        }}
      />
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none group-focus-within:text-[var(--primary)] transition-colors duration-200"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && onEscape) {
            e.preventDefault();
            onEscape();
          }
        }}
        placeholder={placeholder}
        className="w-full pl-10 pr-12 py-3 font-[var(--font-body)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none bg-transparent"
        aria-label={placeholder}
      />
      {loading ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex">
          <Spinner size={14} variant="primary" />
        </span>
      ) : showClear ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('aria_clear_search', language)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/5 active:scale-95 transition-all"
        >
          <X size={14} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-hidden />
        </button>
      ) : showKbd ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <Kbd keys={kbdHint!} />
        </span>
      ) : null}
    </div>
  );
}
