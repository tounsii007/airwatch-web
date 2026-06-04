'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

interface IndicatorRect {
  x: number;
  y: number;
  w: number;
  h: number;
  ready: boolean;
}

/** Returns the bounding box (relative to `containerRef`) of the element
 *  currently marked with `data-pill-active`. Re-measures on layout
 *  changes via ResizeObserver so the indicator stays in sync after
 *  font loads or window resizes. */
function useActivePill(
  containerRef: React.RefObject<HTMLElement | null>,
  // Re-run when this changes (pathname). The hook also self-recomputes
  // on resize, so passing `pathname` here is enough.
  trackingKey: string,
): IndicatorRect {
  const [rect, setRect] = useState<IndicatorRect>({ x: 0, y: 0, w: 0, h: 0, ready: false });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const active = container.querySelector<HTMLElement>('[data-pill-active="true"]');
      if (!active) {
        setRect((prev) => ({ ...prev, ready: false }));
        return;
      }
      const a = active.getBoundingClientRect();
      const c = container.getBoundingClientRect();
      setRect({
        x: a.left - c.left,
        y: a.top - c.top,
        w: a.width,
        h: a.height,
        ready: true,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener('resize', measure);

    // Defer once more after fonts/icons settle — first paint sometimes
    // measures before the icon font swaps in, which shifts widths by
    // a pixel or two.
    const id = window.requestAnimationFrame(measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.cancelAnimationFrame(id);
    };
  }, [containerRef, trackingKey]);

  return rect;
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
        data-pill-active={isActive || undefined}
        className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg transition-colors duration-200 t-meta t-mono font-bold tracking-wider z-10 ${
          isActive
            ? 'text-[var(--primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className="relative">
          <Icon size={14} aria-hidden className={isActive ? 'drop-shadow-[0_0_6px_var(--primary)]' : ''} />
          {showFavBadge && (
            <span
              className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[var(--error)] text-white t-meta tabular px-1 animate-counter-pop"
              aria-label={`${favCount} saved`}
            >
              {favCount}
            </span>
          )}
        </span>
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      data-pill-active={isActive || undefined}
      className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 z-10 active:scale-95 ${
        isActive
          ? 'text-[var(--primary)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="relative">
        <Icon
          size={isActive ? 22 : 20}
          aria-hidden
          className={`transition-all duration-200 ${
            isActive ? 'drop-shadow-[0_0_8px_var(--primary)]' : ''
          }`}
        />
        {showFavBadge && (
          <span
            className="absolute -top-1 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[var(--error)] text-white t-meta tabular px-1 animate-counter-pop"
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

/** Visual indicator that smoothly slides between active nav items. We
 *  render it underneath the links (z-0) so the active link text/icon
 *  stays on top, with the indicator's tinted background visible behind
 *  them. The transform/width transitions on the same element so a
 *  single CSS engine pass moves the pill — no layout thrash. */
function ActivePill({
  rect,
  variant,
}: {
  rect: IndicatorRect;
  variant: 'desktop' | 'mobile';
}) {
  const radius = variant === 'desktop' ? 'rounded-lg' : 'rounded-xl';
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute ${radius} nav-pill-shimmer bg-[var(--primary)]/12 border border-[var(--primary)]/25 shadow-[0_0_24px_-8px_var(--primary)] transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.5,1)] z-0`}
      style={{
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
        opacity: rect.ready ? 1 : 0,
      }}
    />
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const language = useSettingsStore((s) => s.language);
  const favCount = useFavoritesStore((s) => s.items.length);
  const [moreOpen, setMoreOpen] = useState(false);

  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Track whether any secondary route is active so the More button can
  // show the active state instead of looking idle on /compare or /globe.
  const secondaryActive = SECONDARY_ITEMS.some((i) => isActiveRoute(pathname, i.href));

  // Re-measure when the active route changes OR when the More button
  // becomes "the active pill target". The tracking key encodes both.
  const desktopKey = `${pathname}|${secondaryActive || moreOpen}|${language}`;
  const mobileKey = `${pathname}|${moreOpen}|${language}`;

  const desktopRect = useActivePill(desktopNavRef, desktopKey);
  const mobileRect = useActivePill(mobileNavRef, mobileKey);

  // Close the More menu when the route changes — otherwise it stays
  // open on top of the new page, which feels broken.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop top header bar — retired now that the LeftSidebar owns
          desktop navigation. Wrapped in `lg:hidden` so it never renders on
          `lg:` and up; it was already `hidden` on mobile, so the net effect
          is that this bar is gone on every breakpoint. The markup (and its
          `desktopNavRef`/ActivePill wiring) is kept intact so the
          active-pill logic and command-palette plumbing stay untouched. */}
      <div className="lg:hidden">
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-12 items-center px-6 glass-panel rounded-none border-b border-[var(--glass-border)] border-x-0 border-t-0">
        <Link href="/" className="flex items-center gap-2 mr-8" aria-label={t('aria_airwatch_home', language)}>
          <span className="neon-text font-[var(--font-heading)] t-label font-bold text-[var(--primary)] animate-brand-pulse animate-neon-flicker">
            AIRWATCH
          </span>
        </Link>

        <nav ref={desktopNavRef} className="relative flex items-center gap-1 flex-1" aria-label={t('aria_primary_navigation', language)}>
          <ActivePill rect={desktopRect} variant="desktop" />
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
            data-pill-active={secondaryActive || moreOpen || undefined}
            className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg transition-colors duration-200 t-meta t-mono font-bold tracking-wider z-10 ${
              secondaryActive || moreOpen
                ? 'text-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors group"
          aria-label={t('command_palette_open_with_shortcut', language)}
        >
          <Search size={13} aria-hidden className="group-hover:scale-110 transition-transform" />
          <kbd className="t-meta t-mono px-1.5 py-0.5 rounded bg-white/5 border border-[var(--glass-border)] group-hover:border-[var(--primary)]/40 transition-colors">⌘K</kbd>
        </button>
      </header>
      </div>

      {/* Mobile: top bar with brand + Cmd+K equivalent */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-11 flex items-center justify-between px-4 glass-panel rounded-none border-b border-[var(--glass-border)] border-x-0 border-t-0">
        <Link href="/" className="flex items-center" aria-label={t('aria_airwatch_home', language)}>
          <span className="neon-text font-[var(--font-heading)] t-label font-bold text-[var(--primary)] tracking-widest animate-brand-pulse">
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
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
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
        <div ref={mobileNavRef} className="relative flex justify-around py-2 px-2">
          <ActivePill rect={mobileRect} variant="mobile" />
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
