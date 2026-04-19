'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { ArErrorPanel } from '@/app/ar/ArErrorPanel';
import { ArOverlay } from '@/app/ar/ArOverlay';
import { ArPermissionPrompt } from '@/app/ar/ArPermissionPrompt';
import { ArTopBar } from '@/app/ar/ArTopBar';
import { CameraFeed } from '@/app/ar/CameraFeed';
import { firstFatalError } from '@/app/ar/arSessionErrors';
import { useCameraStream } from '@/app/ar/useCameraStream';
import { useDeviceOrientation } from '@/app/ar/useDeviceOrientation';
import { useStartArSession } from '@/app/ar/useStartArSession';
import { useUserPosition } from '@/app/ar/useUserPosition';
import { useViewport } from '@/app/ar/useViewport';
import { useVisibleAircraft } from '@/app/ar/useVisibleAircraft';
import type { AircraftState } from '@/lib/types';

/** True once every input needed for an AR frame is available. */
function isArReady(camera: ReturnType<typeof useCameraStream>, orientation: ReturnType<typeof useDeviceOrientation>, position: ReturnType<typeof useUserPosition>): boolean {
  return camera.status === 'ready'
    && orientation.status === 'granted' && orientation.heading != null && orientation.pitch != null
    && position.status === 'watching' && position.position != null;
}

export function ArView() {
  const router = useRouter();
  const { altitudeUnit, speedUnit } = useSettingsStore();
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const startPolling = useFlightStore((s) => s.startPolling);
  const aircraftMapSize = useFlightStore((s) => s.aircraftMap.size);

  const camera = useCameraStream();
  const orientation = useDeviceOrientation();
  const position = useUserPosition();
  const viewport = useViewport();

  const { starting, startError, start } = useStartArSession({
    startCamera: camera.start,
    requestOrientationPermission: orientation.requestPermission,
    orientationStatus: orientation.status,
  });

  useEffect(() => { if (aircraftMapSize === 0) startPolling(); }, [aircraftMapSize, startPolling]);

  const visible = useVisibleAircraft({
    lat: position.position?.lat ?? null,
    lon: position.position?.lon ?? null,
    heading: orientation.heading,
    pitch: orientation.pitch,
    viewport,
  });

  const fatal = firstFatalError({
    cameraStatus: camera.status,
    cameraMessage: camera.errorMessage,
    orientationStatus: orientation.status,
    positionStatus: position.status,
    positionMessage: position.error,
  });

  const handleSelect = (ac: AircraftState) => {
    selectAircraft(ac);
    router.push('/');
  };

  const handleExit = () => router.back();

  if (fatal) return <ArErrorPanel title={fatal.title} message={fatal.message} onRetry={() => location.reload()} />;
  if (camera.status === 'idle') return <ArPermissionPrompt busy={starting} error={startError} onStart={start} />;

  return (
    <div className="fixed inset-0 bg-black">
      <CameraFeed stream={camera.stream} />
      <ArTopBar onExit={handleExit} />
      {viewport && isArReady(camera, orientation, position) && (
        <ArOverlay
          viewport={viewport}
          orientation={{ heading: orientation.heading!, pitch: orientation.pitch! }}
          roll={orientation.roll}
          position={position.position}
          visible={visible}
          altitudeUnit={altitudeUnit}
          speedUnit={speedUnit}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
