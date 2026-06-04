'use client';

/**
 * Premium desktop TOP BAR for AirWatch — the slim strip that sits to the
 * RIGHT of the {@link LeftSidebar} (which owns the brand wordmark + the
 * 56px-tall logo cell that aligns with this bar's top-left corner).
 *
 * Layout (desktop-only — `hidden lg:flex`; mobile keeps the BottomNav's own
 * top strip untouched):
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  [🔍 Search flights, airports, locations…   ⌘K]   ● LIVE·WS  …  │
 *   │                                       Alerts  Saved  Filters  ◍  │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Everything here reuses single sources of truth — no hard-coded colours,
 * no faked behaviour:
 *   - SEARCH opens the REAL Cmd+K command palette by synthesising the exact
 *     hotkey {@link CommandPaletteController} listens for — the same trick
 *     BottomNav's ⌘K button already uses. No private palette state to share.
 *   - ALERTS links to `/geofences` (the app's proximity-alert surface — there
 *     is no `/alerts` route) with an unread badge sourced from `alertStore`.
 *   - SAVED links to `/saved` (the bookmarked-flights page — there is no
 *     `/bookmarks` route) with a count badge from `favoritesStore`.
 *   - FILTERS toggles the real `cargoOnly` map filter in `settingsStore` —
 *     the same boolean the MapToolbar's cargo button drives, so the map
 *     markers actually re-filter.
 *   - The AVATAR links to `/settings` using the shared `Avatar` primitive.
 *   - The `● LIVE·WS` transport pill (de-duplicated out of the map's old
 *     brand overlay) lives here on desktop, reading `transport` straight
 *     from the flight store.
 *
 * Routing notes mirror LeftSidebar's mapping so both surfaces stay coherent.
 */

import Link from 'next/link';
import { Bell, Bookmark, Search, SlidersHorizontal } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Avatar } from '@/components/ui/Avatar';
import { Kbd } from '@/components/ui/Kbd';
import { Tag } from '@/components/ui/Tag';
import { Tooltip } from '@/components/ui/Tooltip';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useAlertStore } from '@/lib/stores/alertStore';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { t } from '@/lib/i18n/translations';

/** Opens the existing Cmd+K palette by synthesising the global hotkey that
 *  {@link CommandPaletteController} listens for. Identical to the trigger
 *  BottomNav uses, so there's a single palette-open path app-wide. */
function openCommandPalette() {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }),
  );
}

/** Ghost icon-button chrome cloned for the nav <Link>s (Alerts / Saved).
 *  IconButton renders a real <button>, so navigation actions can't use it
 *  without nesting interactives — we mirror its `variant="ghost" size="md"`
 *  classes here so the strip reads as one coherent control cluster. */
const ICON_LINK_CLASS =
  'w-9 h-9 inline-flex items-center justify-center rounded-lg transition-all duration-150 ease-out ' +
  'bg-transparent border border-transparent text-[var(--text-secondary)] ' +
  'hover:text-[var(--text-primary)] hover:bg-white/5 active:scale-95 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50';

/** Small numeric pill rendered over an action icon (unread alerts / saved
 *  count). Caps at 99+ so a runaway count can't blow out the layout. */
function CountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[var(--error)] text-white t-meta tabular px-1 animate-counter-pop pointer-events-none"
      aria-label={label}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function TopBar() {
  const language = useSettingsStore((s) => s.language);
  const transport = useFlightStore((s) => s.transport);

  // Real map filter: the cargo-only toggle (same boolean the MapToolbar's
  // cargo button drives). Reading + writing the persisted store directly
  // means the map markers re-filter without any new shared state.
  const cargoOnly = useSettingsStore((s) => s.cargoOnly);
  const setCargoOnly = useSettingsStore((s) => s.setCargoOnly);

  // Unread alert badge — count of FlightAlerts not yet marked read.
  const unreadAlerts = useAlertStore((s) => s.alerts.reduce((n, a) => (a.read ? n : n + 1), 0));

  // Saved/bookmarked count.
  const savedCount = useFavoritesStore((s) => s.items.length);

  const filtersLabel = cargoOnly ? t('cargo_only_off', language) : t('cargo_only_on', language);

  return (
    <header
      className="glass-panel hidden lg:flex items-center gap-3 fixed top-0 left-64 right-0 h-14 z-30 px-4 rounded-none border-x-0 border-t-0 border-b border-[var(--glass-border)]"
      aria-label={t('aria_primary_navigation', language)}
    >
      {/* ── LEFT: global search → opens the real Cmd+K palette ─────────── */}
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label={t('command_palette_open_with_shortcut', language)}
        className="group flex items-center gap-2.5 h-9 min-w-0 flex-1 max-w-md rounded-lg px-3 bg-white/5 border border-[var(--glass-border)] text-left transition-colors duration-150 hover:border-[var(--primary)]/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:border-[var(--primary)]/60"
      >
        <Search
          size={15}
          aria-hidden
          className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors"
        />
        <span className="flex-1 truncate t-body text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
          {t('search_placeholder', language)}
        </span>
        <Kbd className="shrink-0">⌘K</Kbd>
      </button>

      {/* ── LIVE transport pill — moved here from the old map brand overlay
            so the wordmark isn't duplicated against the sidebar. ───────── */}
      <Tag
        variant={transport ? 'success' : 'muted'}
        size="sm"
        dot
        className="shrink-0"
        title={transport === 'websocket' ? 'WebSocket push' : transport === 'polling' ? 'HTTP polling' : undefined}
      >
        {transport ? `LIVE${transport === 'websocket' ? ' · WS' : ''}` : 'OFFLINE'}
      </Tag>

      {/* ── RIGHT: Alerts · Saved · Filters · Account ──────────────────── */}
      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip label={t('nav_geofences', language)} side="bottom">
          <span className="relative inline-flex">
            <Link href="/geofences" aria-label={t('nav_geofences', language)} className={ICON_LINK_CLASS}>
              <Bell size={18} aria-hidden />
            </Link>
            <CountBadge count={unreadAlerts} label={`${unreadAlerts} unread`} />
          </span>
        </Tooltip>

        <Tooltip label={t('nav_saved', language)} side="bottom">
          <span className="relative inline-flex">
            <Link href="/saved" aria-label={t('nav_saved', language)} className={ICON_LINK_CLASS}>
              <Bookmark size={18} aria-hidden />
            </Link>
            <CountBadge count={savedCount} label={`${savedCount} saved`} />
          </span>
        </Tooltip>

        <Tooltip label={filtersLabel} side="bottom">
          <IconButton
            aria-label={filtersLabel}
            onClick={() => setCargoOnly(!cargoOnly)}
            variant="ghost"
            size="md"
            tone="accent"
            active={cargoOnly}
          >
            <SlidersHorizontal size={18} aria-hidden />
          </IconButton>
        </Tooltip>

        <Tooltip label={t('nav_settings', language)} side="bottom">
          <Link
            href="/settings"
            aria-label={t('nav_settings', language)}
            className="ml-1 inline-flex rounded-full transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
          >
            <Avatar name="AirWatch" size={32} showDot dotStatus={transport ? 'success' : 'warning'} />
          </Link>
        </Tooltip>
      </div>
    </header>
  );
}
