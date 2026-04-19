// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import L from '@/test/leafletMock';
import { FlightReplayMap } from '@/components/replay/FlightReplayMap';
import type { FlightPosition } from '@/lib/flights/replay';

vi.mock('leaflet', () => ({ default: L, ...L }));

const makePos = (ts: string, lat = 50, lng = 8, altitude = 10_000): FlightPosition => ({
  id: Math.random(),
  icao24: 'abc123',
  callsign: 'LH400',
  latitude: lat,
  longitude: lng,
  altitude,
  speed: 850,
  heading: 90,
  verticalSpeed: 0,
  squawk: null,
  timestamp: ts,
});

describe('<FlightReplayMap />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes a Leaflet map on mount', () => {
    render(<FlightReplayMap positions={[]} />);
    expect(L.map).toHaveBeenCalledOnce();
  });

  it('renders controls only once positions arrive', () => {
    const { rerender, queryByRole } = render(<FlightReplayMap positions={[]} />);
    expect(queryByRole('slider')).toBeNull();

    rerender(
      <FlightReplayMap positions={[
        makePos('2026-04-17T10:00:00Z'),
        makePos('2026-04-17T10:01:00Z'),
      ]} />,
    );
    expect(queryByRole('slider')).toBeInTheDocument();
  });

  it('draws a polyline with the track when positions are provided', () => {
    render(
      <FlightReplayMap positions={[
        makePos('2026-04-17T10:00:00Z', 50.0, 8.0),
        makePos('2026-04-17T10:01:00Z', 50.1, 8.1),
        makePos('2026-04-17T10:02:00Z', 50.2, 8.2),
      ]} />,
    );
    expect(L.polyline).toHaveBeenCalled();
    expect(L.marker).toHaveBeenCalled();
  });

  it('play button toggles label between PLAY and PAUSE', async () => {
    render(
      <FlightReplayMap positions={[
        makePos('2026-04-17T10:00:00Z'),
        makePos('2026-04-17T10:01:00Z'),
        makePos('2026-04-17T10:02:00Z'),
      ]} />,
    );
    const btn = screen.getByRole('button', { name: /PLAY/i });
    expect(btn.textContent).toContain('PLAY');
    await userEvent.click(btn);
    expect(btn.textContent).toContain('PAUSE');
  });

  it('reset button returns the slider to 0', async () => {
    render(
      <FlightReplayMap positions={[
        makePos('2026-04-17T10:00:00Z'),
        makePos('2026-04-17T10:01:00Z'),
        makePos('2026-04-17T10:02:00Z'),
      ]} />,
    );
    const slider = screen.getByRole('slider') as HTMLInputElement;
    // Change slider, then reset.
    await userEvent.click(screen.getByRole('button', { name: /RESET/i }));
    expect(slider.value).toBe('0');
  });
});
