// @vitest-environment happy-dom
/**
 * UI test for the smarter <AlertsPanel /> from iteration 2.
 *   - airline name resolution
 *   - per-fence filter chip toggling
 *   - "show on map" deep link
 *   - relative-time caption
 *
 * Note: we deliberately use REAL timers here. userEvent.click ships an
 * internal setTimeout + microtask chain that dead-locks against fake
 * timers (even with the advanceTimers callback). Timestamps in the test
 * fixtures are derived from Date.now() at render time so the displayed
 * "Xm" caption is still deterministic without freezing the clock.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertsPanel } from '@/app/(public)/geofences/AlertsPanel';
import type { GeoFenceAlert } from '@/lib/stores/geofenceStore';

// next/link routes through Next's router; in unit tests we just need a plain <a>.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
     
    <a href={href} {...rest}>{children}</a>,
}));

function makeAlert(over: Partial<GeoFenceAlert> = {}): GeoFenceAlert {
  return {
    fenceId: 1,
    fenceName: 'Frankfurt',
    icao24: '3c6589',
    callsign: 'DLH441',
    airlineIcao: 'DLH',
    latitude: 50,
    longitude: 8,
    altitude: 11280,
    speed: 850,
    // 5 minutes before the render moment — formatter will print "5m".
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...over,
  };
}

describe('<AlertsPanel />', () => {
  it('renders nothing when the alerts array is empty', () => {
    const { container } = render(
      <AlertsPanel alerts={[]} onDismiss={() => {}} onClear={() => {}} />,
    );
    expect(container.querySelector('[data-testid="alerts-panel"]')).toBeNull();
  });

  it('shows total count when no filter is active', () => {
    render(
      <AlertsPanel
        alerts={[makeAlert(), makeAlert({ icao24: 'aaa111' })]}
        onDismiss={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByText(/^2 ALERTS$/)).toBeTruthy();
  });

  it('resolves the airline name from the callsign (DLH → Lufthansa)', () => {
    render(<AlertsPanel alerts={[makeAlert()]} onDismiss={() => {}} onClear={() => {}} />);
    expect(screen.getByText(/Lufthansa/i)).toBeTruthy();
  });

  it('renders relative time captions ("5m") from the timestamp', () => {
    render(<AlertsPanel alerts={[makeAlert()]} onDismiss={() => {}} onClear={() => {}} />);
    expect(screen.getByText('5m')).toBeTruthy();
  });

  it('builds a /?icao24= deep link on the callsign element', () => {
    render(<AlertsPanel alerts={[makeAlert()]} onDismiss={() => {}} onClear={() => {}} />);
    const link = screen.getByText('DLH441').closest('a');
    expect(link?.getAttribute('href')).toBe('/?icao24=3c6589');
  });

  it('hides the per-fence filter bar when there is only one fence', () => {
    render(
      <AlertsPanel
        alerts={[makeAlert(), makeAlert({ icao24: 'aaa111' })]}
        onDismiss={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.queryByText('ALL')).toBeNull();
  });

  it('shows the filter bar and filters by fence when ≥ 2 fences are involved', async () => {
    const user = userEvent.setup();
    const alerts = [
      makeAlert({ fenceId: 1, fenceName: 'Frankfurt', icao24: 'aaa' }),
      makeAlert({ fenceId: 1, fenceName: 'Frankfurt', icao24: 'bbb' }),
      makeAlert({ fenceId: 2, fenceName: 'Munich',    icao24: 'ccc' }),
    ];
    render(<AlertsPanel alerts={alerts} onDismiss={() => {}} onClear={() => {}} />);

    expect(screen.getByText('ALL')).toBeTruthy();
    const munichChip = screen.getByRole('button', { name: /Munich/ });
    const frankfurtChip = screen.getByRole('button', { name: /Frankfurt/ });
    expect(munichChip.textContent).toContain('(1)');
    expect(frankfurtChip.textContent).toContain('(2)');

    await user.click(munichChip);

    expect(screen.getByText(/1 \/ 3 ALERTS/)).toBeTruthy();
    const rows = screen.getAllByTestId('alert-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute('data-fence-id')).toBe('2');
  });

  it('toggles a fence filter off when its chip is clicked twice', async () => {
    const user = userEvent.setup();
    const alerts = [
      makeAlert({ fenceId: 1, fenceName: 'Frankfurt', icao24: 'aaa' }),
      makeAlert({ fenceId: 2, fenceName: 'Munich',    icao24: 'bbb' }),
    ];
    render(<AlertsPanel alerts={alerts} onDismiss={() => {}} onClear={() => {}} />);

    const frankfurtChip = screen.getByRole('button', { name: /Frankfurt/ });
    await user.click(frankfurtChip);                   // filter = {1}
    expect(screen.getAllByTestId('alert-row')).toHaveLength(1);

    await user.click(frankfurtChip);                   // filter = null again
    expect(screen.getAllByTestId('alert-row')).toHaveLength(2);
  });

  it('calls onDismiss(icao24, fenceId) when the × is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<AlertsPanel alerts={[makeAlert()]} onDismiss={onDismiss} onClear={() => {}} />);
    // Dismiss button has a lucide-x SVG. The aria-label flows from the i18n
    // `dismiss` key which we don't want to hard-code, so target by SVG.
    const dismissBtn = screen
      .getAllByRole('button')
      .find((b) => b.querySelector('svg.lucide-x'));
    expect(dismissBtn).toBeTruthy();
    await user.click(dismissBtn!);
    expect(onDismiss).toHaveBeenCalledWith('3c6589', 1);
  });

  it('calls onClear when the CLEAR ALL header button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<AlertsPanel alerts={[makeAlert()]} onDismiss={() => {}} onClear={onClear} />);
    await user.click(screen.getByText('CLEAR ALL'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('formats the altitude as a flight level when above 18000 ft', () => {
    render(
      <AlertsPanel alerts={[makeAlert({ altitude: 11280 })]} onDismiss={() => {}} onClear={() => {}} />,
    );
    expect(screen.getByText(/FL370/)).toBeTruthy();
  });

  it('omits the speed line when speed is 0 (e.g. parked alert)', () => {
    render(
      <AlertsPanel
        alerts={[makeAlert({ speed: 0 })]}
        onDismiss={() => {}}
        onClear={() => {}}
      />,
    );
    const row = screen.getByTestId('alert-row');
    expect(row.textContent).not.toMatch(/km\/h/);
  });
});
