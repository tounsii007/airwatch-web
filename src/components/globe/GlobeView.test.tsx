// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { GlobeView } from './GlobeView';
import type { AircraftState } from '@/lib/types';

// ── A fake CesiumJS the dynamic `import('cesium')` resolves to ──
type Mock = ReturnType<typeof vi.fn>;
type ViewerSpy = {
  camera: { setView: Mock; flyTo: Mock };
  entities: { removeAll: Mock; add: Mock };
  resize: Mock;
  isDestroyed: () => boolean;
};
const ces = vi.hoisted(() => ({ instances: [] as ViewerSpy[], throwOnViewer: false }));
vi.mock('cesium', () => {
  class Viewer {
    scene = { globe: { enableLighting: true }, backgroundColor: null as unknown };
    camera = { setView: vi.fn(), flyTo: vi.fn() };
    entities = { removeAll: vi.fn(), add: vi.fn() };
    resize = vi.fn();
    private destroyed = false;
    constructor() {
      if (ces.throwOnViewer) throw new Error('cesium parse failure');
      ces.instances.push(this as unknown as ViewerSpy);
    }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; }
  }
  return {
    Viewer,
    UrlTemplateImageryProvider: class { constructor(public opts: unknown) {} },
    Credit: class { constructor(public text: unknown) {} },
    Color: { fromCssColorString: vi.fn((s: string) => ({ css: s })), WHITE: 'WHITE', BLACK: 'BLACK' },
    Cartesian3: { fromDegrees: vi.fn((lon: number, lat: number, alt: number) => ({ lon, lat, alt })) },
    Cartesian2: class { constructor(public x: number, public y: number) {} },
    PropertyBag: class { constructor(public props: unknown) {} },
    LabelStyle: { FILL_AND_OUTLINE: 'FILL_AND_OUTLINE' },
    VerticalOrigin: { BOTTOM: 'BOTTOM' },
  };
});

// next/link needs no router context for our purposes — render a plain anchor.
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ── Store holders (selector pattern) ──
const flight = vi.hoisted(() => ({
  aircraftMap: new Map<string, AircraftState>(),
  startPolling: vi.fn(),
  selectedAircraft: null as AircraftState | null,
}));
vi.mock('@/lib/stores/flightStore', () => ({
  useFlightStore: (sel: (s: typeof flight) => unknown) => sel(flight),
}));
const settings = vi.hoisted(() => ({ mapStyle: 'dark' as string, language: 'en' as string }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (sel: (s: typeof settings) => unknown) => sel(settings),
}));

const makeAc = (over: Partial<AircraftState> = {}): AircraftState => ({
  icao24: 'abc123', onGround: false, category: 0, lastUpdate: 0,
  latitude: 48, longitude: 9, baroAltitude: 10000, callsign: 'DLH1', ...over,
});

// add() payload shape we assert against.
type AddArg = {
  point: { pixelSize: number; outlineWidth: number };
  label?: { text: string };
};
const addCalls = (v: ViewerSpy): AddArg[] => v.entities.add.mock.calls.map((c) => c[0] as AddArg);

beforeEach(() => {
  ces.instances = [];
  ces.throwOnViewer = false;
  flight.aircraftMap = new Map();
  flight.selectedAircraft = null;
  flight.startPolling.mockClear();
  settings.mapStyle = 'dark';
  settings.language = 'en';
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<GlobeView />', () => {
  it('starts polling when the feed is empty', async () => {
    flight.aircraftMap = new Map();
    render(<GlobeView />);
    expect(flight.startPolling).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(ces.instances).toHaveLength(1));
  });

  it('does not start polling when aircraft are already loaded', async () => {
    flight.aircraftMap = new Map([['abc123', makeAc()]]);
    render(<GlobeView />);
    await waitFor(() => expect(ces.instances).toHaveLength(1));
    expect(flight.startPolling).not.toHaveBeenCalled();
  });

  it('renders the live flight-count badge with a thousands separator', () => {
    flight.aircraftMap = new Map(
      Array.from({ length: 1500 }, (_, i) => [String(i), makeAc({ icao24: String(i) })]),
    );
    render(<GlobeView />);
    // Locale-agnostic: the component uses toLocaleString() with the runtime
    // default locale (',' in en, '.' in de) — match whatever that produces.
    expect(screen.getByText((1500).toLocaleString(), { exact: false })).toBeInTheDocument();
  });

  it('links back to the 2D map', () => {
    render(<GlobeView />);
    const back = screen.getAllByRole('link').find((a) => a.getAttribute('href') === '/');
    expect(back).toBeDefined();
  });

  it('boots a Cesium viewer and frames the initial camera over Europe', async () => {
    render(<GlobeView />);
    await waitFor(() => expect(ces.instances).toHaveLength(1));
    expect(ces.instances[0].camera.setView).toHaveBeenCalledTimes(1);
  });

  it('plots one entity per locatable aircraft, skipping those without coordinates', async () => {
    flight.aircraftMap = new Map([
      ['a', makeAc({ icao24: 'a' })],
      ['b', makeAc({ icao24: 'b' })],
      ['c', makeAc({ icao24: 'c', latitude: undefined, longitude: undefined })],
    ]);
    render(<GlobeView />);
    await waitFor(() => expect(ces.instances[0]?.entities.add).toHaveBeenCalledTimes(2));
    expect(ces.instances[0].entities.removeAll).toHaveBeenCalled();
  });

  it('highlights and labels the selected aircraft, leaving the rest plain', async () => {
    flight.aircraftMap = new Map([
      ['sel', makeAc({ icao24: 'sel', callsign: 'SEL123' })],
      ['oth', makeAc({ icao24: 'oth', callsign: 'OTH456' })],
    ]);
    flight.selectedAircraft = makeAc({ icao24: 'sel', callsign: 'SEL123' });
    render(<GlobeView />);
    await waitFor(() => expect(ces.instances[0]?.entities.add).toHaveBeenCalledTimes(2));

    const calls = addCalls(ces.instances[0]);
    const selected = calls.find((c) => c.point.pixelSize === 10);
    const plain = calls.find((c) => c.point.pixelSize === 5);
    expect(selected?.point.outlineWidth).toBe(2);
    expect(selected?.label?.text).toBe('SEL123');
    expect(plain?.label).toBeUndefined();
  });

  it('flies the camera to an aircraft selected after the globe is ready', async () => {
    const { rerender } = render(<GlobeView />);
    await waitFor(() => expect(ces.instances).toHaveLength(1));
    expect(ces.instances[0].camera.flyTo).not.toHaveBeenCalled();

    flight.selectedAircraft = makeAc({ icao24: 'sel', latitude: 40, longitude: -3 });
    rerender(<GlobeView />);
    await waitFor(() => expect(ces.instances[0].camera.flyTo).toHaveBeenCalledTimes(1));
    expect(ces.instances[0].camera.flyTo.mock.calls[0][0]).toMatchObject({ duration: 1.5 });
  });

  it('surfaces an error overlay when Cesium fails to initialise', async () => {
    ces.throwOnViewer = true;
    render(<GlobeView />);
    expect(await screen.findByText('CesiumJS konnte nicht geladen werden')).toBeInTheDocument();
    expect(ces.instances).toHaveLength(0);
  });

  it('tears down the viewer on unmount', async () => {
    const { unmount } = render(<GlobeView />);
    await waitFor(() => expect(ces.instances).toHaveLength(1));
    const viewer = ces.instances[0];
    unmount();
    expect(viewer.isDestroyed()).toBe(true);
  });
});
