// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MapView } from './MapView';
import type { AircraftState } from '@/lib/types';

// Leaflet's stylesheet import has no test value and trips the CSS loader.
vi.mock('leaflet/dist/leaflet.css', () => ({}));

// ── A fake Leaflet map instance the imperative handlers act on ──
const fakeMap = vi.hoisted(() => ({
  zoomIn: vi.fn(), zoomOut: vi.fn(), setView: vi.fn(),
  getZoom: vi.fn(() => 6), invalidateSize: vi.fn(), hasLayer: vi.fn(() => false),
}));
// Stable ref identities so MapView's layer-attach effect runs once, not per render.
const layerRefs = vi.hoisted(() => ({
  base: { current: null }, container: { current: null },
  map: { current: null as unknown }, zoom: 5,
  route: { current: { addTo: vi.fn() } }, markers: { current: { addTo: vi.fn() } },
}));

vi.mock('@/components/map/hooks/useLeafletMap', () => ({
  useLeafletMap: () => ({
    baseLayerRef: layerRefs.base, mapContainerRef: layerRefs.container,
    mapRef: layerRefs.map, zoom: layerRefs.zoom,
  }),
}));
vi.mock('@/components/map/hooks/useRouteOverlay', () => ({ useRouteOverlay: () => layerRefs.route }));
vi.mock('@/components/map/hooks/useAircraftMarkers', () => ({ useAircraftMarkers: () => layerRefs.markers }));
vi.mock('@/components/map/hooks/useBaseLayer', () => ({ useBaseLayer: vi.fn() }));
vi.mock('@/components/map/hooks/useAirportLabels', () => ({ useAirportLabels: vi.fn() }));
vi.mock('@/components/map/hooks/useTurbulenceOverlay', () => ({ useTurbulenceOverlay: vi.fn() }));

const radar = vi.hoisted(() => ({ calls: [] as Array<{ enabled: boolean }> }));
vi.mock('@/components/map/hooks/useRadarOverlay', () => ({
  useRadarOverlay: (a: { enabled: boolean }) => { radar.calls.push(a); },
}));

const weather = vi.hoisted(() => ({ url: null as string | null }));
vi.mock('@/lib/hooks/useWeatherRadar', () => ({ useWeatherRadar: () => weather.url }));

// ── Store holders (selector pattern) ──
const flight = vi.hoisted(() => ({
  aircraftMap: new Map<string, AircraftState>(),
  selectedAircraft: null as AircraftState | null,
  selectAircraft: vi.fn(), clearSelection: vi.fn(),
  startPolling: vi.fn(), stopPolling: vi.fn(),
  isLoading: false, error: null as string | null, transport: 'rest' as string,
}));
vi.mock('@/lib/stores/flightStore', () => ({
  useFlightStore: (sel: (s: typeof flight) => unknown) => sel(flight),
}));

const settings = vi.hoisted(() => ({
  showRadar: false, showTrails: false, showLabels: false, showTurbulence: false,
  showAirportWeather: false, cargoOnly: false,
  setCargoOnly: vi.fn(), setShowRadar: vi.fn(),
  mapStyle: 'dark' as string, setMapStyle: vi.fn(),
  language: 'en' as string, updateInterval: 5,
}));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (sel: (s: typeof settings) => unknown) => sel(settings),
}));

// ── Child stubs: surface forwarded props + expose toolbar callbacks ──
vi.mock('@/components/map/MapBrandOverlay', () => ({
  MapBrandOverlay: (p: { transport: string }) => <div data-testid="brand" data-transport={p.transport} />,
}));
vi.mock('@/components/map/MapStatusOverlay', () => ({
  MapStatusOverlay: (p: { count: number; isLoading: boolean; hasError: boolean; language: string }) => (
    <div data-testid="status" data-count={p.count} data-loading={String(p.isLoading)} data-error={String(p.hasError)} data-lang={p.language} />
  ),
}));
vi.mock('@/components/map/MapApiErrorBanner', () => ({
  MapApiErrorBanner: (p: { error: string | null }) => <div data-testid="errbanner" data-error={String(p.error)} />,
}));
vi.mock('@/components/map/MapLegend', () => ({
  MapLegend: (p: { mapStyle: string }) => <div data-testid="legend" data-style={p.mapStyle} />,
}));
vi.mock('@/components/voice/VoiceButton', () => ({ VoiceButton: () => <div data-testid="voice" /> }));
type ToolbarProps = {
  mapStyle: string; showRadar: boolean; radarShouldShow: boolean; cargoOnly: boolean; showLegend: boolean;
  onMapStyle: (s: string) => void; onToggleRadar: () => void; onToggleCargo: () => void;
  onToggleLegend: () => void; onZoomIn: () => void; onZoomOut: () => void; onCenter: () => void;
};
vi.mock('@/components/map/MapToolbar', () => ({
  MapToolbar: (p: ToolbarProps) => (
    <div data-testid="toolbar" data-radarshould={String(p.radarShouldShow)} data-cargo={String(p.cargoOnly)} data-legend={String(p.showLegend)}>
      <button data-testid="zoomin" onClick={p.onZoomIn} />
      <button data-testid="zoomout" onClick={p.onZoomOut} />
      <button data-testid="center" onClick={p.onCenter} />
      <button data-testid="toggleradar" onClick={p.onToggleRadar} />
      <button data-testid="togglecargo" onClick={p.onToggleCargo} />
      <button data-testid="togglelegend" onClick={p.onToggleLegend} />
      <button data-testid="mapstyle" onClick={() => p.onMapStyle('satellite')} />
    </div>
  ),
}));

const makeAc = (over: Partial<AircraftState> = {}): AircraftState => ({
  icao24: 'abc123', onGround: false, category: 0, lastUpdate: 0,
  latitude: 51, longitude: 7, ...over,
});

beforeEach(() => {
  layerRefs.map.current = fakeMap;
  layerRefs.zoom = 5;
  Object.values(fakeMap).forEach((fn) => fn.mockClear());
  fakeMap.getZoom.mockReturnValue(6);
  fakeMap.hasLayer.mockReturnValue(false);
  radar.calls = [];
  weather.url = null;
  flight.aircraftMap = new Map();
  flight.selectedAircraft = null;
  flight.isLoading = false;
  flight.error = null;
  flight.transport = 'rest';
  flight.selectAircraft.mockClear();
  flight.clearSelection.mockClear();
  flight.startPolling.mockClear();
  flight.stopPolling.mockClear();
  settings.showRadar = false;
  settings.cargoOnly = false;
  settings.mapStyle = 'dark';
  settings.language = 'en';
  settings.setShowRadar.mockClear();
  settings.setCargoOnly.mockClear();
  settings.setMapStyle.mockClear();
  window.history.replaceState({}, '', '/');
});
afterEach(() => cleanup());

describe('<MapView />', () => {
  it('restarts polling on mount and stops it on unmount', () => {
    const { unmount } = render(<MapView />);
    expect(flight.stopPolling).toHaveBeenCalledTimes(1);
    expect(flight.startPolling).toHaveBeenCalledTimes(1);
    unmount();
    expect(flight.stopPolling).toHaveBeenCalledTimes(2);
  });

  it('forwards live feed status to the overlays', () => {
    flight.aircraftMap = new Map([['a', makeAc()], ['b', makeAc({ icao24: 'b' })]]);
    flight.isLoading = true;
    flight.error = 'rate-limited';
    flight.transport = 'ws';
    settings.language = 'de';
    render(<MapView />);
    const status = screen.getByTestId('status');
    expect(status.getAttribute('data-count')).toBe('2');
    expect(status.getAttribute('data-loading')).toBe('true');
    expect(status.getAttribute('data-error')).toBe('true');
    expect(status.getAttribute('data-lang')).toBe('de');
    expect(screen.getByTestId('brand').getAttribute('data-transport')).toBe('ws');
    expect(screen.getByTestId('errbanner').getAttribute('data-error')).toBe('rate-limited');
  });

  it('enables the radar overlay only when toggled on, with tiles, zoomed out', () => {
    settings.showRadar = true;
    weather.url = 'https://tiles/{z}/{x}/{y}.png';
    layerRefs.zoom = 5;
    render(<MapView />);
    expect(screen.getByTestId('toolbar').getAttribute('data-radarshould')).toBe('true');
    expect(radar.calls.at(-1)?.enabled).toBe(true);
  });

  it('keeps radar disabled when zoomed in past level 6', () => {
    settings.showRadar = true;
    weather.url = 'https://tiles/{z}/{x}/{y}.png';
    layerRefs.zoom = 8;
    render(<MapView />);
    expect(screen.getByTestId('toolbar').getAttribute('data-radarshould')).toBe('false');
    expect(radar.calls.at(-1)?.enabled).toBe(false);
  });

  it('drives the leaflet map from the zoom and center controls', () => {
    render(<MapView />);
    fireEvent.click(screen.getByTestId('zoomin'));
    fireEvent.click(screen.getByTestId('zoomout'));
    fireEvent.click(screen.getByTestId('center'));
    expect(fakeMap.zoomIn).toHaveBeenCalledTimes(1);
    expect(fakeMap.zoomOut).toHaveBeenCalledTimes(1);
    expect(fakeMap.setView).toHaveBeenCalledWith([48.5, 9.0], 6);
  });

  it('toggles cargo-only and radar through the settings store', () => {
    render(<MapView />);
    fireEvent.click(screen.getByTestId('togglecargo'));
    fireEvent.click(screen.getByTestId('toggleradar'));
    expect(settings.setCargoOnly).toHaveBeenCalledWith(true);
    expect(settings.setShowRadar).toHaveBeenCalledWith(true);
  });

  it('changes the basemap style', () => {
    render(<MapView />);
    fireEvent.click(screen.getByTestId('mapstyle'));
    expect(settings.setMapStyle).toHaveBeenCalledWith('satellite');
  });

  it('shows the legend by default and hides it on toggle', () => {
    render(<MapView />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('togglelegend'));
    expect(screen.queryByTestId('legend')).toBeNull();
    expect(screen.getByTestId('toolbar').getAttribute('data-legend')).toBe('false');
  });

  it('auto-centers on a newly selected aircraft, clamping the zoom', () => {
    fakeMap.getZoom.mockReturnValue(6); // clamps up to the floor of 8
    flight.selectedAircraft = makeAc({ icao24: 'sel1', latitude: 40.7, longitude: -74 });
    render(<MapView />);
    expect(fakeMap.setView).toHaveBeenCalledWith([40.7, -74], 8, { animate: true });
  });

  it('consumes a ?icao24 deep link by selecting that aircraft', () => {
    const ac = makeAc({ icao24: 'abc123' });
    flight.aircraftMap = new Map([['abc123', ac]]);
    window.history.replaceState({}, '', '/?icao24=ABC123');
    render(<MapView />);
    expect(flight.selectAircraft).toHaveBeenCalledWith(ac);
  });

  it('ignores a deep link for an aircraft not yet in the feed', () => {
    flight.aircraftMap = new Map();
    window.history.replaceState({}, '', '/?icao24=zzz999');
    render(<MapView />);
    expect(flight.selectAircraft).not.toHaveBeenCalled();
  });
});
