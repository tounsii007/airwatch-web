// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Stub leaflet — Layer.extend just hands back a constructor that records
// state, addTo / removeLayer track add/remove sequence.
const fakeAdded: unknown[] = [];
const fakeRemoved: unknown[] = [];

vi.mock('leaflet', () => {
  const layerInstances: Array<Record<string, unknown>> = [];
  const Layer = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extend(spec: any) {
      function HeatLayer() {
        const instance: Record<string, unknown> = {
          _points: [],
          ...spec,
          addTo(m: unknown) { fakeAdded.push(this); (this as { _map: unknown })._map = m; return this; },
          // The real extend wires this; we just record.
        };
        layerInstances.push(instance);
        return instance;
      }
      return HeatLayer;
    },
  };
  return {
    default: { Layer, DomUtil: { setPosition: () => {} } },
    Layer,
    DomUtil: { setPosition: () => {} },
  };
});

import { useHeatmapLayer } from './useHeatmapLayer';

function fakeMap() {
  return {
    removeLayer: vi.fn((l: unknown) => { fakeRemoved.push(l); }),
    on: vi.fn(),
    off: vi.fn(),
    getSize: () => ({ x: 800, y: 600 }),
    getPanes: () => ({ overlayPane: document.createElement('div') }),
    containerPointToLayerPoint: () => ({ x: 0, y: 0 }),
     
    latLngToContainerPoint: ([lat, _lon]: [number, number]) => ({ x: lat * 10, y: 100 }),
  };
}

describe('useHeatmapLayer', () => {
  beforeEach(() => { fakeAdded.length = 0; fakeRemoved.length = 0; });
  afterEach(() => { vi.restoreAllMocks(); });

  it('does not throw on null map (SSR / pre-mount)', () => {
    const { unmount } = renderHook(() => useHeatmapLayer(null, [], true));
    unmount();
    expect(fakeAdded).toHaveLength(0);
  });

  it('does not add a layer when enabled=false', async () => {
    const map = fakeMap();
    renderHook(() => useHeatmapLayer(map, [{ lat: 50, lon: 8 }], false));
    // Wait one microtask for the lazy import to resolve.
    await new Promise((r) => setTimeout(r, 5));
    expect(fakeAdded).toHaveLength(0);
  });

  it('adds a layer when enabled=true', async () => {
    const map = fakeMap();
    renderHook(() => useHeatmapLayer(map, [{ lat: 50, lon: 8 }], true));
    await new Promise((r) => setTimeout(r, 10));
    expect(fakeAdded.length).toBeGreaterThan(0);
  });

  it('removes the layer on unmount', async () => {
    const map = fakeMap();
    const { unmount } = renderHook(() => useHeatmapLayer(map, [{ lat: 50, lon: 8 }], true));
    await new Promise((r) => setTimeout(r, 10));
    expect(fakeAdded.length).toBeGreaterThan(0);
    unmount();
    expect(map.removeLayer).toHaveBeenCalled();
  });
});
