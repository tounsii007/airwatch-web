'use client';

import { useCallback, useEffect, useState } from 'react';
import { normalizeDeg } from '@/app/(public)/ar/arMath';

export type OrientationStatus = 'idle' | 'need-permission' | 'granted' | 'denied' | 'unsupported';

interface OrientationState {
  heading: number | null;
  pitch: number | null;
  roll: number | null;
  status: OrientationStatus;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

type IOSOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

function needsIOSPermission(): boolean {
  const anyEvt = DeviceOrientationEvent as any;
  return typeof anyEvt?.requestPermission === 'function';
}

/**
 * Extract compass heading from the event. iOS Safari provides the precise
 * magnetic-compass value on `webkitCompassHeading`. Other browsers only give
 * us `alpha`, which we invert to match the "north = 0° clockwise" convention.
 */
function extractHeading(e: IOSOrientationEvent): number | null {
  if (typeof e.webkitCompassHeading === 'number') return normalizeDeg(e.webkitCompassHeading);
  if (typeof e.alpha === 'number') return normalizeDeg(360 - e.alpha);
  return null;
}

/**
 * Convert `beta` (front-to-back tilt, deg) to pitch above horizon.
 * When the phone is held vertically (portrait, looking forward), beta ≈ 90.
 * Aiming the back camera at the sky → beta > 90 → pitch > 0.
 */
function extractPitch(e: DeviceOrientationEvent): number | null {
  if (typeof e.beta !== 'number') return null;
  return e.beta - 90;
}

const INITIAL: OrientationState = { heading: null, pitch: null, roll: null, status: 'idle' };

/** Read the back camera's sky-pointing orientation in real time. */
export function useDeviceOrientation() {
  const [state, setState] = useState<OrientationState>(INITIAL);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('DeviceOrientationEvent' in window)) {
       
      setState((s) => ({ ...s, status: 'unsupported' }));
      return;
    }
     
    if (needsIOSPermission()) setState((s) => ({ ...s, status: 'need-permission' }));
     
    else setState((s) => ({ ...s, status: 'granted' }));
  }, []);

  useEffect(() => {
    if (state.status !== 'granted') return;
    const handler = (e: DeviceOrientationEvent) => {
      const iOSEvent = e as IOSOrientationEvent;
      setState({
        heading: extractHeading(iOSEvent),
        pitch: extractPitch(e),
        roll: typeof e.gamma === 'number' ? e.gamma : null,
        status: 'granted',
      });
    };
    // `absolute:true` asks for true-north heading on Android/Chrome
    window.addEventListener('deviceorientationabsolute' as 'deviceorientation', handler);
    window.addEventListener('deviceorientation', handler);
    return () => {
      window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', handler);
      window.removeEventListener('deviceorientation', handler);
    };
  }, [state.status]);

  const requestPermission = useCallback(async () => {
    const anyEvt = DeviceOrientationEvent as any;
    if (typeof anyEvt?.requestPermission !== 'function') return;
    try {
      const result: PermissionState = await anyEvt.requestPermission();
      setState((s) => ({ ...s, status: result === 'granted' ? 'granted' : 'denied' }));
    } catch {
      setState((s) => ({ ...s, status: 'denied' }));
    }
  }, []);

  return { ...state, requestPermission };
}
