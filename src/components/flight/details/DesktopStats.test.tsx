// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import {
  formatCoord,
  formatHeading,
  formatVerticalRateFpm,
} from '@/components/flight/details/flightDisplayUtils';
import type { AircraftState } from '@/lib/types';
import { DesktopStats } from './DesktopStats';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

const aircraft = {
  icao24: '3c6444',
  baroAltitude: 10668,
  velocity: 250,
  trueTrack: 270,
  verticalRate: 5,
  latitude: 50.11,
  longitude: 8.68,
  squawk: '7700',
} as AircraftState;

function renderStats(overrides: Partial<AircraftState> = {}) {
  return render(
    <DesktopStats
      language="en"
      altitudeUnit="feet"
      speedUnit="knots"
      aircraft={{ ...aircraft, ...overrides } as AircraftState}
    />,
  );
}

describe('<DesktopStats />', () => {
  it('renders the four primary stat labels', () => {
    renderStats();
    expect(screen.getByText('alt_label')).toBeInTheDocument();
    expect(screen.getByText('spd_label')).toBeInTheDocument();
    expect(screen.getByText('hdg_label')).toBeInTheDocument();
    expect(screen.getByText('vs_label')).toBeInTheDocument();
  });

  it('formats altitude, speed, heading, and vertical rate', () => {
    renderStats();
    expect(screen.getByText(formatAltitude(10668, 'feet'))).toBeInTheDocument();
    expect(screen.getByText(formatSpeed(250, 'knots'))).toBeInTheDocument();
    expect(screen.getByText(formatHeading(270))).toBeInTheDocument();
    expect(screen.getByText(formatVerticalRateFpm(5, ' fpm'))).toBeInTheDocument();
  });

  it('renders the latitude / longitude row', () => {
    renderStats();
    expect(screen.getByText('lat_label')).toBeInTheDocument();
    expect(screen.getByText('lon_label')).toBeInTheDocument();
    expect(screen.getByText(formatCoord(50.11))).toBeInTheDocument();
    expect(screen.getByText(formatCoord(8.68))).toBeInTheDocument();
  });

  it('highlights an emergency squawk', () => {
    renderStats({ squawk: '7700' });
    expect(screen.getByText('squawk_label')).toBeInTheDocument();
    expect(screen.getByText('7700').className).toContain('--error');
  });

  it('does not highlight a routine squawk', () => {
    renderStats({ squawk: '1200' });
    expect(screen.getByText('1200').className).not.toContain('--error');
  });

  it('omits the squawk row when no squawk is present', () => {
    renderStats({ squawk: undefined });
    expect(screen.queryByText('squawk_label')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = renderStats();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
