import type { CameraStatus } from '@/app/ar/useCameraStream';
import type { OrientationStatus } from '@/app/ar/useDeviceOrientation';
import type { PositionStatus } from '@/app/ar/useUserPosition';

export interface ArErrorInfo {
  title: string;
  message: string;
}

function cameraError(status: CameraStatus, message: string | null): ArErrorInfo | null {
  if (status === 'denied') return { title: 'Kamera blockiert', message: 'Bitte Kamera-Zugriff in den Browser-Einstellungen erlauben.' };
  if (status === 'unsupported') return { title: 'Kamera nicht verfügbar', message: message ?? 'Dieses Gerät hat keine nutzbare Kamera.' };
  if (status === 'error') return { title: 'Kamera-Fehler', message: message ?? 'Unbekannter Fehler beim Starten der Kamera.' };
  return null;
}

function orientationError(status: OrientationStatus): ArErrorInfo | null {
  if (status === 'denied') return { title: 'Sensor-Zugriff abgelehnt', message: 'Ohne Kompass-/Gyroskop-Zugriff kann AR nichts platzieren.' };
  if (status === 'unsupported') return { title: 'Sensoren fehlen', message: 'Dieses Gerät meldet keine Orientierungs-Daten.' };
  return null;
}

function positionError(status: PositionStatus, message: string | null): ArErrorInfo | null {
  if (status === 'denied') return { title: 'Standort blockiert', message: 'AR braucht deinen groben Standort, um den Horizont zu berechnen.' };
  if (status === 'unsupported') return { title: 'Geolocation fehlt', message: 'Dein Browser unterstützt keine Standortabfrage.' };
  if (status === 'error') return { title: 'Standort-Fehler', message: message ?? 'Der Standort konnte nicht ermittelt werden.' };
  return null;
}

interface Inputs {
  cameraStatus: CameraStatus;
  cameraMessage: string | null;
  orientationStatus: OrientationStatus;
  positionStatus: PositionStatus;
  positionMessage: string | null;
}

/** First unrecoverable error wins — keeps the error panel focused on one thing. */
export function firstFatalError(inputs: Inputs): ArErrorInfo | null {
  return (
    cameraError(inputs.cameraStatus, inputs.cameraMessage)
    ?? orientationError(inputs.orientationStatus)
    ?? positionError(inputs.positionStatus, inputs.positionMessage)
  );
}
