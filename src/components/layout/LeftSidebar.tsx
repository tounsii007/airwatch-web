'use client';

/**
 * Premium desktop LEFT SIDEBAR for AirWatch.
 *
 * A fixed, glass-panelled rail shown only on large screens (`lg:` and up).
 * It mirrors the brand + navigation language of the existing `BottomNav`
 * but laid out vertically, and caps off with a live "Air Traffic" KPI that
 * ticks straight off the flight store's `aircraftMap`.
 *
 * The nav is a curated 9-item menu (`SIDEBAR_ITEMS` below) that mirrors the
 * product mockup exactly — its labels/order/icons intentionally diverge from
 * the broader `navItems.ts` registry, which still backs the BottomNav and the
 * Cmd+K palette where the omitted routes stay reachable.
 *
 * Reused building blocks (single sources of truth — never re-styled here):
 *   - `glass-panel` + design tokens from `globals.css` (no hard-coded colours)
 *   - the AIRWATCH neon wordmark treatment from `BottomNav.tsx`
 *   - the `MiniSpark` + rolling-history pattern from `LiveTrafficOverlay.tsx`
 *
 * This component is self-contained: a separate integrator wires it into the
 * layout, so we deliberately avoid touching `layout.tsx`.
 */

import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radar,
  Plane,
  RadioTower,
  CloudSun,
  BarChart3,
  Bell,
  Bookmark,
  PlayCircle,
  Settings,
} from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { CountUp } from '@/components/ui';
import { t } from '@/lib/i18n/translations';

/** Rolling-history window for the sparkline — matches LiveTrafficOverlay. */
const MAX_POINTS = 40;

/**
 * A single sidebar entry. Self-contained (literal labels + icon) rather than
 * the shared `NavItem` shape, because this rail is curated to mirror the
 * product mockup exactly — its labels, order and icons intentionally diverge
 * from the broader `navItems.ts` route registry (which still backs the
 * BottomNav and the Cmd+K palette).
 */
interface SidebarItem {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Optional trailing pill (e.g. the `NEW` badge on Playback). */
  badge?: string;
}

/**
 * The exact 9-item menu from the mockup, in order.
 *
 * Each label is mapped to the MOST APPROPRIATE EXISTING route under
 * `src/app/(public)/` — there are deliberately NO dead links. Where the
 * mockup names a concept without a dedicated page, we point at the nearest
 * real surface and note the mapping inline:
 *
 *   - Live Radar → `/`          the live map/radar home.
 *   - Flights    → `/search`    no `/flights` route; `/search` is the
 *                               flight lookup/search page.
 *   - Airports   → `/airports`  dedicated page.
 *   - Weather    → `/`          no `/weather` route; weather renders as a
 *                               live overlay on the radar home (see
 *                               useRadarOverlay + RadarBottomBar). Shares
 *                               `/` with Live Radar — the active-state
 *                               resolver below lights only the first match.
 *   - Analytics  → `/stats`     no `/analytics` route; `/stats` is the
 *                               analytics dashboard.
 *   - Alerts     → `/geofences` no `/alerts` route; geofences are the
 *                               proximity-alert surface.
 *   - Bookmarks  → `/saved`     no `/bookmarks` route; `/saved` is the
 *                               saved/bookmarked-flights page.
 *   - Playback   → `/replay`    dedicated page (flagged NEW).
 *   - Settings   → `/settings`  dedicated page.
 *
 * Items removed from the rail vs. the full registry (Cargo, Compare,
 * Spotting, Geofences-as-such, Stats-as-such, Dashboard, 3D Globe, Search,
 * Airlines) stay reachable through the Cmd+K command palette.
 */
const SIDEBAR_ITEMS: readonly SidebarItem[] = [
  { href: '/',          icon: Radar,      label: 'Live Radar' },
  { href: '/search',    icon: Plane,      label: 'Flights'    }, // no /flights → flight search
  { href: '/airports',  icon: RadioTower, label: 'Airports'   },
  { href: '/',          icon: CloudSun,   label: 'Weather'    }, // no /weather → radar overlay on home
  { href: '/stats',     icon: BarChart3,  label: 'Analytics'  }, // no /analytics → /stats
  { href: '/geofences', icon: Bell,       label: 'Alerts'     }, // no /alerts → geofence alerts
  { href: '/saved',     icon: Bookmark,   label: 'Bookmarks'  }, // no /bookmarks → /saved
  { href: '/replay',    icon: PlayCircle, label: 'Playback', badge: 'NEW' },
  { href: '/settings',  icon: Settings,   label: 'Settings'   },
] as const;

/** Active-route detection that handles the home `/` separately so it
 *  isn't matched by every other path's prefix check. Mirrors the helper
 *  in BottomNav so both surfaces light the same item for a given URL. */
function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Resolves which single item index is "active" for the current path.
 * Two entries (Live Radar + Weather) intentionally share `/`, so a naive
 * per-item check would glow both at once. We return the FIRST matching
 * index and light only that row, keeping the cyan-glow indicator
 * unambiguous. Returns -1 when nothing matches.
 */
function activeIndex(items: readonly SidebarItem[], pathname: string): number {
  return items.findIndex((it) => isActiveRoute(pathname, it.href));
}

/**
 * Tiny self-contained sparkline (no axes) drawn as an SVG polyline.
 * Copied inline from LiveTrafficOverlay so the sidebar carries zero extra
 * dependencies and the trend line scales fluidly to its box.
 */
function MiniSpark({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 24;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${(h - ((v - min) / range) * h).toFixed(2)}`)
    .join(' ');
  const lastX = w;
  const lastY = h - ((data[data.length - 1] - min) / range) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sidebar-traffic-spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--secondary)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke="url(#sidebar-traffic-spark)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY.toFixed(2)} r="1.6" fill="var(--secondary)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

interface SidebarLinkProps {
  item: SidebarItem;
  isActive: boolean;
}

/**
 * A single icon + label row. Idle rows are muted; the active route gets a
 * tinted glass fill, a cyan border, an ambient glow and a cyan icon
 * drop-shadow. Hover lifts the row a touch and warms the text — all driven
 * by the centralised token easings so motion stays coherent with the rest
 * of the app.
 */
function SidebarLink({ item, isActive }: SidebarLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      style={{ transitionTimingFunction: 'var(--ease-out)' }}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 t-label t-mono font-bold tracking-wider transition-[color,background-color,border-color,transform,box-shadow] duration-[var(--duration-base)] hover:-translate-y-0.5 ${
        isActive
          ? 'border border-[var(--primary)]/30 bg-[var(--primary)]/12 text-[var(--primary)] shadow-[0_0_24px_-8px_var(--primary)]'
          : 'border border-transparent text-[var(--text-muted)] hover:border-[var(--glass-border-strong)] hover:bg-white/5 hover:text-[var(--text-secondary)] hover:shadow-[0_0_18px_-10px_var(--primary)]'
      }`}
    >
      <Icon
        size={18}
        aria-hidden
        className={`shrink-0 transition-[filter,transform] duration-[var(--duration-base)] group-hover:scale-110 ${
          isActive ? 'drop-shadow-[0_0_6px_var(--primary)]' : ''
        }`}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? <span className="badge">{item.badge}</span> : null}
    </Link>
  );
}

export function LeftSidebar() {
  const pathname = usePathname();
  const language = useSettingsStore((s) => s.language);
  const count = useFlightStore((s) => s.aircraftMap.size);

  // Rolling history for the sparkline — append only when the count
  // actually changes so a flat feed doesn't pad the trend with dupes.
  // Same pattern as LiveTrafficOverlay.
  const [history, setHistory] = useState<number[]>([]);
  const last = useRef(-1);
  useEffect(() => {
    if (count === last.current) return;
    last.current = count;
    setHistory((h) => [...h, count].slice(-MAX_POINTS));
  }, [count]);

  // Resolve the single active row up front so the two entries that share
  // `/` (Live Radar + Weather) can't both glow at once.
  const active = activeIndex(SIDEBAR_ITEMS, pathname);

  return (
    <aside
      className="glass-panel hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-40 rounded-none border-y-0 border-l-0 border-r border-[var(--glass-border)]"
      aria-label={t('aria_primary_navigation', language)}
    >
      {/* ── Brand wordmark — reuses the BottomNav neon treatment ─────── */}
      <Link
        href="/"
        aria-label={t('aria_airwatch_home', language)}
        className="flex items-center gap-2 px-6 h-14 shrink-0 border-b border-[var(--glass-border)]"
      >
        <span className="neon-text font-[var(--font-heading)] t-display font-bold tracking-widest text-[var(--primary)] animate-brand-pulse animate-neon-flicker">
          AIRWATCH
        </span>
      </Link>

      {/* ── Navigation — the curated 9-item mockup menu, in order. ─────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {SIDEBAR_ITEMS.map((item, i) => (
          <SidebarLink
            key={`${item.label}-${item.href}`}
            item={item}
            isActive={i === active}
          />
        ))}
      </nav>

      {/* ── Live Air Traffic KPI ─────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-4">
        <div className="glass-panel-elevated rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-pulse-glow rounded-full bg-[var(--secondary)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--secondary)]" />
            </span>
            <span className="t-meta uppercase tracking-wider text-[var(--text-muted)]">
              Air Traffic / Live Now
            </span>
          </div>

          <div className="mt-1.5 flex items-end justify-between gap-3">
            <span className="t-data text-glow-primary text-3xl font-semibold leading-none text-[var(--primary-bright)]">
              <CountUp value={count} />
            </span>
          </div>

          <div className="mt-2 h-6">
            <MiniSpark data={history} />
          </div>

          <p className="mt-1 t-meta text-[var(--text-muted)]">aircraft tracked now</p>
        </div>
      </div>
    </aside>
  );
}
