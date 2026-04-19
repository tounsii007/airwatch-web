// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import L from '@/test/leafletMock';
import { GeoFenceDrawMap } from '@/components/geofence/GeoFenceDrawMap';
import type { GeoFence } from '@/lib/flights/geofence';

// Wire the mock into the module system before any test code imports leaflet.
vi.mock('leaflet', () => ({ default: L, ...L }));
vi.mock('leaflet-draw', () => ({}));

describe('<GeoFenceDrawMap />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the map container div', () => {
    const { container } = render(<GeoFenceDrawMap onDraft={() => {}} />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('initializes a Leaflet map exactly once on mount', () => {
    render(<GeoFenceDrawMap onDraft={() => {}} />);
    expect(L.map).toHaveBeenCalledOnce();
    expect(L.tileLayer).toHaveBeenCalled();
  });

  it('registers a draw:created handler and forwards circles as CIRCLE drafts', () => {
    const onDraft = vi.fn();
    render(<GeoFenceDrawMap onDraft={onDraft} />);

    // Grab the map instance and fire a fake draw:created event for a circle.
    const mapInstance = (L.map as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
    const circleLayer = {
      getLatLng: () => ({ lat: 50.0379, lng: 8.5622 }),
      getRadius: () => 25_000, // 25 km in metres
    };
    mapInstance.fire('draw:created', { layer: circleLayer, layerType: 'circle' });

    expect(onDraft).toHaveBeenCalledWith({
      type: 'CIRCLE',
      centerLat: 50.0379,
      centerLon: 8.5622,
      radiusKm: 25,
    });
  });

  it('forwards rectangles as RECTANGLE drafts', () => {
    const onDraft = vi.fn();
    render(<GeoFenceDrawMap onDraft={onDraft} />);

    const mapInstance = (L.map as unknown as ReturnType<typeof vi.fn>).mock.results[0].value;
    const rectLayer = {
      getBounds: () => ({
        getNorth: () => 60,
        getSouth: () => 40,
        getEast: () => 20,
        getWest: () => -10,
      }),
    };
    mapInstance.fire('draw:created', { layer: rectLayer, layerType: 'rectangle' });

    expect(onDraft).toHaveBeenCalledWith({
      type: 'RECTANGLE',
      northLat: 60,
      southLat: 40,
      eastLon: 20,
      westLon: -10,
    });
  });

  it('renders existing circle fences as overlays', () => {
    const existing: GeoFence[] = [
      { name: 'FRA zone', clientId: 'x', type: 'CIRCLE', centerLat: 50, centerLon: 8, radiusKm: 10 },
    ];
    render(<GeoFenceDrawMap onDraft={() => {}} existing={existing} />);
    expect(L.circle).toHaveBeenCalled();
  });

  it('renders existing rectangle fences as overlays', () => {
    const existing: GeoFence[] = [
      { name: 'EU', clientId: 'x', type: 'RECTANGLE',
        northLat: 60, southLat: 40, eastLon: 20, westLon: -10 },
    ];
    render(<GeoFenceDrawMap onDraft={() => {}} existing={existing} />);
    expect(L.rectangle).toHaveBeenCalled();
  });
});
