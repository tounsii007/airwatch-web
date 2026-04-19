export type CameraMode = 'chase' | 'top' | 'free';

export interface CameraPreset {
  /** Degrees from vertical; 0 = top-down, 60 = tilted. */
  pitch: number;
  /** Map zoom (higher = closer). */
  zoom: number;
  /** Bearing override (null = use current heading). */
  bearing: number | null;
  /** True when we want the camera to re-center on every tick. */
  follow: boolean;
}

/** Ground-following chase-cam — FR24-style third-person tilt. */
const CHASE: CameraPreset = { pitch: 60, zoom: 12, bearing: null, follow: true };

/** Top-down orthographic-ish overview. */
const TOP: CameraPreset = { pitch: 0, zoom: 10, bearing: 0, follow: true };

/** Free camera — user has full control, no auto-follow. */
const FREE: CameraPreset = { pitch: 45, zoom: 10, bearing: 0, follow: false };

export const CAMERA_PRESETS: Record<CameraMode, CameraPreset> = { chase: CHASE, top: TOP, free: FREE };

export interface CameraModeMeta {
  mode: CameraMode;
  label: string;
}

export const CAMERA_MODE_META: CameraModeMeta[] = [
  { mode: 'chase', label: 'CHASE' },
  { mode: 'top',   label: 'TOP' },
  { mode: 'free',  label: 'FREE' },
];
