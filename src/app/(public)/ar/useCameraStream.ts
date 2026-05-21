'use client';

import { useCallback, useEffect, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unsupported' | 'error';

interface CameraState {
  stream: MediaStream | null;
  status: CameraStatus;
  errorMessage: string | null;
}

const INITIAL: CameraState = { stream: null, status: 'idle', errorMessage: null };

const REAR_CAMERA: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
};

/**
 * Convert a getUserMedia rejection into our domain-typed status. The
 * `message` field exposes the raw browser string ONLY for the unclassified
 * `error` branch — that's the only case where the upstream text carries
 * useful detail (e.g. "Could not start video source"). All other branches
 * return `null` so {@link arSessionErrors} can pick the localised body
 * instead of falling back to a hard-coded English phrase.
 */
function classifyError(err: unknown): { status: CameraStatus; message: string | null } {
  if (!(err instanceof Error)) return { status: 'error', message: null };
  if (err.name === 'NotAllowedError') return { status: 'denied', message: null };
  if (err.name === 'NotFoundError') return { status: 'unsupported', message: null };
  return { status: 'error', message: err.message };
}

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Request the rear camera and expose the MediaStream. Must be called after a
 * user-gesture on iOS Safari. The stream is stopped automatically on unmount.
 */
export function useCameraStream() {
  const [state, setState] = useState<CameraState>(INITIAL);
  const [requestToken, setRequestToken] = useState(0);

  const start = useCallback(() => setRequestToken((n) => n + 1), []);

  useEffect(() => {
    if (requestToken === 0) return; // wait until user triggers

    if (!isSupported()) {
      // No platform-specific detail to share — let arSessionErrors pick
      // the localised body for `unsupported`.
      setState({ stream: null, status: 'unsupported', errorMessage: null });
      return;
    }

    let active = true;
    let currentStream: MediaStream | null = null;
    setState({ stream: null, status: 'requesting', errorMessage: null });

    navigator.mediaDevices.getUserMedia(REAR_CAMERA)
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        currentStream = stream;
        setState({ stream, status: 'ready', errorMessage: null });
      })
      .catch((err) => {
        if (!active) return;
        const { status, message } = classifyError(err);
        setState({ stream: null, status, errorMessage: message });
      });

    return () => {
      active = false;
      currentStream?.getTracks().forEach((t) => t.stop());
    };
  }, [requestToken]);

  return { ...state, start };
}
