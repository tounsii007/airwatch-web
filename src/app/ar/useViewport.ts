'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FOV_DEG, type Viewport } from '@/app/ar/arProjection';

function currentViewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    fovHorizontalDeg: DEFAULT_FOV_DEG.horizontal,
    fovVerticalDeg: DEFAULT_FOV_DEG.vertical,
  };
}

/** Reactive viewport dimensions. Keeps projection math in sync with resizes. */
export function useViewport(): Viewport | null {
  const [viewport, setViewport] = useState<Viewport | null>(null);

  useEffect(() => {
    const update = () => setViewport(currentViewport());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return viewport;
}
