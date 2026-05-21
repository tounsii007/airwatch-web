'use client';

/**
 * Cmd+K / Ctrl+K global command palette. Searches across:
 *   * Every nav route (always available, even when offline).
 *   * Live aircraft (callsign / icao24).
 *   * Airlines (ICAO/IATA/name).
 *   * Airports (IATA/name).
 *
 * Hotkey: Cmd+K (mac) / Ctrl+K (everywhere else) / `/` when no input
 * is focused. Esc closes. Arrow keys navigate, Enter activates.
 *
 * Performance:
 *   * Debounced result computation via useMemo on the trimmed query —
 *     we don't need a separate debounce because the searches are
 *     pure-JS over in-memory arrays.
 *   * Capped at MAX_RESULTS_PER_GROUP per group so a generic query
 *     ("a") doesn't render thousands of nodes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, type LucideIcon } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { AIRPORTS } from '@/lib/data/airports';
import { searchAirlines } from '@/lib/data/airlines';
import { t } from '@/lib/i18n/translations';
import { NAV_ITEMS } from '@/components/layout/navItems';

interface Result {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  /** Action invoked when the user picks this row. Returns true to keep
   *  the palette open — most rows close on selection (default). */
  onSelect: () => void;
}

const MAX_RESULTS_PER_GROUP = 5;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);

  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on open so the user always sees a fresh palette. The
  // setState calls are deferred onto a frame so they fire outside the
  // synchronous effect body (React 19 set-state-in-effect rule); the
  // rAF also doubles as the focus deferral we already needed.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled) return;
      setQuery('');
      setHighlight(0);
      inputRef.current?.focus();
    });
    return () => { cancelled = true; };
  }, [open]);

  const groups = useMemo(() => buildResults(query, language, aircraftMap, router, selectAircraft, onClose),
    [query, language, aircraftMap, router, selectAircraft, onClose]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Reset highlight when the result count changes — otherwise it can
  // point past the end after the user keeps typing. Microtask defer
  // for the same React 19 rule.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setHighlight(0); });
    return () => { cancelled = true; };
  }, [flat.length]);

  // Esc to close, arrows + enter to navigate.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter' && flat[highlight]) {
        e.preventDefault();
        flat[highlight].onSelect();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, flat, highlight, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 animate-fade-in">
      <button
        type="button"
        aria-label={t('aria_close_command_palette', language)}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('aria_command_palette', language)}
        className="relative z-10 w-full max-w-xl glass-panel-floating overflow-hidden animate-scale-in"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--glass-border)]">
          <Search size={16} className="text-[var(--text-muted)]" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('command_palette_placeholder', language)}
            className="flex-1 bg-transparent t-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            aria-autocomplete="list"
            aria-controls="cmd-palette-list"
          />
          <kbd className="t-meta t-mono px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-muted)] border border-[var(--glass-border)]">
            ESC
          </kbd>
          <button onClick={onClose} aria-label={t('aria_close', language)} className="p-1 rounded hover:bg-white/10">
            <X size={14} className="text-[var(--text-muted)]" aria-hidden />
          </button>
        </div>

        <div id="cmd-palette-list" role="listbox" className="max-h-96 overflow-auto">
          {flat.length === 0 ? (
            <div className="px-4 py-8 text-center t-label text-[var(--text-muted)]">
              {t('command_palette_no_results', language)}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-4 pt-3 pb-1 t-meta t-mono font-bold tracking-widest text-[var(--text-muted)] uppercase">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const idx = flat.indexOf(item);
                  const isActive = idx === highlight;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      role="option"
                      aria-selected={isActive}
                      onPointerEnter={() => setHighlight(idx)}
                      onClick={item.onSelect}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive ? 'bg-[var(--primary)]/12' : 'hover:bg-white/5'
                      }`}
                    >
                      {Icon && <Icon size={14} className="text-[var(--text-muted)] shrink-0" aria-hidden />}
                      <span className="flex-1 truncate t-label text-[var(--text-primary)]">
                        {item.label}
                      </span>
                      {item.hint && (
                        <span className="t-meta t-mono text-[var(--text-muted)] shrink-0">{item.hint}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Result builder ──────────────────────────────────────────────────────

interface ResultGroup {
  label: string;
  items: Result[];
}

function buildResults(
  query: string,
  language: import('@/lib/types').AppLanguage,
  aircraftMap: ReturnType<typeof useFlightStore.getState>['aircraftMap'],
  router: ReturnType<typeof useRouter>,
  selectAircraft: ReturnType<typeof useFlightStore.getState>['selectAircraft'],
  close: () => void,
): ResultGroup[] {
  const trimmed = query.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  // ── Navigation: always shown, filtered by query if present ────────
  const navItems: Result[] = NAV_ITEMS
    .filter((nav) => {
      if (!trimmed) return true;
      const label = t(nav.labelKey, language).toLowerCase();
      return label.includes(lower) || nav.href.includes(lower);
    })
    .map((nav) => ({
      id: `nav-${nav.href}`,
      group: 'navigation',
      label: t(nav.labelKey, language),
      hint: nav.href,
      icon: nav.icon,
      onSelect: () => { router.push(nav.href); close(); },
    }));

  if (!trimmed) {
    // No query → show only navigation, capped.
    return [{ label: t('command_palette_navigation', language), items: navItems.slice(0, 12) }];
  }

  // ── Live aircraft (callsign / icao24) ────────────────────────────
  const flights: Result[] = [];
  aircraftMap.forEach((ac) => {
    if (flights.length >= MAX_RESULTS_PER_GROUP) return;
    const matchesCallsign = ac.callsign && ac.callsign.toUpperCase().includes(upper);
    const matchesIcao = ac.icao24.includes(lower);
    if (!matchesCallsign && !matchesIcao) return;
    flights.push({
      id: `flight-${ac.icao24}`,
      group: 'flights',
      label: ac.callsign?.trim() || ac.icao24,
      hint: ac.depIata && ac.arrIata ? `${ac.depIata} → ${ac.arrIata}` : ac.icao24,
      onSelect: () => { selectAircraft(ac); router.push('/'); close(); },
    });
  });

  // ── Airlines ─────────────────────────────────────────────────────
  const airlines: Result[] = upper.length >= 2
    ? searchAirlines(upper).slice(0, MAX_RESULTS_PER_GROUP).map((info) => ({
        id: `airline-${info.icao}`,
        group: 'airlines',
        label: info.name,
        hint: info.icao,
        onSelect: () => { router.push(`/airlines/${info.icao}`); close(); },
      }))
    : [];

  // ── Airports ─────────────────────────────────────────────────────
  const airports: Result[] = [];
  const airportEntries = Object.entries(AIRPORTS);
  for (const [iata, record] of airportEntries) {
    if (airports.length >= MAX_RESULTS_PER_GROUP) break;
    const matches =
      iata.startsWith(upper) ||
      record.n.toLowerCase().includes(lower);
    if (!matches) continue;
    airports.push({
      id: `airport-${iata}`,
      group: 'airports',
      label: `${iata} — ${record.n}`,
      hint: record.c.toUpperCase(),
      onSelect: () => { router.push(`/airports/${iata}`); close(); },
    });
  }

  const groups: ResultGroup[] = [];
  if (navItems.length > 0) groups.push({ label: t('command_palette_navigation', language), items: navItems.slice(0, MAX_RESULTS_PER_GROUP) });
  if (flights.length > 0) groups.push({ label: 'FLIGHTS', items: flights });
  if (airlines.length > 0) groups.push({ label: 'AIRLINES', items: airlines });
  if (airports.length > 0) groups.push({ label: 'AIRPORTS', items: airports });
  return groups;
}
