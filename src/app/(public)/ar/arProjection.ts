import { shortestAngleDiff } from '@/app/(public)/ar/arMath';

/** Typical rear-camera field of view on modern phones. */
export const DEFAULT_FOV_DEG = { horizontal: 65, vertical: 50 } as const;

export interface DeviceOrientation {
  /** Compass heading (deg, 0–360, 0 = true north). */
  heading: number;
  /** Tilt above horizon (deg, 0 = looking straight ahead, +90 = zenith). */
  pitch: number;
}

export interface Viewport {
  width: number;
  height: number;
  fovHorizontalDeg: number;
  fovVerticalDeg: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  /** true when the target is inside the camera frustum. */
  inView: boolean;
}

/**
 * Rectilinear projection of a target's (bearing, elevation) onto screen pixels.
 * Approximation: good enough for labels, no lens distortion correction.
 */
export function projectToScreen(
  targetBearingDeg: number,
  targetElevationDeg: number,
  orientation: DeviceOrientation,
  viewport: Viewport,
): ScreenPoint {
  const Δaz = shortestAngleDiff(orientation.heading, targetBearingDeg);
  const Δel = targetElevationDeg - orientation.pitch;
  const halfH = viewport.fovHorizontalDeg / 2;
  const halfV = viewport.fovVerticalDeg / 2;

  const x = viewport.width / 2 + (Δaz / halfH) * (viewport.width / 2);
  // y grows downwards in screen space → invert elevation
  const y = viewport.height / 2 - (Δel / halfV) * (viewport.height / 2);

  const inView = Math.abs(Δaz) <= halfH && Math.abs(Δel) <= halfV;
  return { x, y, inView };
}
