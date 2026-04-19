'use client';

import { useEffect, useState } from 'react';

export type PositionStatus = 'idle' | 'watching' | 'denied' | 'unsupported' | 'error';

export interface UserPosition {
  lat: number;
  lon: number;
  accuracyMeters: number;
}

interface State {
  position: UserPosition | null;
  status: PositionStatus;
  error: string | null;
}

const INITIAL: State = { position: null, status: 'idle', error: null };

function toPosition(p: GeolocationPosition): UserPosition {
  return { lat: p.coords.latitude, lon: p.coords.longitude, accuracyMeters: p.coords.accuracy };
}

function errorStatus(code: number): PositionStatus {
  return code === 1 ? 'denied' : 'error';
}

/** Continuous high-accuracy geolocation watch — ideal for the AR view. */
export function useUserPosition() {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ position: null, status: 'unsupported', error: 'Geolocation not available' });
      return;
    }

     
    setState((s) => ({ ...s, status: 'watching' }));
    const id = navigator.geolocation.watchPosition(
      (p) => setState({ position: toPosition(p), status: 'watching', error: null }),
      (err) => setState((s) => ({ ...s, status: errorStatus(err.code), error: err.message })),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return state;
}
