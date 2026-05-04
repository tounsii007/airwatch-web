'use client';

import { useCallback, useState } from 'react';
import type { OrientationStatus } from '@/app/(public)/ar/useDeviceOrientation';

interface StartParams {
  startCamera: () => void;
  requestOrientationPermission: () => Promise<void>;
  orientationStatus: OrientationStatus;
}

interface StartState {
  starting: boolean;
  startError: string | null;
}

/**
 * Kicks off the camera + (optional) iOS orientation-permission flow in a
 * single user-gesture. Keeps the page component free of orchestration code.
 */
export function useStartArSession({ startCamera, requestOrientationPermission, orientationStatus }: StartParams) {
  const [state, setState] = useState<StartState>({ starting: false, startError: null });

  const start = useCallback(async () => {
    setState({ starting: true, startError: null });
    try {
      if (orientationStatus === 'need-permission') {
        await requestOrientationPermission();
      }
      startCamera();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ starting: false, startError: message });
      return;
    }
    setState({ starting: false, startError: null });
  }, [orientationStatus, requestOrientationPermission, startCamera]);

  return { ...state, start };
}
