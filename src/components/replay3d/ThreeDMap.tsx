'use client';

import DeckGL from '@deck.gl/react';
import { buildAircraftIconLayer } from '@/components/replay3d/aircraftIconLayerConfig';
import { buildBasemapLayer } from '@/components/replay3d/basemapLayer';
import { buildStaticTrackLayer } from '@/components/replay3d/pathLayerConfig';
import { buildTripsLayer } from '@/components/replay3d/tripsLayerConfig';
import type { TripSnapshot } from '@/components/replay3d/interpolateTrip';
import type { MapViewState } from '@/components/replay3d/useViewState';
import type { TripData } from '@/components/replay3d/types';

interface Props {
  trip: TripData;
  currentTimeMs: number;
  snapshot: TripSnapshot | null;
  viewState: MapViewState;
  onViewStateChange: (e: { viewState: MapViewState }) => void;
}

/**
 * Thin deck.gl wrapper: composes basemap + static track + animated trail +
 * aircraft icon and wires the managed camera. Absolutely no render logic —
 * all configuration lives in `…LayerConfig.ts` helpers, each unit-testable.
 */
export function ThreeDMap({ trip, currentTimeMs, snapshot, viewState, onViewStateChange }: Props) {
  const layers = [
    buildBasemapLayer(),
    buildStaticTrackLayer(trip),
    buildTripsLayer({ trip, currentTimeMs }),
    buildAircraftIconLayer({
      currentPosition: snapshot?.position ?? null,
      headingDeg: snapshot?.headingDeg ?? 0,
    }),
  ];

  return (
    <DeckGL
      layers={layers}
      viewState={viewState}
      controller
      onViewStateChange={onViewStateChange as never}
      style={{ position: 'absolute', inset: '0' }}
    />
  );
}
