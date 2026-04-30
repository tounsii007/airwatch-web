'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CAMERA_PRESETS, type CameraMode } from '@/components/replay3d/cameraModes';

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
}

const DEFAULT_VIEW: MapViewState = {
  longitude: 0, latitude: 0, zoom: 2, pitch: 0, bearing: 0,
};

interface Params {
  mode: CameraMode;
  snapshotPosition: [number, number, number] | null;
  snapshotHeading: number;
}

/**
 * Managed camera state. When `follow` is on, we slave the lon/lat (and
 * optionally the bearing) to the current aircraft. Otherwise we respect
 * user-driven pan/zoom via `onViewStateChange`.
 */
export function useViewState({ mode, snapshotPosition, snapshotHeading }: Params) {
  const preset = CAMERA_PRESETS[mode];
  const [viewState, setViewState] = useState<MapViewState>(DEFAULT_VIEW);
  const lastModeRef = useRef<CameraMode | null>(null);

  // Snap camera to preset when user switches modes.
  useEffect(() => {
    if (lastModeRef.current === mode) return;
    lastModeRef.current = mode;
     
    setViewState((s) => ({
      ...s,
      pitch: preset.pitch,
      zoom: preset.zoom,
      bearing: preset.bearing ?? s.bearing,
      transitionDuration: 600,
    }));
  }, [mode, preset]);

  // Auto-follow aircraft when the preset says so.
  useEffect(() => {
    if (!preset.follow || !snapshotPosition) return;
    const [lon, lat] = snapshotPosition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewState((s) => ({
      ...s,
      longitude: lon,
      latitude: lat,
      bearing: preset.bearing ?? snapshotHeading,
    }));
  }, [preset.follow, preset.bearing, snapshotPosition, snapshotHeading]);

  const onViewStateChange = useCallback(({ viewState: next }: { viewState: MapViewState }) => {
    setViewState(next);
  }, []);

  return { viewState, onViewStateChange };
}
