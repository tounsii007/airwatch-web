// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AircraftState } from '@/lib/types';
import { SquawkAlertBanner } from './SquawkAlertBanner';

// Drive the banner through a controllable alert list while keeping the
// REAL squawkLabel/squawkColor so the chip text + colours are exercised
// end-to-end, not stubbed.
const alerts = vi.hoisted(() => ({ list: [] as AircraftState[] }));
vi.mock('@/lib/hooks/useSquawkAlerts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks/useSquawkAlerts')>();
  return { ...actual, useSquawkAlerts: () => alerts.list };
});

const selectAircraft = vi.hoisted(() => vi.fn());
vi.mock('@/lib/stores/flightStore', () => ({
  useFlightStore: (selector: (s: { selectAircraft: unknown }) => unknown) =>
    selector({ selectAircraft }),
}));

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

function makeAc(squawk: string, overrides: Partial<AircraftState> = {}): AircraftState {
  return {
    icao24: 'abc123',
    onGround: false,
    category: 0,
    lastUpdate: 0,
    squawk,
    ...overrides,
  };
}

const dotOf = (button: HTMLElement) =>
  button.querySelector('span[aria-hidden]') as HTMLElement;

beforeEach(() => {
  alerts.list = [];
  selectAircraft.mockClear();
});

describe('<SquawkAlertBanner />', () => {
  it('stays hidden when nothing is squawking', () => {
    render(<SquawkAlertBanner />);
    expect(screen.queryByText('squawk_banner_title')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('announces the banner once an emergency is squawking', () => {
    alerts.list = [makeAc('7700', { callsign: 'DLH123' })];
    render(<SquawkAlertBanner />);
    expect(screen.getByText('squawk_banner_title')).toBeInTheDocument();
  });

  it('renders one chip per squawking aircraft', () => {
    alerts.list = [
      makeAc('7700', { icao24: 'a1' }),
      makeAc('7600', { icao24: 'b2' }),
      makeAc('7500', { icao24: 'c3' }),
    ];
    render(<SquawkAlertBanner />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('translates each squawk code into its human-readable meaning', () => {
    alerts.list = [
      makeAc('7700', { icao24: 'a1' }),
      makeAc('7600', { icao24: 'b2' }),
      makeAc('7500', { icao24: 'c3' }),
    ];
    render(<SquawkAlertBanner />);
    expect(screen.getByText('EMERGENCY')).toBeInTheDocument();
    expect(screen.getByText('RADIO FAIL')).toBeInTheDocument();
    expect(screen.getByText('HIJACK')).toBeInTheDocument();
  });

  it('shows the callsign, falling back to icao24 when it is missing', () => {
    alerts.list = [
      makeAc('7700', { icao24: 'named', callsign: 'DLH9' }),
      makeAc('7600', { icao24: 'bare01', callsign: undefined }),
    ];
    render(<SquawkAlertBanner />);
    expect(screen.getByText('DLH9')).toBeInTheDocument();
    expect(screen.getByText('bare01')).toBeInTheDocument();
  });

  it('paints the mayday chip and its dot in the emergency red', () => {
    alerts.list = [makeAc('7700', { callsign: 'DLH123' })];
    render(<SquawkAlertBanner />);
    const button = screen.getByRole('button');
    expect(dotOf(button).style.backgroundColor.toLowerCase()).toBe('#f87171');
    expect(button.style.color.toLowerCase()).toBe('#f87171');
  });

  it('keys the dot colour to the specific squawk code', () => {
    alerts.list = [makeAc('7500', { callsign: 'SUS1' })];
    render(<SquawkAlertBanner />);
    // 7500 (hijack) is orange, distinct from the 7700 red above.
    expect(dotOf(screen.getByRole('button')).style.backgroundColor.toLowerCase()).toBe(
      '#ff6b35',
    );
  });

  it('selects the aircraft when its chip is clicked', () => {
    const ac = makeAc('7700', { icao24: 'track-me', callsign: 'DLH123' });
    alerts.list = [ac];
    render(<SquawkAlertBanner />);
    fireEvent.click(screen.getByRole('button'));
    expect(selectAircraft).toHaveBeenCalledTimes(1);
    expect(selectAircraft).toHaveBeenCalledWith(ac);
  });

  it('has no axe violations', async () => {
    alerts.list = [makeAc('7700', { callsign: 'DLH123' })];
    const { container } = render(<SquawkAlertBanner />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
