// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FlightReplay3D } from './FlightReplay3D';
import type { TripData } from '@/components/replay3d/types';

// settingsStore is destructured ({ altitudeUnit, speedUnit }) here.
const settings = vi.hoisted(() => ({ altitudeUnit: 'ft', speedUnit: 'kts' }));
vi.mock('@/lib/stores/settingsStore', () => ({ useSettingsStore: () => settings }));

// Every replay hook is mocked: this suite tests FlightReplay3D's own wiring
// (state → child props, callbacks → hook calls), not the hooks themselves.
const tripHolder = vi.hoisted(() => ({ value: null as TripData | null }));
vi.mock('@/components/replay3d/useTripData', () => ({ useTripData: () => tripHolder.value }));

type ClockArgs = { durationMs: number; speed: number; playing: boolean };
const clock = vi.hoisted(() => ({
  currentTimeMs: 5_000, atEnd: false, seek: vi.fn(), calls: [] as ClockArgs[],
}));
vi.mock('@/components/replay3d/useAnimationClock', () => ({
  useAnimationClock: (args: ClockArgs) => {
    clock.calls.push(args);
    return { currentTimeMs: clock.currentTimeMs, atEnd: clock.atEnd, seek: clock.seek };
  },
}));

type ViewArgs = { mode: string; snapshotPosition: unknown; snapshotHeading: number };
const view = vi.hoisted(() => ({ calls: [] as ViewArgs[], onViewStateChange: vi.fn() }));
vi.mock('@/components/replay3d/useViewState', () => ({
  useViewState: (args: ViewArgs) => {
    view.calls.push(args);
    return { viewState: { zoom: 9 }, onViewStateChange: view.onViewStateChange };
  },
}));

const snapshot = { position: [8, 50, 3000] as [number, number, number], headingDeg: 90 };
const interp = vi.hoisted(() => ({ fn: vi.fn(() => ({ position: [8, 50, 3000], headingDeg: 90 })) }));
vi.mock('@/components/replay3d/interpolateTrip', () => ({ interpolateAt: (...a: unknown[]) => interp.fn(...a) }));

// ── Child stubs: surface the props we assert on, expose callbacks as buttons ──
type MapStub = { currentTimeMs: number; snapshot: unknown };
vi.mock('@/components/replay3d/ThreeDMap', () => ({
  ThreeDMap: (p: MapStub) => (
    <div data-testid="threedmap" data-ct={p.currentTimeMs} data-has-snapshot={String(!!p.snapshot)} />
  ),
}));
type HudStub = { wallClockEpochMs: number; altitudeUnit: string; speedUnit: string; callsign: string | null; icao24: string };
vi.mock('@/components/replay3d/TelemetryHud', () => ({
  TelemetryHud: (p: HudStub) => (
    <div
      data-testid="hud"
      data-wallclock={p.wallClockEpochMs}
      data-alt={p.altitudeUnit}
      data-speed={p.speedUnit}
      data-callsign={String(p.callsign)}
      data-icao={p.icao24}
    />
  ),
}));
type CameraStub = { mode: string; onChange: (m: string) => void };
vi.mock('@/components/replay3d/CameraSwitcher', () => ({
  CameraSwitcher: (p: CameraStub) => (
    <button data-testid="camera" data-mode={p.mode} onClick={() => p.onChange('orbit')}>cam</button>
  ),
}));
type ControlsStub = {
  playing: boolean; speed: number; atEnd: boolean; durationMs: number; currentTimeMs: number;
  onTogglePlay: () => void; onRestart: () => void; onSpeedChange: (s: number) => void; onSeek: (t: number) => void;
};
vi.mock('@/components/replay3d/ReplayControls', () => ({
  SPEED_OPTIONS: [1, 10, 60, 300],
  ReplayControls: (p: ControlsStub) => (
    <div data-testid="controls" data-playing={String(p.playing)} data-speed={p.speed} data-atend={String(p.atEnd)}>
      <button data-testid="toggle" onClick={p.onTogglePlay}>toggle</button>
      <button data-testid="restart" onClick={p.onRestart}>restart</button>
      <button data-testid="speed" onClick={() => p.onSpeedChange(10)}>speed</button>
      <button data-testid="seek" onClick={() => p.onSeek(1234)}>seek</button>
    </div>
  ),
}));

const trip: TripData = {
  icao24: 'abc123', callsign: 'DLH1', points: [], startEpochMs: 1_000_000, durationMs: 60_000,
};

beforeEach(() => {
  settings.altitudeUnit = 'ft';
  settings.speedUnit = 'kts';
  tripHolder.value = trip;
  clock.currentTimeMs = 5_000;
  clock.atEnd = false;
  clock.seek.mockClear();
  clock.calls = [];
  view.calls = [];
  interp.fn.mockClear();
  interp.fn.mockReturnValue(snapshot);
});
afterEach(() => cleanup());

const controls = () => screen.getByTestId('controls');

describe('<FlightReplay3D />', () => {
  it('shows the empty state when there is no decodable trip', () => {
    tripHolder.value = null;
    render(<FlightReplay3D positions={[]} />);
    expect(screen.getByText(/Keine Positionsdaten/)).toBeInTheDocument();
    expect(screen.queryByTestId('threedmap')).toBeNull();
  });

  it('renders the map, HUD and transport controls for a valid trip', () => {
    render(<FlightReplay3D positions={[]} />);
    expect(screen.getByTestId('threedmap')).toBeInTheDocument();
    expect(screen.getByTestId('hud')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('camera')).toBeInTheDocument();
  });

  it('feeds the interpolated snapshot at the current time to the map', () => {
    render(<FlightReplay3D positions={[]} />);
    expect(interp.fn).toHaveBeenCalledWith(trip, 5_000);
    expect(screen.getByTestId('threedmap').getAttribute('data-has-snapshot')).toBe('true');
  });

  it('derives the HUD wall-clock from trip start plus elapsed time', () => {
    render(<FlightReplay3D positions={[]} />);
    const hud = screen.getByTestId('hud');
    expect(hud.getAttribute('data-wallclock')).toBe(String(1_000_000 + 5_000));
    expect(hud.getAttribute('data-alt')).toBe('ft');
    expect(hud.getAttribute('data-speed')).toBe('kts');
    expect(hud.getAttribute('data-callsign')).toBe('DLH1');
    expect(hud.getAttribute('data-icao')).toBe('abc123');
  });

  it('starts playing and toggles to paused', () => {
    render(<FlightReplay3D positions={[]} />);
    expect(controls().getAttribute('data-playing')).toBe('true');
    fireEvent.click(screen.getByTestId('toggle'));
    expect(controls().getAttribute('data-playing')).toBe('false');
  });

  it('clamps the playing flag to false at the end of the trip', () => {
    clock.atEnd = true;
    render(<FlightReplay3D positions={[]} />);
    expect(controls().getAttribute('data-atend')).toBe('true');
    expect(controls().getAttribute('data-playing')).toBe('false');
  });

  it('restart seeks to zero and resumes playback', () => {
    render(<FlightReplay3D positions={[]} />);
    fireEvent.click(screen.getByTestId('toggle')); // pause first
    expect(controls().getAttribute('data-playing')).toBe('false');
    fireEvent.click(screen.getByTestId('restart'));
    expect(clock.seek).toHaveBeenCalledWith(0);
    expect(controls().getAttribute('data-playing')).toBe('true');
  });

  it('defaults to 60x speed and changes the clock speed on request', () => {
    render(<FlightReplay3D positions={[]} />);
    expect(controls().getAttribute('data-speed')).toBe('60');
    expect(clock.calls[0]).toMatchObject({ speed: 60, durationMs: 60_000, playing: true });
    fireEvent.click(screen.getByTestId('speed'));
    expect(controls().getAttribute('data-speed')).toBe('10');
    expect(clock.calls.at(-1)).toMatchObject({ speed: 10 });
  });

  it('forwards scrubber seeks straight to the clock', () => {
    render(<FlightReplay3D positions={[]} />);
    fireEvent.click(screen.getByTestId('seek'));
    expect(clock.seek).toHaveBeenCalledWith(1234);
  });

  it('switches the camera mode and re-derives the view state', () => {
    render(<FlightReplay3D positions={[]} />);
    expect(screen.getByTestId('camera').getAttribute('data-mode')).toBe('chase');
    expect(view.calls[0]).toMatchObject({ mode: 'chase' });
    fireEvent.click(screen.getByTestId('camera'));
    expect(screen.getByTestId('camera').getAttribute('data-mode')).toBe('orbit');
    expect(view.calls.at(-1)).toMatchObject({ mode: 'orbit' });
  });
});
