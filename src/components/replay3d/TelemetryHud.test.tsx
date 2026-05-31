// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import { CONVERSION } from '@/lib/constants';
import type { TripSnapshot } from './interpolateTrip';
import { formatWallClock } from './formatClock';
import { TelemetryHud } from './TelemetryHud';

const snapshot: TripSnapshot = {
  position: [8.68, 50.11, 1000], // lon, lat, altitude(m)
  headingDeg: 92.6,
  speedMs: 200,
  verticalSpeedMs: 5,
  nextIndex: 3,
};

const WALL = 1_700_000_000_000;

function renderHud(overrides: Partial<React.ComponentProps<typeof TelemetryHud>> = {}) {
  return render(
    <TelemetryHud
      snapshot={snapshot}
      wallClockEpochMs={WALL}
      altitudeUnit="feet"
      speedUnit="knots"
      callsign="DLH123"
      icao24="3c6444"
      {...overrides}
    />,
  );
}

describe('<TelemetryHud />', () => {
  it('shows the callsign when present', () => {
    renderHud();
    expect(screen.getByText('DLH123')).toBeInTheDocument();
  });

  it('falls back to the icao24 when there is no callsign', () => {
    renderHud({ callsign: null });
    expect(screen.getByText('3c6444')).toBeInTheDocument();
  });

  it('renders the wall clock for the supplied epoch', () => {
    renderHud();
    expect(screen.getByText(formatWallClock(WALL))).toBeInTheDocument();
  });

  it('formats altitude and speed through the unit-aware formatters', () => {
    renderHud();
    expect(screen.getByText(formatAltitude(1000, 'feet'))).toBeInTheDocument();
    expect(screen.getByText(formatSpeed(200, 'knots'))).toBeInTheDocument();
  });

  it('rounds the heading to whole degrees', () => {
    renderHud();
    expect(screen.getByText('93°')).toBeInTheDocument();
  });

  it('renders a signed fpm vertical speed for a climb', () => {
    renderHud();
    const fpm = Math.round(5 * CONVERSION.msToFpm);
    expect(screen.getByText(`+${fpm} fpm`)).toBeInTheDocument();
  });

  it('renders a negative fpm without doubling the sign for a descent', () => {
    renderHud({ snapshot: { ...snapshot, verticalSpeedMs: -5 } });
    const fpm = Math.round(-5 * CONVERSION.msToFpm);
    expect(screen.getByText(`${fpm} fpm`)).toBeInTheDocument();
  });

  it('shows a dash for a level (zero) vertical speed', () => {
    renderHud({ snapshot: { ...snapshot, verticalSpeedMs: 0 } });
    // Alt/Spd/Hdg still render values, so the sole dash is the V/S cell.
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('renders every telemetry cell as a dash when there is no snapshot', () => {
    renderHud({ snapshot: null });
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('has no axe violations', async () => {
    const { container } = renderHud();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
