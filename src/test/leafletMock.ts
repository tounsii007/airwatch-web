import { vi } from 'vitest';

/**
 * Lightweight stand-in for `leaflet`. happy-dom lacks the canvas + DOM surface
 * Leaflet actually needs, so we replace the module wholesale with chainable
 * mocks that record calls. Assertions focus on "did the code wire things up?"
 * (e.g. `polyline.setLatLngs(...)` was called), not pixel-level behaviour.
 */

type Listener = (ev?: unknown) => void;

class MockLatLng {
  constructor(public lat: number, public lng: number) {}
  getNorth() { return this.lat; }
  getSouth() { return this.lat; }
  getEast() { return this.lng; }
  getWest() { return this.lng; }
}

class MockLayer {
  _events = new Map<string, Listener[]>();
  _latlng: MockLatLng | null = null;
  _radius = 0;
  _latlngs: MockLatLng[] = [];
  _bounds: MockLatLng[] | null = null;

  addTo = vi.fn().mockReturnValue(this);
  remove = vi.fn().mockReturnValue(this);
  setLatLng = vi.fn((ll: [number, number]) => { this._latlng = new MockLatLng(ll[0], ll[1]); return this; });
  setLatLngs = vi.fn((lls: [number, number][]) => {
    this._latlngs = lls.map(([lat, lng]) => new MockLatLng(lat, lng));
    return this;
  });
  getLatLng = vi.fn(() => this._latlng ?? new MockLatLng(0, 0));
  getRadius = vi.fn(() => this._radius);
  getBounds = vi.fn(() => new MockLatLng(0, 0));
  bindTooltip = vi.fn().mockReturnValue(this);
  on = vi.fn((event: string, fn: Listener) => {
    const list = this._events.get(event) ?? [];
    list.push(fn);
    this._events.set(event, list);
    return this;
  });
  fire(event: string, payload?: unknown) {
    (this._events.get(event) ?? []).forEach((fn) => fn(payload));
  }
}

class MockFeatureGroup extends MockLayer {
  clearLayers = vi.fn().mockReturnValue(this);
  addLayer = vi.fn().mockReturnValue(this);
  getLayers = vi.fn(() => []);
}

class MockMap extends MockLayer {
  _zoom = 6;
  _listeners = new Map<string, Listener[]>();

  setView = vi.fn().mockReturnValue(this);
  fitBounds = vi.fn().mockReturnValue(this);
  zoomIn = vi.fn().mockReturnValue(this);
  zoomOut = vi.fn().mockReturnValue(this);
  getZoom = vi.fn(() => this._zoom);
  addLayer = vi.fn().mockReturnValue(this);
  removeLayer = vi.fn().mockReturnValue(this);
  addControl = vi.fn().mockReturnValue(this);
  hasLayer = vi.fn(() => true);
  invalidateSize = vi.fn().mockReturnValue(this);
}

const tileLayer = vi.fn(() => ({ addTo: vi.fn().mockReturnValue({}) }));

export const L = {
  map: vi.fn(() => new MockMap()),
  tileLayer: Object.assign(tileLayer, {
    wms: vi.fn(() => ({ addTo: vi.fn() })),
  }),
  marker: vi.fn(() => new MockLayer()),
  polyline: vi.fn(() => new MockLayer()),
  circle: vi.fn(() => new MockLayer()),
  rectangle: vi.fn(() => new MockLayer()),
  featureGroup: vi.fn(() => new MockFeatureGroup()),
  FeatureGroup: MockFeatureGroup,
  divIcon: vi.fn(() => ({})),
  icon: vi.fn(() => ({})),
  control: {
    zoom: vi.fn(() => ({ addTo: vi.fn() })),
  },
  Control: class {
    static Draw = class {
      constructor(public opts: unknown) {}
    };
  },
  DomUtil: { create: vi.fn(() => document.createElement('div')) },
  CRS: { EPSG3857: {} },
};

export default L;
