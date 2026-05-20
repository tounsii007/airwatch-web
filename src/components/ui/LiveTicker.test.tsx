// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useFlightStore } from '@/lib/stores/flightStore';
import type { AircraftState } from '@/lib/types';
import { LiveTicker } from '@/components/ui/LiveTicker';

const make = (overrides: Partial<AircraftState> & { icao24: string }): AircraftState => ({
  icao24: overrides.icao24,
  callsign: overrides.callsign,
  originCountry: overrides.originCountry,
  latitude: overrides.latitude,
  longitude: overrides.longitude,
  baroAltitude: overrides.baroAltitude,
  onGround: overrides.onGround ?? false,
  velocity: overrides.velocity,
  trueTrack: overrides.trueTrack,
  verticalRate: overrides.verticalRate,
  geoAltitude: overrides.geoAltitude,
  squawk: overrides.squawk,
  category: overrides.category ?? 0,
  flightStatus: overrides.flightStatus,
  lastUpdate: overrides.lastUpdate ?? Date.now(),
  depIata: overrides.depIata,
  arrIata: overrides.arrIata,
  airlineIcao: overrides.airlineIcao,
});

function setAircraft(items: AircraftState[]) {
  const map = new Map(items.map((a) => [a.icao24, a]));
  useFlightStore.setState({ aircraftMap: map });
}

describe('<LiveTicker />', () => {
  beforeEach(() => {
    useFlightStore.setState({ aircraftMap: new Map() });
  });

  it('renders nothing when there are no airborne aircraft', () => {
    const { container } = render(<LiveTicker />);
    expect(container.firstChild).toBeNull();
  });

  it('renders aircraft callsigns from the store', () => {
    setAircraft([
      make({ icao24: 'a', callsign: 'DLH123', baroAltitude: 11000, depIata: 'FRA', arrIata: 'JFK' }),
      make({ icao24: 'b', callsign: 'BAW456', baroAltitude: 12000, depIata: 'LHR', arrIata: 'JFK' }),
    ]);

    render(<LiveTicker />);
    // Each callsign appears twice (the marquee renders a duplicate
    // copy for seamless looping) — using getAllByText accommodates that.
    expect(screen.getAllByText(/DLH123/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BAW456/).length).toBeGreaterThan(0);
  });

  it('filters out grounded aircraft and aircraft without a callsign', () => {
    setAircraft([
      make({ icao24: 'a', callsign: 'DLH123', baroAltitude: 11000 }),
      make({ icao24: 'b', callsign: undefined, baroAltitude: 12000 }),
      make({ icao24: 'c', callsign: 'TAXI', onGround: true }),
    ]);

    render(<LiveTicker />);
    expect(screen.getAllByText(/DLH123/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/TAXI/)).toBeNull();
    // The undefined-callsign aircraft has no callsign and no fallback
    // text we could grep — the simplest assertion is "no row with
    // its icao24 as the label exists".
    expect(screen.queryByText(/^b$/)).toBeNull();
  });

  it('sorts higher-altitude aircraft first', () => {
    setAircraft([
      make({ icao24: 'a', callsign: 'LOW', baroAltitude: 1000 }),
      make({ icao24: 'b', callsign: 'HIGH', baroAltitude: 12000 }),
      make({ icao24: 'c', callsign: 'MID', baroAltitude: 5000 }),
    ]);

    render(<LiveTicker />);
    // Grab the first ul (the source-order, non-duplicate copy) and read
    // its text in DOM order. HIGH should precede MID, which precedes LOW.
    const lists = document.querySelectorAll('ul');
    expect(lists.length).toBeGreaterThan(0);
    const text = lists[0].textContent ?? '';
    expect(text.indexOf('HIGH')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('HIGH')).toBeLessThan(text.indexOf('MID'));
    expect(text.indexOf('MID')).toBeLessThan(text.indexOf('LOW'));
  });

  it('respects maxItems', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      make({ icao24: `x${i}`, callsign: `CS${i}`, baroAltitude: 5000 + i }),
    );
    setAircraft(many);

    render(<LiveTicker maxItems={5} />);
    const lists = document.querySelectorAll('ul');
    expect(lists.length).toBeGreaterThanOrEqual(1);
    // 5 items per copy.
    expect(lists[0].children.length).toBe(5);
  });
});
