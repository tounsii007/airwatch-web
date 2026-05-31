// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MOCK_SCENARIOS } from '@/lib/flights/mockAircraft';
import { MockEmergenciesPanel } from './MockEmergenciesPanel';

// Store double — only the two mutators the panel reaches for. The real
// MOCK_SCENARIOS and ScenarioToggle stay live so the toggle rows and the
// inject/clear payloads exercise the genuine scenario factories.
const flight = vi.hoisted(() => ({
  injectMockAircraft: vi.fn(),
  clearMockByPrefix: vi.fn(),
}));
vi.mock('@/lib/stores/flightStore', () => ({
  useFlightStore: (selector: (s: typeof flight) => unknown) => selector(flight),
}));

const toggle = (label: string) => fireEvent.click(screen.getByText(label));

beforeEach(() => {
  flight.injectMockAircraft.mockClear();
  flight.clearMockByPrefix.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('<MockEmergenciesPanel />', () => {
  it('renders one toggle per scenario and starts with nothing active', () => {
    render(<MockEmergenciesPanel />);
    expect(screen.getByText('DEV TOOLS')).toBeInTheDocument();
    expect(screen.getByText('keine aktiv')).toBeInTheDocument();
    for (const s of MOCK_SCENARIOS) {
      expect(screen.getByText(s.label)).toBeInTheDocument();
    }
    expect(flight.injectMockAircraft).not.toHaveBeenCalled();
  });

  it('injects a scenario’s mock aircraft the moment it is switched on', () => {
    render(<MockEmergenciesPanel />);
    toggle('Emergency-Squawks');
    expect(flight.injectMockAircraft).toHaveBeenCalledTimes(1);
    expect(flight.injectMockAircraft).toHaveBeenCalledWith(expect.any(Array));
    expect(flight.injectMockAircraft.mock.calls[0][0].length).toBeGreaterThan(0);
    expect(screen.getByText('1 aktiv')).toBeInTheDocument();
  });

  it('purges only that scenario’s mocks when it is toggled back off', () => {
    render(<MockEmergenciesPanel />);
    toggle('Emergency-Squawks');
    flight.injectMockAircraft.mockClear();
    toggle('Emergency-Squawks');
    expect(flight.clearMockByPrefix).toHaveBeenCalledTimes(1);
    expect(flight.clearMockByPrefix).toHaveBeenCalledWith('mock:emer:');
    expect(flight.injectMockAircraft).not.toHaveBeenCalled();
    expect(screen.getByText('keine aktiv')).toBeInTheDocument();
  });

  it('counts each independently-active scenario in the summary', () => {
    render(<MockEmergenciesPanel />);
    toggle('Emergency-Squawks');
    toggle('Military & VIP');
    expect(screen.getByText('2 aktiv')).toBeInTheDocument();
    // Each activation re-runs the effect, which re-injects every currently
    // active scenario: 1 (emergency alone) + 2 (emergency + military) = 3.
    expect(flight.injectMockAircraft).toHaveBeenCalledTimes(3);
    // Distinct payloads, not the same scenario thrice.
    const lastTwo = flight.injectMockAircraft.mock.calls.slice(-2).map((c) => c[0][0]?.icao24);
    expect(new Set(lastTwo).size).toBe(2);
  });

  it('re-injects active scenarios on the 30s freshness timer', () => {
    vi.useFakeTimers();
    render(<MockEmergenciesPanel />);
    act(() => toggle('Flugphasen'));
    flight.injectMockAircraft.mockClear();

    act(() => vi.advanceTimersByTime(30_000));
    expect(flight.injectMockAircraft).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(30_000));
    expect(flight.injectMockAircraft).toHaveBeenCalledTimes(2);
  });

  it('stops the freshness timer once every scenario is disabled', () => {
    vi.useFakeTimers();
    render(<MockEmergenciesPanel />);
    act(() => toggle('Flugphasen'));
    act(() => toggle('Flugphasen')); // back off → interval should be torn down
    flight.injectMockAircraft.mockClear();

    act(() => vi.advanceTimersByTime(120_000));
    expect(flight.injectMockAircraft).not.toHaveBeenCalled();
  });

  it('collapses to a compact launcher and restores the panel', () => {
    render(<MockEmergenciesPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse dev tools' }));
    expect(screen.queryByText('DEV TOOLS')).toBeNull();

    const launcher = screen.getByRole('button', { name: 'Open dev tools' });
    fireEvent.click(launcher);
    expect(screen.getByText('DEV TOOLS')).toBeInTheDocument();
  });

  it('badges the active count on the collapsed launcher', () => {
    render(<MockEmergenciesPanel />);
    toggle('Emergency-Squawks');
    toggle('Boden-Operationen');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse dev tools' }));
    const launcher = screen.getByRole('button', { name: 'Open dev tools' });
    expect(launcher).toHaveTextContent('2');
  });

  it('shows no count badge on the launcher when nothing is active', () => {
    render(<MockEmergenciesPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse dev tools' }));
    const launcher = screen.getByRole('button', { name: 'Open dev tools' });
    expect(launcher).not.toHaveTextContent(/\d/);
  });
});
