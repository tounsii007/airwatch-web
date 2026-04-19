'use client';

import { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream | null;
}

/**
 * Full-screen `<video>` element bound to the live camera stream.
 * Autoplay requires `muted` + `playsInline` to work on iOS Safari.
 */
export function CameraFeed({ stream }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    return () => { el.srcObject = null; };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="fixed inset-0 w-full h-full object-cover bg-black"
    />
  );
}
