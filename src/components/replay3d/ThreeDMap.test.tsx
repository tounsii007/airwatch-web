// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ThreeDMap } from './ThreeDMap';
import type { TripData } from '@/components/replay3d/types';
import type { TripSnapshot } from '@/components/replay3d/interpolateTrip';
import type { MapViewState } from '@/components/replay3d/useViewState';

// deck.gl needs a real WebGL context — capture the props it receives instead.
type DeckProps = {
  layers: unknown[];
  viewState: MapViewState;
  controller?: boolean;
  onViewStateChange: (e: { viewState: MapViewState }) => void;
};
const deck = vi.hoisted(() => ({ last: null as DeckProps | null }));
vi.mock('@deck.gl/react', () => ({
  default: (props: DeckProps) => { deck.last = props; return <div data-testid="deckgl" />; },
}));

// Each layer builder returns an identifiable sentinel so we can assert the
// composed `layers` array order without constructing real deck.gl layers.
const builders = vi.hoisted(() => ({
  basemap: vi.fn(() => ({ id: 'basemap' })),
  track: vi.fn((_t: unknown) => ({ id: 'track' })),
  trips: vi.fn((_a: unknown) => ({ id: 'trips' })),
  icon: vi.fn((_a: unknown) => ({ id: 'icon' })),
}));
vi.mock('@/components/replay3d/basemapLayer', () => ({ buildBasemapLayer: () => builders.basemap() }));
vi.mock('@/components/replay3d/pathLayerConfig', () => ({ buildStaticTrackLayer: (t: unknown) => builders.track(t) }));
vi.mock('@/components/replay3d/tripsLayerConfig', () => ({ buildTripsLayer: (a: unknown) => builders.trips(a) }));
vi.mock('@/components/replay3d/aircraftIconLayerConfig', () => ({ buildAircraftIconLayer: (a: unknown) => builders.icon(a) }));

const trip: TripData = {
  icao24: 'abc123', callsign: 'DLH1', points: [], startEpochMs: 1_000_000, durationMs: 60_000,
};
const viewState = { longitude: 8, latitude: 50, zoom: 9, pitch: 45, bearing: 0 } as MapViewState;
const snapshot: TripSnapshot = {
  position: [8.1, 50.2, 3000], headingDeg: 270, speedMs: 230, verticalSpeedMs: 0, nextIndex: 3,
};

const renderMap = (over: Partial<React.ComponentProps<typeof ThreeDMap>> = {}) =>
  render(
    <ThreeDMap
      trip={trip}
      currentTimeMs={12_000}
      snapshot={snapshot}
      viewState={viewState}
      onViewStateChange={vi.fn()}
      {...over}
    />,
  );

beforeEach(() => { deck.last = null; vi.clearAllMocks(); });
afterEach(() => cleanup());

describe('<ThreeDMap />', () => {
  it('composes basemap, static track, trail and icon layers in order', () => {
    renderMap();
    expect(deck.last?.layers).toEqual([
      { id: 'basemap' }, { id: 'track' }, { id: 'trips' }, { id: 'icon' },
    ]);
  });

  it('feeds the trip to the static-track and trail builders', () => {
    renderMap();
    expect(builders.track).toHaveBeenCalledWith(trip);
    expect(builders.trips).toHaveBeenCalledWith({ trip, currentTimeMs: 12_000 });
  });

  it('forwards the snapshot position and heading to the icon builder', () => {
    renderMap();
    expect(builders.icon).toHaveBeenCalledWith({ currentPosition: snapshot.position, headingDeg: 270 });
  });

  it('falls back to a null position and zero heading without a snapshot', () => {
    renderMap({ snapshot: null });
    expect(builders.icon).toHaveBeenCalledWith({ currentPosition: null, headingDeg: 0 });
  });

  it('drives the managed camera with the supplied view state', () => {
    renderMap();
    expect(deck.last?.viewState).toBe(viewState);
    expect(deck.last?.controller).toBe(true);
  });

  it('relays camera changes to the onViewStateChange handler', () => {
    const onViewStateChange = vi.fn();
    renderMap({ onViewStateChange });
    const next = { viewState: { ...viewState, zoom: 11 } as MapViewState };
    deck.last?.onViewStateChange(next);
    expect(onViewStateChange).toHaveBeenCalledWith(next);
  });
});
