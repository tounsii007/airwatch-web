// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import type { AircraftState } from '@/lib/types';
import { OfflineBadge } from './OfflineBadge';

// Drive the freshness verdict + age directly so the test exercises the
// badge's own label logic (formatAge thresholds, null branch) rather than
// the freshness heuristics, which have their own unit tests.
const fresh = vi.hoisted(() => ({
  isCached: vi.fn(),
  ageSeconds: vi.fn(),
}));
vi.mock('@/lib/flights/aircraftFreshness', () => ({
  isCached: fresh.isCached,
  ageSeconds: fresh.ageSeconds,
}));

const aircraft = {} as AircraftState;

afterEach(() => vi.clearAllMocks());

describe('<OfflineBadge />', () => {
  it('renders nothing for a live aircraft', () => {
    fresh.isCached.mockReturnValue(false);
    const { container } = render(<OfflineBadge aircraft={aircraft} nowMs={1000} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the age in seconds below the two-minute threshold', () => {
    fresh.isCached.mockReturnValue(true);
    fresh.ageSeconds.mockReturnValue(45);
    render(<OfflineBadge aircraft={aircraft} nowMs={1000} />);
    expect(screen.getByText('OFFLINE 45s')).toBeInTheDocument();
  });

  it('rounds to whole minutes at or above two minutes', () => {
    fresh.isCached.mockReturnValue(true);
    fresh.ageSeconds.mockReturnValue(180);
    render(<OfflineBadge aircraft={aircraft} nowMs={1000} />);
    expect(screen.getByText('OFFLINE 3m')).toBeInTheDocument();
  });

  it('switches from seconds to minutes exactly at 120s', () => {
    fresh.isCached.mockReturnValue(true);
    fresh.ageSeconds.mockReturnValue(120);
    render(<OfflineBadge aircraft={aircraft} nowMs={1000} />);
    expect(screen.getByText('OFFLINE 2m')).toBeInTheDocument();
  });

  it('forwards the supplied nowMs to the freshness check', () => {
    fresh.isCached.mockReturnValue(true);
    fresh.ageSeconds.mockReturnValue(30);
    render(<OfflineBadge aircraft={aircraft} nowMs={42} />);
    expect(fresh.isCached).toHaveBeenCalledWith(aircraft, 42);
  });

  it('has no axe violations', async () => {
    fresh.isCached.mockReturnValue(true);
    fresh.ageSeconds.mockReturnValue(90);
    const { container } = render(<OfflineBadge aircraft={aircraft} nowMs={1000} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
