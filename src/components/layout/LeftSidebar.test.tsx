// @vitest-environment happy-dom
/**
 * UI test for the premium desktop <LeftSidebar />.
 *
 * Covers the four behaviours that make this rail distinct from the broader
 * nav registry / BottomNav:
 *   (a) it renders the curated 9-item mockup menu, by label;
 *   (b) on the home route (`/`) the FIRST `/`-mapped row — "Live Radar" —
 *       carries the active treatment, and only ONE row glows (so "Weather",
 *       which also points at `/`, stays idle);
 *   (c) the "Playback" row shows its `NEW` badge;
 *   (d) the bottom Air-Traffic KPI reflects `useFlightStore`'s
 *       `aircraftMap.size`.
 *
 * Conventions mirrored from the existing suite:
 *   - `next/navigation` mocked per-file via `vi.hoisted` + `vi.mock`
 *     (see admin/shared/components/TableSearch.test.tsx). `nav.pathname`
 *     is mutable so a case can repoint the active route.
 *   - the real zustand stores are SEEDED, not module-mocked, via
 *     `useFlightStore.setState(...)` / `useSettingsStore.setState(...)`
 *     (see ui/LiveTicker.test.tsx + layout/InstallPrompt.test.tsx).
 *   - `matchMedia` is shimmed because the bottom KPI's <CountUp> consults
 *     `prefers-reduced-motion` in an effect and happy-dom ships none
 *     (see ui/CountUp.test.tsx).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LeftSidebar } from './LeftSidebar';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { AircraftState } from '@/lib/types';

// Mutable holder the next/navigation mock reads from. usePathname is the only
// hook LeftSidebar calls; useRouter/useSearchParams are provided defensively
// to match the project's standard navigation-mock shape.
const nav = vi.hoisted(() => ({
  pathname: '/',
  router: { push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn(), back: vi.fn(), forward: vi.fn() },
  params: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => nav.router,
  useSearchParams: () => nav.params,
}));

/** CountUp reads matchMedia in an effect; happy-dom doesn't supply it. */
function shimMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    })),
  });
}

/** Minimal airborne aircraft — only the shape the store keys on matters here. */
const make = (icao24: string): AircraftState => ({
  icao24,
  onGround: false,
  category: 0,
  lastUpdate: Date.now(),
});

/** Seed the real flight store's aircraftMap with `n` distinct entries. */
function seedAircraft(n: number): void {
  const map = new Map<string, AircraftState>();
  for (let i = 0; i < n; i += 1) map.set(`ac${i}`, make(`ac${i}`));
  useFlightStore.setState({ aircraftMap: map });
}

/**
 * The bottom KPI card — the `.glass-panel-elevated` block that wraps the
 * "Air Traffic / Live Now" label, the <CountUp> value and the sparkline.
 * Anchoring on the label text and climbing to the card lets us scope count
 * assertions to the KPI and away from any stray digits elsewhere in the rail.
 */
function kpiCard(): HTMLElement {
  const label = screen.getByText(/air traffic \/ live now/i);
  const card = label.closest('.glass-panel-elevated');
  if (!card) throw new Error('KPI card (.glass-panel-elevated) not found');
  return card as HTMLElement;
}

/** The exact 9 labels from the mockup menu, in order. */
const NAV_LABELS = [
  'Live Radar',
  'Flights',
  'Airports',
  'Weather',
  'Analytics',
  'Alerts',
  'Bookmarks',
  'Playback',
  'Settings',
] as const;

describe('<LeftSidebar />', () => {
  beforeEach(() => {
    nav.pathname = '/';
    shimMatchMedia();
    useSettingsStore.setState({ language: 'en' });
    useFlightStore.setState({ aircraftMap: new Map() });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // (a) all nine curated mockup labels render, each as a real nav link.
  it('renders all nine mockup nav labels', () => {
    render(<LeftSidebar />);
    for (const label of NAV_LABELS) {
      // Each row is a <Link> whose accessible name STARTS WITH its label
      // (icons are aria-hidden). The "Playback" row also appends its "NEW"
      // badge to the accessible name, so match by substring rather than an
      // exact string. A RegExp from the literal label is exact-enough to
      // disambiguate the nine rows while tolerating the trailing badge.
      const matcher = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      expect(screen.getByRole('link', { name: matcher })).toBeInTheDocument();
    }
  });

  // (b) on '/', only the FIRST '/'-mapped row ("Live Radar") is active.
  it('marks "Live Radar" active on the home route and lights exactly one row', () => {
    nav.pathname = '/';
    render(<LeftSidebar />);

    const liveRadar = screen.getByRole('link', { name: 'Live Radar' });
    // Semantic active marker the component sets on the active row only.
    expect(liveRadar).toHaveAttribute('aria-current', 'page');
    // The cyan-glow treatment is the active branch's box-shadow utility.
    expect(liveRadar.className).toContain('shadow-[0_0_24px_-8px_var(--primary)]');

    // "Weather" also points at '/', but the rail resolves a single active
    // index, so it must stay idle — proving the glow is unambiguous.
    const weather = screen.getByRole('link', { name: 'Weather' });
    expect(weather).not.toHaveAttribute('aria-current');

    // Exactly one row across the whole rail carries aria-current=page.
    const active = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(active).toHaveLength(1);
    expect(active[0]).toBe(liveRadar);
  });

  // (c) the Playback row carries a NEW badge.
  it('shows a NEW badge on the Playback item', () => {
    render(<LeftSidebar />);
    const playback = screen.getByRole('link', { name: /Playback/ });
    // The badge is a trailing pill inside the Playback link.
    const badge = within(playback).getByText('NEW');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge');
  });

  // (d) the bottom KPI reflects aircraftMap.size.
  it('shows the live aircraft count from the flight store', () => {
    seedAircraft(7);
    render(<LeftSidebar />);

    // Scope to the KPI card via its label so we don't accidentally match a
    // stray "7" elsewhere. CountUp paints the value synchronously on first
    // render (single <span>), so no waiting/animation is involved.
    const kpi = kpiCard();
    expect(within(kpi).getByText('7')).toBeInTheDocument();
    expect(within(kpi).getByText(/aircraft tracked now/i)).toBeInTheDocument();
  });

  it('reflects an updated aircraftMap size (zero → many)', () => {
    // Default beforeEach leaves an empty map → KPI shows 0.
    const { unmount } = render(<LeftSidebar />);
    expect(within(kpiCard()).getByText('0')).toBeInTheDocument();
    unmount();

    seedAircraft(3);
    render(<LeftSidebar />);
    expect(within(kpiCard()).getByText('3')).toBeInTheDocument();
  });
});
