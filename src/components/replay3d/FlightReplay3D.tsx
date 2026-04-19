'use client';

import { useMemo, useState } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { CameraSwitcher } from '@/components/replay3d/CameraSwitcher';
import { ReplayControls, SPEED_OPTIONS, type SpeedOption } from '@/components/replay3d/ReplayControls';
import { TelemetryHud } from '@/components/replay3d/TelemetryHud';
import { ThreeDMap } from '@/components/replay3d/ThreeDMap';
import { interpolateAt } from '@/components/replay3d/interpolateTrip';
import { useAnimationClock } from '@/components/replay3d/useAnimationClock';
import { useTripData } from '@/components/replay3d/useTripData';
import { useViewState } from '@/components/replay3d/useViewState';
import type { CameraMode } from '@/components/replay3d/cameraModes';
import type { FlightPosition } from '@/lib/schemas';

interface Props {
  positions: readonly FlightPosition[];
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)] font-[var(--font-body)]">
      Keine Positionsdaten — der Flug hat zu wenig Track-Punkte.
    </div>
  );
}

/** Orchestrates every 3D-replay hook into a single deck.gl view. */
export function FlightReplay3D({ positions }: Props) {
  const { altitudeUnit, speedUnit } = useSettingsStore();
  const trip = useTripData(positions);

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<SpeedOption>(SPEED_OPTIONS[2]);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');

  const { currentTimeMs, atEnd, seek } = useAnimationClock({
    durationMs: trip?.durationMs ?? 0,
    speed,
    playing: playing && !!trip,
  });

  const snapshot = useMemo(
    () => (trip ? interpolateAt(trip, currentTimeMs) : null),
    [trip, currentTimeMs],
  );

  const { viewState, onViewStateChange } = useViewState({
    mode: cameraMode,
    snapshotPosition: snapshot?.position ?? null,
    snapshotHeading: snapshot?.headingDeg ?? 0,
  });

  if (!trip) return <EmptyState />;

  return (
    <div className="relative w-full h-full min-h-[520px]">
      <ThreeDMap
        trip={trip}
        currentTimeMs={currentTimeMs}
        snapshot={snapshot}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
      />
      <TelemetryHud
        snapshot={snapshot}
        wallClockEpochMs={trip.startEpochMs + currentTimeMs}
        altitudeUnit={altitudeUnit}
        speedUnit={speedUnit}
        callsign={trip.callsign}
        icao24={trip.icao24}
      />
      <CameraSwitcher mode={cameraMode} onChange={setCameraMode} />
      <ReplayControls
        playing={playing && !atEnd}
        speed={speed}
        currentTimeMs={currentTimeMs}
        durationMs={trip.durationMs}
        atEnd={atEnd}
        onTogglePlay={() => setPlaying((p) => !p)}
        onRestart={() => { seek(0); setPlaying(true); }}
        onSpeedChange={setSpeed}
        onSeek={seek}
      />
    </div>
  );
}
