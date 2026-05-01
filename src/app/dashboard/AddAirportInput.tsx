'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { useAirportSearch } from '@/app/dashboard/useAirportSearch';
import type { AppLanguage } from '@/lib/types';

interface Props {
  language: AppLanguage;
  value: string;
  onChange: (next: string) => void;
  /** Called with the resolved IATA — either from autocomplete pick or
   *  from the raw input on Enter (which the parent will validate). */
  onAdd: (iata: string) => void;
  /** IATAs already on the dashboard — those are dimmed in the dropdown
   *  and a click on them is a no-op. */
  existing: readonly string[];
}

/** Add-airport row with live IATA + city autocomplete. */
export function AddAirportInput({ language, value, onChange, onAdd, existing }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search is purely derived from the current value — useMemo inside
  // the hook prevents recomputation on unrelated re-renders.
  const results = useAirportSearch(value);

  // Click-outside closes the dropdown. Pointer events catch both mouse
  // and touch on mobile.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  // Reset highlight when the result set changes so it doesn't point
  // past the end after the user keeps typing. Deferred onto a
  // microtask so the setState fires outside the synchronous effect
  // body (React 19 set-state-in-effect rule).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setHighlight(0); });
    return () => { cancelled = true; };
  }, [results.length]);

  const existingSet = new Set(existing);
  const showDropdown = open && value.length > 0 && results.length > 0;

  function commit(iata: string) {
    if (!iata || existingSet.has(iata)) return;
    onAdd(iata);
    onChange('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && showDropdown) {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp' && showDropdown) {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown) commit(results[highlight].iata);
      else commit(value.toUpperCase());
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <GlassPanel className="flex items-center gap-2 px-3 py-2">
        <Search size={16} className="text-[var(--text-muted)] shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('add_airport_hint', language)}
          className="flex-1 bg-transparent t-body t-mono font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal outline-none tracking-wider"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="iata-autocomplete-list"
          aria-activedescendant={showDropdown ? `iata-opt-${highlight}` : undefined}
        />
        <button
          onClick={() => commit(value.toUpperCase())}
          disabled={!value.trim()}
          className="px-3 py-1 rounded-lg t-meta t-mono font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={11} className="inline mr-1" aria-hidden />
          {t('add', language)}
        </button>
      </GlassPanel>

      {showDropdown && (
        <ul
          id="iata-autocomplete-list"
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 glass-panel-floating max-h-72 overflow-auto py-1"
        >
          {results.map((r, i) => {
            const dup = existingSet.has(r.iata);
            const active = i === highlight;
            return (
              <li
                key={r.iata}
                id={`iata-opt-${i}`}
                role="option"
                aria-selected={active}
                aria-disabled={dup}
                onPointerEnter={() => setHighlight(i)}
                onPointerDown={(e) => { e.preventDefault(); commit(r.iata); }}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${
                  active ? 'bg-[var(--primary)]/12' : ''
                } ${dup ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {r.country && (
                  <Image
                    src={`/flags/${r.country.toLowerCase()}.svg`}
                    alt=""
                    width={16}
                    height={12}
                    unoptimized
                    className="rounded-[2px] ring-1 ring-black/20 shrink-0"
                  />
                )}
                <span className="t-label t-mono font-bold text-[var(--primary-bright)] w-12">
                  {r.iata}
                </span>
                <span className="t-label text-[var(--text-primary)] truncate flex-1">
                  {r.name}
                </span>
                {dup && (
                  <span className="t-meta t-mono text-[var(--text-muted)]">added</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
