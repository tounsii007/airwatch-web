'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { t } from '@/lib/i18n/translations';
import {
  PRIMARY_ITEMS,
  SECONDARY_ITEMS,
  type NavItem,
} from '@/components/layout/navItems';
import { MoreMenuSheet, MoreMenuTrigger } from '@/components/layout/MoreMenu';

/** Active-route detection that handles the home `/` separately so it
 *  isn't matched by every other path's prefix check. */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  language: ReturnType<typeof useSettingsStore.getState>['language'];
  favCount: number;
  variant: 'desktop' | 'mobile';
}

function NavLink({ item, isActive, language, favCount, variant }: NavLinkProps) {
  const Icon = item.icon;
  const label = t(item.labelKey, language);
  const showFavBadge = item.href === '/saved' && favCount > 0;

  if (variant === 'desktop') {
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 t-meta t-mono font-bold tracking-wider ${
          isActive
            ? 'bg-[var(--primary)]/12 text-[var(--primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="relative">
          <Icon size={14} aria-hidden className={isActive ? 'drop-shadow-[0_0_6px_var(--primary)]' : ''} />
          {showFavBadge && (
            <span
              className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[var(--error)] text-white t-meta tabular px-1"
              aria-label={`${favCount} saved`}
            >
              {favCount}
            </span>
          )}
        </span>
        {label}
        {isActive && <div className="w-1 h-1 rounded-full bg-[var(--primary)] shadow-[0_0_4px_var(--primary)]" aria-hidden />}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="relative">
        <Icon size={isActive ? 22 : 20} aria-hidden className={isActive ? 'drop-shadow-[0_0_8px_var(--primary)]' : ''} />
        {showFavBadge && (
          <span
            className="absolute -top-1 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[var(--error)] text-white t-meta tabular px-1"
            aria-label={`${favCount} saved`}
          >
            {favCount}
          </span>
        )}
      </span>
      <span className="t-meta t-mono font-bold tracking-widest">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const language = useSettingsStore((s) => s.language);
  const favCount = useFavoritesStore((s) => s.items.length);
  const [moreOpen, setMoreOpen] = useState(false);

  // Track whether any secondary route is active so the More button can
  // show the active state instead of looking idle on /compare or /globe.
  const secondaryActive = SECONDARY_ITEMS.some((i) => isActiveRoute(pathname, i.href));

  return (
    <>
      {/* Desktop: top header bar */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-12 items-center px-6 glass-panel rounded-none border-b border-[var(--glass-border)] border-x-0 border-t-0">
        <Link href="/" className="flex items-center gap-2 mr-8" aria-label="AirWatch home">
          <span className="neon-text font-[var(--font-heading)] t-label font-bold text-[var(--primary)]">
            AIRWATCH
          </span>
        </Link>

        <nav className="flex items-center gap-1 flex-1" aria-label="Primary navigation">
          {PRIMARY_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActiveRoute(pathname, item.href)}
              language={language}
              favCount={favCount}
              variant="desktop"
            />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 t-meta t-mono font-bold tracking-wider ${
              secondaryActive || moreOpen
                ? 'bg-[var(--primary)]/12 text-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5'
            }`}
          >
            {t('nav_more', language)}
          </button>
        </nav>

        {/* Cmd+K hint — clickable shortcut surface for non-keyboard users */}
        <button
          type="button"
          onClick={() => {
            // Synthesise the same hotkey the controller listens for so
            // the palette opens without us needing to share state here.
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }),
            );
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5 transition-colors"
          aria-label={t('command_palette_open_with_shortcut', language)}
        >
          <Search size={13} aria-hidden />
          <kbd className="t-meta t-mono px-1.5 py-0.5 rounded bg-white/5 border border-[var(--glass-border)]">⌘K</kbd>
        </button>
      </header>

      {/* Mobile: top bar with brand + Cmd+K equivalent */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-11 flex items-center justify-between px-4 glass-panel rounded-none border-b border-[var(--glass-border)] border-x-0 border-t-0">
        <Link href="/" className="flex items-center" aria-label="AirWatch home">
          <span className="neon-text font-[var(--font-heading)] t-label font-bold text-[var(--primary)] tracking-widest">
            AIRWATCH
          </span>
        </Link>
        <button
          type="button"
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }),
            );
          }}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label={t('command_palette_open', language)}
        >
          <Search size={16} aria-hidden />
        </button>
      </header>

      {/* Mobile: bottom bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel rounded-none border-t border-[var(--glass-border)] border-x-0 border-b-0"
        aria-label={t('primary_navigation', language)}
      >
        <div className="flex justify-around py-2 px-2">
          {PRIMARY_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActiveRoute(pathname, item.href)}
              language={language}
              favCount={favCount}
              variant="mobile"
            />
          ))}
          <MoreMenuTrigger
            open={moreOpen}
            onToggle={() => setMoreOpen((v) => !v)}
            onClose={() => setMoreOpen(false)}
          />
        </div>
      </nav>

      <MoreMenuSheet
        open={moreOpen}
        onToggle={() => setMoreOpen((v) => !v)}
        onClose={() => setMoreOpen(false)}
      />
    </>
  );
}
