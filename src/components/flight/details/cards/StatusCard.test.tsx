// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusCard } from '@/components/flight/details/cards/StatusCard';
import type { FlightRouteInfo } from '@/lib/types';

// StatusCard surfaces the operational StatusBadge plus whatever scheduled-time
// and gate/terminal/baggage facts the upstream route lookup actually returned.
// The contract under test: every field is independently gated, gates/terminals
// are shown verbatim (never fabricated), and the card degrades to a single
// "Status details unavailable" line when there's nothing useful to show.

/** A fully-populated route info object; individual tests trim fields as needed. */
function makeRouteInfo(overrides: Partial<FlightRouteInfo> = {}): FlightRouteInfo {
  return {
    callsign: 'DLH400',
    departureAirport: 'FRA',
    arrivalAirport: 'JFK',
    status: 'en-route',
    // ISO timestamps — the card slices [11,16) to pull "HH:MM".
    scheduledDep: '2026-06-02T08:30:00Z',
    scheduledArr: '2026-06-02T11:45:00Z',
    depTerminal: '1',
    depGate: 'A12',
    arrTerminal: '4',
    arrGate: 'B7',
    arrBaggage: '6',
    ...overrides,
  };
}

describe('<StatusCard />', () => {
  it('always renders the STATUS heading', () => {
    render(<StatusCard routeInfo={makeRouteInfo()} language="en" />);
    expect(screen.getByText('STATUS')).toBeInTheDocument();
  });

  it('renders a StatusBadge for the route status', () => {
    render(<StatusCard routeInfo={makeRouteInfo({ status: 'en-route' })} language="en" />);
    // StatusBadge maps "en-route" → the "LIVE" label.
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('falls back to flightStatus when routeInfo has no status', () => {
    render(
      <StatusCard
        routeInfo={makeRouteInfo({ status: undefined })}
        flightStatus="landed"
        language="en"
      />,
    );
    // StatusBadge maps "landed" → the "LANDED" label.
    expect(screen.getByText('LANDED')).toBeInTheDocument();
  });

  it('uppercases an unknown status verbatim via the badge fallback', () => {
    render(<StatusCard routeInfo={makeRouteInfo({ status: 'boarding' })} language="en" />);
    expect(screen.getByText('BOARDING')).toBeInTheDocument();
  });

  it('renders DEP / ARR times sliced from the ISO timestamps', () => {
    render(<StatusCard routeInfo={makeRouteInfo()} language="en" />);
    expect(screen.getByText('DEP')).toBeInTheDocument();
    expect(screen.getByText('ARR')).toBeInTheDocument();
    expect(screen.getByText('08:30')).toBeInTheDocument();
    expect(screen.getByText('11:45')).toBeInTheDocument();
  });

  it('shows a delay chip only for a positive delay', () => {
    render(
      <StatusCard
        routeInfo={makeRouteInfo({ depDelayed: 15, arrDelayed: 0 })}
        language="en"
      />,
    );
    expect(screen.getByText('+15min')).toBeInTheDocument();
    // arrDelayed:0 must not produce a "+0min" chip.
    expect(screen.queryByText('+0min')).toBeNull();
  });

  it('omits a time column whose ISO timestamp is missing or too short to slice', () => {
    render(
      <StatusCard
        routeInfo={makeRouteInfo({ scheduledDep: undefined, scheduledArr: 'bad' })}
        language="en"
      />,
    );
    // Neither column should render a HH:MM value.
    expect(screen.queryByText('DEP')).toBeNull();
    expect(screen.queryByText('ARR')).toBeNull();
    expect(screen.queryByText('08:30')).toBeNull();
  });

  it('renders the gate / terminal / baggage facility rows verbatim', () => {
    render(<StatusCard routeInfo={makeRouteInfo()} language="en" />);
    expect(screen.getByText('DEP TERMINAL')).toBeInTheDocument();
    expect(screen.getByText('DEP GATE')).toBeInTheDocument();
    expect(screen.getByText('ARR TERMINAL')).toBeInTheDocument();
    expect(screen.getByText('ARR GATE')).toBeInTheDocument();
    expect(screen.getByText('BAGGAGE')).toBeInTheDocument();
    // Values are shown exactly as supplied — never synthesised.
    expect(screen.getByText('A12')).toBeInTheDocument();
    expect(screen.getByText('B7')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('never fabricates a gate: only present facility fields render', () => {
    // Supply a single facility field; the rest must be absent.
    render(
      <StatusCard
        routeInfo={makeRouteInfo({
          depGate: 'A12',
          depTerminal: undefined,
          arrTerminal: undefined,
          arrGate: undefined,
          arrBaggage: undefined,
        })}
        language="en"
      />,
    );
    expect(screen.getByText('DEP GATE')).toBeInTheDocument();
    expect(screen.getByText('A12')).toBeInTheDocument();
    // No other facility label should be invented.
    expect(screen.queryByText('DEP TERMINAL')).toBeNull();
    expect(screen.queryByText('ARR GATE')).toBeNull();
    expect(screen.queryByText('ARR TERMINAL')).toBeNull();
    expect(screen.queryByText('BAGGAGE')).toBeNull();
    // The fallback line must NOT appear — we do have something to show.
    expect(screen.queryByText('Status details unavailable')).toBeNull();
  });

  it('renders "Status details unavailable" when routeInfo is null', () => {
    render(<StatusCard routeInfo={null} language="en" />);
    expect(screen.getByText('Status details unavailable')).toBeInTheDocument();
    // No badge should be rendered for an absent status.
    expect(screen.queryByText('LIVE')).toBeNull();
  });

  it('renders "Status details unavailable" for an empty route object', () => {
    // A route lookup that resolved but carries no status / time / facility data.
    render(
      <StatusCard
        routeInfo={{ callsign: 'DLH400', departureAirport: 'FRA', arrivalAirport: 'JFK' }}
        language="en"
      />,
    );
    expect(screen.getByText('Status details unavailable')).toBeInTheDocument();
    expect(screen.queryByText('DEP')).toBeNull();
    expect(screen.queryByText('DEP GATE')).toBeNull();
  });
});
