'use client';

import { Layers } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { MapStyle } from '@/lib/types';
import { MAP_STYLES, STYLE_ORDER } from '@/components/map/mapStyles';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

/**
 * Compact style switcher: one click opens a vertical popover of all
 * available basemap styles; one more click selects. Replaces the older
 * cycle-through-on-click pattern (six clicks to come back to the start).
 *
 * Performance shape:
 *   * Memoized so the parent's frequent re-renders (on every aircraft
 *     position tick) don't reflow the popover.
 *   * Closes on outside-click via a single document-level listener,
 *     attached only while the popover is open — no idle cost.
 *   * Picker entries don't render thumbnails; rendering six basemap
 *     previews would re-fetch tiles for styles the user may never pick.
 *     The 3-letter style code (DRK, SAT, NGT, …) doubles as the legend
 *     so the user knows what each option maps to without needing a
 *     screenshot fetch.
 */
export const MapStylePicker = memo(function MapStylePicker({
  mapStyle,
  onChange,
}: {
  mapStyle: MapStyle;
  onChange: (next: MapStyle) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const language = useSettingsStore((s) => s.language);

  // Close on outside click + Escape. Only attach handlers while open
  // so the picker is free when collapsed.
  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const select = useCallback(
    (next: MapStyle) => {
      onChange(next);
      setOpen(false);
    },
    [onChange]
  );

  const current = MAP_STYLES[mapStyle];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Surface"
        aria-label="Surface"
        className={`glass-panel p-2 hover:bg-white/10 transition-colors cursor-pointer relative ${
          open ? 'bg-[var(--primary)]/15 border-[var(--primary)]/30' : ''
        }`}
      >
        <Layers size={18} className="text-[var(--primary)]" />
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-[var(--font-heading)] font-bold text-[var(--text-muted)] tracking-wider uppercase">
          {current.label}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('aria_choose_map_style', language)}
          className="absolute top-0 right-full mr-2 glass-panel py-1.5 px-1 flex flex-col gap-0.5 min-w-[64px]"
        >
          {STYLE_ORDER.map((id) => {
            const style = MAP_STYLES[id];
            const active = id === mapStyle;
            return (
              <button
                key={id}
                role="option"
                aria-selected={active}
                onClick={() => select(id)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer text-left ${
                  active
                    ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                    : 'hover:bg-white/10 text-[var(--text-secondary)]'
                }`}
                title={id}
              >
                {/* Color swatch — uses the style's "high altitude" hue
                    as a recognizable preview. Cheap, no fetches. */}
                <span
                  aria-hidden
                  className="w-2.5 h-2.5 rounded-sm border border-white/15"
                  style={{ backgroundColor: style.colors.high }}
                />
                <span className="text-[10px] font-[var(--font-heading)] font-bold tracking-wider uppercase">
                  {style.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
