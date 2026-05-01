/**
 * Single source of truth for app routes shown in navigation. The
 * BottomNav uses the `primary` slice for the always-visible bar (5
 * items + a More toggle). The More-menu and the Cmd+K palette consume
 * the full list. Every entry has the same shape so they're
 * interchangeable across surfaces.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Map,
  Search,
  Radio,
  Star,
  Settings,
  Package,
  BarChart3,
  GitCompareArrows,
  Globe,
  History,
  Camera,
  Hexagon,
  Plane,
  LayoutDashboard,
} from 'lucide-react';
import type { TranslationKey } from '@/lib/i18n/translations';

export interface NavItem {
  href: string;
  icon: LucideIcon;
  /** Translation key — the label is resolved at the call site so we
   *  don't pull i18n into every consumer. */
  labelKey: TranslationKey;
  /** True when the item appears in the primary bottom-bar slot. */
  primary: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  // ── Primary bar (5 items + More) ─────────────────────────────────
  { href: '/',          icon: Map,      labelKey: 'nav_map',       primary: true  },
  { href: '/search',    icon: Search,   labelKey: 'nav_search',    primary: true  },
  { href: '/airports',  icon: Radio,    labelKey: 'nav_airports',  primary: true  },
  { href: '/saved',     icon: Star,     labelKey: 'nav_saved',     primary: true  },
  { href: '/settings',  icon: Settings, labelKey: 'nav_settings',  primary: true  },

  // ── Secondary (More menu + Cmd+K) ────────────────────────────────
  { href: '/dashboard', icon: LayoutDashboard,  labelKey: 'nav_dashboard', primary: false },
  { href: '/cargo',     icon: Package,          labelKey: 'nav_cargo',     primary: false },
  { href: '/stats',     icon: BarChart3,        labelKey: 'nav_stats',     primary: false },
  { href: '/compare',   icon: GitCompareArrows, labelKey: 'nav_compare',   primary: false },
  { href: '/globe',     icon: Globe,            labelKey: 'nav_globe',     primary: false },
  { href: '/replay',    icon: History,          labelKey: 'nav_replay',    primary: false },
  { href: '/spotting',  icon: Camera,           labelKey: 'nav_spotting',  primary: false },
  { href: '/geofences', icon: Hexagon,          labelKey: 'nav_geofences', primary: false },
  { href: '/airlines',  icon: Plane,            labelKey: 'nav_airlines',  primary: false },
] as const;

export const PRIMARY_ITEMS = NAV_ITEMS.filter((i) => i.primary);
export const SECONDARY_ITEMS = NAV_ITEMS.filter((i) => !i.primary);
