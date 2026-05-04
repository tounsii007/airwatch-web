'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/**
 * Generic table search-input — drives a `?q=…` URL search-param.
 *
 * Pattern:
 *   * Server component reads `?q` from {@code searchParams} and filters
 *     its rows accordingly (the search is server-side; we don't ship
 *     thousands of rows to the client just to filter them in JS).
 *   * This client component is a controlled input that debounces input
 *     by 250 ms before pushing the URL update — avoids a server-component
 *     re-render on every keystroke.
 *   * Page resets to `?page=1` on every search change (otherwise a deep
 *     page index might fall off the end of a smaller filtered result set).
 *
 * Drop into any table header next to the title:
 *
 *     <TableSearch placeholder="Search by user / action / IP…" />
 */

interface Props {
  placeholder?: string;
  /** URL key — default 'q'. Multiple searches per page need distinct keys. */
  paramName?: string;
  /** Debounce in ms. */
  debounceMs?: number;
}

export function TableSearch({
  placeholder = 'Search…',
  paramName = 'q',
  debounceMs = 250,
}: Props) {
  const router    = useRouter();
  const pathname  = usePathname();
  const params    = useSearchParams();
  const initial   = params.get(paramName) ?? '';
  const [value, setValue] = useState(initial);

  // Reset local state if the URL param changes from outside (e.g. a Reset link).
  useEffect(() => { setValue(initial);   }, [initial]);

  // Debounce → URL push.
  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === initial) return;
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (trimmed) next.set(paramName, trimmed);
      else         next.delete(paramName);
      // Reset to first page on filter change.
      next.delete('page');
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }, debounceMs);
    return () => window.clearTimeout(id);
  }, [value, debounceMs, paramName, pathname, params, router, initial]);

  function clear() {
    setValue('');
    const next = new URLSearchParams(params.toString());
    next.delete(paramName);
    next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 8,
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.8125rem',
          color: 'var(--text-primary)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '0.35rem 1.75rem 0.35rem 1.75rem',
          minWidth: 240,
          outline: 'none',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary-bright) 50%, var(--border))'; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: 4,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            padding: '0.15rem 0.45rem',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
