// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AircraftState } from '@/lib/types';
import { NAV_ITEMS } from '@/components/layout/navItems';
import { CommandPalette } from './CommandPalette';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const store = vi.hoisted(() => ({
  aircraftMap: new Map<string, AircraftState>(),
  selectAircraft: vi.fn(),
}));
vi.mock('@/lib/stores/flightStore', () => ({
  useFlightStore: (selector: (s: typeof store) => unknown) => selector(store),
}));

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

// Deterministic data fixtures so the result groups don't depend on the
// live airport/airline catalogues.
vi.mock('@/lib/data/airports', () => ({
  AIRPORTS: {
    FRA: { c: 'de', n: 'Frankfurt', la: 50, lo: 8 },
    JFK: { c: 'us', n: 'New York Kennedy', la: 40, lo: -73 },
  },
}));
vi.mock('@/lib/data/airlines', () => ({
  searchAirlines: (q: string) =>
    q.includes('LUFT')
      ? [{ icao: 'DLH', iata: 'LH', name: 'Lufthansa', country: 'Germany' }]
      : [],
}));

function makeAc(icao24: string, callsign: string): AircraftState {
  return { icao24, callsign, onGround: false, category: 0, lastUpdate: 0 };
}

/** Render the open palette and flush the open-reset rAF (query='',
 *  highlight=0, focus) so later interactions aren't clobbered by it. */
async function openPalette(onClose = vi.fn()) {
  const utils = render(<CommandPalette open onClose={onClose} />);
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  return { ...utils, onClose };
}

const type = (value: string) =>
  fireEvent.change(screen.getByRole('textbox'), { target: { value } });

beforeEach(() => {
  store.aircraftMap = new Map();
  store.selectAircraft.mockClear();
  router.push.mockClear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('<CommandPalette />', () => {
  it('renders nothing while closed', () => {
    render(<CommandPalette open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a modal dialog and focuses the search box', async () => {
    await openPalette();
    expect(screen.getByRole('dialog', { name: 'aria_command_palette' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
  });

  it('shows the navigation routes (capped) when the query is empty', async () => {
    await openPalette();
    expect(screen.getAllByRole('option')).toHaveLength(Math.min(NAV_ITEMS.length, 12));
  });

  it('filters navigation by label substring', async () => {
    await openPalette();
    type('settings');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('nav_settings');
  });

  it('surfaces matching live aircraft and tracks the pick', async () => {
    const ac = makeAc('zzz999', 'ZZZ999');
    store.aircraftMap = new Map([['zzz999', ac]]);
    const { onClose } = await openPalette();
    type('ZZZ');
    expect(screen.getByText('FLIGHTS')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /ZZZ999/ }));
    expect(store.selectAircraft).toHaveBeenCalledWith(ac);
    expect(router.push).toHaveBeenCalledWith('/');
    expect(onClose).toHaveBeenCalled();
  });

  it('matches airports by IATA prefix and routes to the airport page', async () => {
    await openPalette();
    type('FRA');
    fireEvent.click(screen.getByRole('option', { name: /Frankfurt/ }));
    expect(router.push).toHaveBeenCalledWith('/airports/FRA');
  });

  it('matches airlines via searchAirlines and routes to the airline page', async () => {
    await openPalette();
    type('lufthansa');
    fireEvent.click(screen.getByRole('option', { name: /Lufthansa/ }));
    expect(router.push).toHaveBeenCalledWith('/airlines/DLH');
  });

  it('shows an empty state when nothing matches', async () => {
    await openPalette();
    type('qqqzzz-nothing');
    expect(screen.getByText('command_palette_no_results')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('moves the highlight with the arrow keys', async () => {
    await openPalette();
    const before = screen.getAllByRole('option');
    expect(before[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    let opts = screen.getAllByRole('option');
    expect(opts[1]).toHaveAttribute('aria-selected', 'true');
    expect(opts[0]).toHaveAttribute('aria-selected', 'false');
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    opts = screen.getAllByRole('option');
    expect(opts[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('follows the pointer to set the active option', async () => {
    await openPalette();
    const opts = screen.getAllByRole('option');
    fireEvent.pointerEnter(opts[3]);
    expect(screen.getAllByRole('option')[3]).toHaveAttribute('aria-selected', 'true');
  });

  it('activates the highlighted row on Enter', async () => {
    const { onClose } = await openPalette();
    // First nav row is the home route ("/").
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(router.push).toHaveBeenCalledWith('/');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    const { onClose } = await openPalette();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes via the backdrop and the header close button', async () => {
    const { onClose } = await openPalette();
    fireEvent.click(screen.getByRole('button', { name: 'aria_close_command_palette' }));
    fireEvent.click(screen.getByRole('button', { name: 'aria_close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('has no axe violations while open', async () => {
    const { container } = await openPalette();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
