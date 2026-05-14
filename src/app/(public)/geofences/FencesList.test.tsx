// @vitest-environment happy-dom
/**
 * UI test for <FencesList />. Iteration 1 polish:
 *   - circle / rectangle get a distinguishable type icon
 *   - airline + min-alt + max-alt render as separate filter chips
 *   - chips appear only when their underlying value is set
 *   - empty state still works
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FencesList, __test__ } from '@/app/(public)/geofences/FencesList';
import type { GeoFence } from '@/lib/flights/geofence';

const CIRCLE: GeoFence = {
  id: 1,
  name: 'FRA approach',
  clientId: 'c',
  type: 'CIRCLE',
  centerLat: 50.0379,
  centerLon: 8.5622,
  radiusKm: 50.5,
  minAltitudeFt: 1000,
  maxAltitudeFt: 10000,
  airlineFilter: 'DLH',
  active: true,
};

const RECTANGLE: GeoFence = {
  id: 2,
  name: 'Bavaria',
  clientId: 'c',
  type: 'RECTANGLE',
  northLat: 51.0,
  southLat: 47.0,
  eastLon: 12.0,
  westLon: 5.0,
  active: true,
  minAltitudeFt: null,
  maxAltitudeFt: null,
  airlineFilter: null,
};

describe('<FencesList />', () => {
  it('shows the empty-state message when no fences exist', () => {
    render(<FencesList fences={[]} onDelete={() => {}} />);
    expect(screen.getByText(/no fences yet/i)).toBeTruthy();
  });

  it('renders the total count when fences exist', () => {
    render(<FencesList fences={[CIRCLE, RECTANGLE]} onDelete={() => {}} />);
    expect(screen.getByText('2 total')).toBeTruthy();
  });

  it('renders each fence with its name and shape caption', () => {
    render(<FencesList fences={[CIRCLE, RECTANGLE]} onDelete={() => {}} />);
    expect(screen.getByText('FRA approach')).toBeTruthy();
    expect(screen.getByText('Bavaria')).toBeTruthy();
    // Circle caption: lat°N, lon°E · r XX.X km
    expect(screen.getByText(/50\.04° N, 8\.56° E · r 50\.5 km/)).toBeTruthy();
    // Rectangle caption: S/N · W/E corners
    expect(screen.getByText(/S 47\.0° → N 51\.0° · W 5\.0° → E 12\.0°/)).toBeTruthy();
  });

  it('renders airline + min-alt + max-alt chips when the filters are set', () => {
    render(<FencesList fences={[CIRCLE]} onDelete={() => {}} />);
    const row = screen.getByTestId('fence-row');
    // textContent walks the whole subtree, so it sees both the chip label
    // text and the SVG-icon sibling collapsed into one string. Using it
    // here lets the assertion survive the icon-+-label mixed children.
    expect(row.textContent).toContain('DLH');
    // toLocaleString() respects the test-environment locale (de-DE uses
    // "." as thousands separator, en-US uses ","). Match either so the
    // test is portable across CI hosts.
    expect(row.textContent).toMatch(/≥1[,.]000 ft/);
    expect(row.textContent).toMatch(/≤10[,.]000 ft/);
  });

  it('omits filter chips entirely when no filter values are set', () => {
    render(<FencesList fences={[RECTANGLE]} onDelete={() => {}} />);
    const row = screen.getByTestId('fence-row');
    expect(row.textContent).not.toMatch(/ft/);
    expect(row.textContent).not.toMatch(/DLH/);
  });

  it('attaches the airline name as a tooltip on the airline chip', () => {
    render(<FencesList fences={[CIRCLE]} onDelete={() => {}} />);
    const chip = screen.getByText('DLH');
    // The chip wraps the label; its parent <span> carries the title.
    expect(chip.getAttribute('title') ?? chip.parentElement?.getAttribute('title') ?? '').toMatch(/Lufthansa/i);
  });

  it('calls onDelete with the fence id when the trash button is clicked', async () => {
    const onDelete = vi.fn();
    render(<FencesList fences={[CIRCLE]} onDelete={onDelete} />);
    await userEvent.click(screen.getByLabelText(/delete fence fra approach/i));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('uses distinct icon labels for circle vs rectangle (a11y)', () => {
    render(<FencesList fences={[CIRCLE, RECTANGLE]} onDelete={() => {}} />);
    expect(screen.getByLabelText('CIRCLE fence')).toBeTruthy();
    expect(screen.getByLabelText('RECTANGLE fence')).toBeTruthy();
  });
});

describe('shapeCaption()', () => {
  it('formats a circle to 2 decimals for lat/lon and 1 decimal for radius', () => {
    expect(__test__.shapeCaption(CIRCLE)).toBe('50.04° N, 8.56° E · r 50.5 km');
  });

  it('formats a rectangle with S → N and W → E ranges', () => {
    expect(__test__.shapeCaption(RECTANGLE)).toBe('S 47.0° → N 51.0° · W 5.0° → E 12.0°');
  });
});
