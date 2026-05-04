/**
 * Per-page "Saved Views" / bookmarks. (Phase 3.4)
 *
 * Pages that show filterable lists (audit, errors, endpoints, sessions)
 * end up with operators repeating the same filter combos:
 *   * "Show me all LOGIN_FAILED in the last 24h"
 *   * "Show only POST /admin/api/* with status >= 500"
 *
 * This hook + UI lets operators name + persist a filter set in
 * localStorage, switch between them, and rename / delete. Storage is
 * per-page (keyed by {@code pageId}) and per-browser; no server-side
 * persistence — these are personal bookmarks, not shared dashboards.
 *
 * <h3>Usage</h3>
 * ```
 * const filters = { q: 'LOGIN_FAILED', limit: 50 };
 * const { views, save, apply, remove } = useSavedViews<typeof filters>('audit');
 *
 * <SavedViewsBar
 *   views={views}
 *   currentFilters={filters}
 *   onApply={(f) => setFilters(f)}
 *   onSave={(name) => save(name, filters)}
 *   onRemove={remove}
 * />
 * ```
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'airwatch.admin.savedviews';

export interface SavedView<F> {
  id: string;       // uuid-ish, generated at save time
  name: string;
  filters: F;
  createdAt: number;
}

interface AllStorage {
  [pageId: string]: SavedView<unknown>[];
}

function loadAll(): AllStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AllStorage : {};
  } catch { return {}; }
}

function saveAll(all: AllStorage) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* quota or disabled */ }
}

export function useSavedViews<F>(pageId: string) {
  const [views, setViews] = useState<SavedView<F>[]>([]);

  useEffect(() => {
    const all = loadAll();
    setViews((all[pageId] as SavedView<F>[]) ?? []);
  }, [pageId]);

  const save = useCallback((name: string, filters: F) => {
    const all = loadAll();
    const list = (all[pageId] as SavedView<F>[]) ?? [];
    const view: SavedView<F> = {
      id: 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      name: name.trim().slice(0, 60) || 'Untitled',
      filters,
      createdAt: Date.now(),
    };
    const next = [...list, view];
    saveAll({ ...all, [pageId]: next as SavedView<unknown>[] });
    setViews(next);
    return view;
  }, [pageId]);

  const remove = useCallback((id: string) => {
    const all = loadAll();
    const list = (all[pageId] as SavedView<F>[]) ?? [];
    const next = list.filter(v => v.id !== id);
    saveAll({ ...all, [pageId]: next as SavedView<unknown>[] });
    setViews(next);
  }, [pageId]);

  return { views, save, remove };
}

interface BarProps<F> {
  views: SavedView<F>[];
  currentFilters: F;
  onApply: (filters: F) => void;
  onSave: (name: string) => void;
  onRemove: (id: string) => void;
  /**
   * Optional comparison function — used to highlight the active view
   * if the current filters match a saved one. Defaults to JSON.stringify
   * comparison, which is fine for primitive-keyed filter objects.
   */
  isMatch?: (a: F, b: F) => boolean;
}

export function SavedViewsBar<F>({ views, currentFilters, onApply, onSave, onRemove, isMatch }: BarProps<F>) {
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [name, setName] = useState('');

  const matches = (v: SavedView<F>) => {
    const cmp = isMatch ?? ((a, b) => JSON.stringify(a) === JSON.stringify(b));
    return cmp(v.filters, currentFilters);
  };

  function handleSave() {
    if (!name.trim()) return;
    onSave(name);
    setName('');
    setShowSaveInput(false);
  }

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      alignItems: 'center',
      padding: '0.5rem 0.75rem',
      background: 'var(--sunken)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      marginBottom: '0.75rem',
    }}>
      <span style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '0.625rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        fontWeight: 700,
      }}>Views:</span>

      {views.length === 0 && !showSaveInput && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          None yet. Save the current filters as a view.
        </span>
      )}

      {views.map(v => {
        const active = matches(v);
        return (
          <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <button
              type="button"
              onClick={() => onApply(v.filters)}
              title={`Created ${new Date(v.createdAt).toLocaleString()}`}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.625rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                color: active ? 'var(--primary-bright)' : 'var(--text-secondary)',
                background: active
                  ? 'color-mix(in srgb, var(--primary-bright) 14%, transparent)'
                  : 'var(--sunken)',
                border: `1px solid ${active
                  ? 'color-mix(in srgb, var(--primary-bright) 32%, transparent)'
                  : 'var(--border)'}`,
                padding: '0.25rem 0.6rem',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >{v.name}</button>
            <button
              type="button"
              onClick={() => { if (confirm(`Delete view "${v.name}"?`)) onRemove(v.id); }}
              title="Delete"
              aria-label={`Delete ${v.name}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                padding: '0 2px',
              }}
            >×</button>
          </span>
        );
      })}

      {showSaveInput ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
            placeholder="View name…"
            maxLength={60}
            style={{
              background: 'var(--sunken)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              padding: '0.2rem 0.5rem',
              color: 'var(--text-primary)',
              fontSize: '0.75rem',
              fontFamily: 'inherit',
              width: 160,
            }}
          />
          <button type="button" onClick={handleSave}
                  style={smallPrimaryStyle}>Save</button>
          <button type="button" onClick={() => setShowSaveInput(false)}
                  style={smallMutedStyle}>Cancel</button>
        </span>
      ) : (
        <button type="button" onClick={() => setShowSaveInput(true)}
                style={smallPrimaryStyle}>+ Save current</button>
      )}
    </div>
  );
}

const smallPrimaryStyle: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
  padding: '0.25rem 0.6rem',
  borderRadius: 3,
  cursor: 'pointer',
};
const smallMutedStyle: React.CSSProperties = {
  ...smallPrimaryStyle,
  color: 'var(--text-muted)',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
};
