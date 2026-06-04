// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AircraftFlightDetailsCard } from '@/components/flight/details/cards/AircraftFlightDetailsCard';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';
import type { AircraftState } from '@/lib/types';

// AircraftFlightDetailsCard is a pure re-wrap of the legacy metadata + live
// stats sections. It derives nothing new: every value comes from the supplied
// `aircraft` state and `viewModel`, formatted with the shared helpers. The
// assertions below pin the airframe identity, the live ALT/SPD readouts, and
// the FLIGHT / REG / TYPE / SQK identity tags.

const aircraft: AircraftState = {
  icao24: '3c6444',
  callsign: 'DLH400',
  category: 4,
  onGround: false,
  lastUpdate: 0,
  baroAltitude: 10000, // metres → feet: 10000 * 3.28084 = 32808.4 → "32.8k ft"
  velocity: 250, // m/s → knots: round(250 * 1.94384) = 486 → "486 kts"
  trueTrack: 270, // → "270°"
  verticalRate: 0, // inside dead-band → "--"
  squawk: '1234', // not an emergency squawk
};

// Only the fields the card actually reads off the view model are populated;
// the cast keeps the test honest about the consumed surface without having to
// hand-build the entire derived VM.
const viewModel = {
  displayCallsign: 'LH400',
  metadata: {
    manufacturer: 'Airbus',
    model: 'A320',
    typecode: 'A320',
    registration: 'D-ABCD',
  },
} as unknown as FlightDetailsVM;

function renderCard(overrides: { aircraft?: AircraftState; viewModel?: FlightDetailsVM } = {}) {
  return render(
    <AircraftFlightDetailsCard
      aircraft={overrides.aircraft ?? aircraft}
      viewModel={overrides.viewModel ?? viewModel}
      language="en"
      altitudeUnit="feet"
      speedUnit="knots"
    />,
  );
}

describe('<AircraftFlightDetailsCard />', () => {
  it('renders the card title', () => {
    renderCard();
    expect(screen.getByText('AIRCRAFT & FLIGHT DETAILS')).toBeInTheDocument();
  });

  it('renders the airframe identity (manufacturer + model)', () => {
    renderCard();
    expect(screen.getByText('Airbus A320')).toBeInTheDocument();
  });

  it('renders the live ALT / SPD / HDG labels and formatted values', () => {
    renderCard();
    expect(screen.getByText('ALT')).toBeInTheDocument();
    expect(screen.getByText('SPD')).toBeInTheDocument();
    expect(screen.getByText('HDG')).toBeInTheDocument();
    expect(screen.getByText('32.8k ft')).toBeInTheDocument();
    expect(screen.getByText('486 kts')).toBeInTheDocument();
    expect(screen.getByText('270°')).toBeInTheDocument();
  });

  it('renders the registration as a REG tag', () => {
    renderCard();
    expect(screen.getByText('REG')).toBeInTheDocument();
    expect(screen.getByText('D-ABCD')).toBeInTheDocument();
  });

  it('renders the flight number from displayCallsign', () => {
    renderCard();
    // t('flight', 'en') === "FLIGHT"; the value is the resolved callsign.
    expect(screen.getByText('FLIGHT')).toBeInTheDocument();
    expect(screen.getByText('LH400')).toBeInTheDocument();
  });

  it('renders the squawk code under the SQK tag', () => {
    renderCard();
    // t('squawk_label', 'en') === "SQK".
    expect(screen.getByText('SQK')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('renders the typecode as a TYPE tag', () => {
    renderCard();
    expect(screen.getByText('TYPE')).toBeInTheDocument();
    // "A320" appears both as the identity chip and the TYPE tag value.
    expect(screen.getAllByText('A320').length).toBeGreaterThanOrEqual(2);
  });

  it('formats missing numeric fields as the "--" placeholder', () => {
    renderCard({
      aircraft: {
        ...aircraft,
        baroAltitude: undefined,
        velocity: undefined,
        trueTrack: undefined,
      },
    });
    // ALT, SPD, HDG and V/S all collapse to "--" → several placeholders render.
    expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(3);
  });

  it('omits the registration tag when the view model has no registration', () => {
    renderCard({
      viewModel: {
        displayCallsign: 'LH400',
        metadata: { manufacturer: 'Airbus', model: 'A320' },
      } as unknown as FlightDetailsVM,
    });
    expect(screen.queryByText('REG')).toBeNull();
    expect(screen.queryByText('D-ABCD')).toBeNull();
    // The flight number tag still renders.
    expect(screen.getByText('FLIGHT')).toBeInTheDocument();
  });
});
