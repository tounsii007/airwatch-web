'use client';

/**
 * Bridges geo-fence alerts into the in-app toast queue.
 *
 * Subscribes to `useGeoFenceStore.alerts` and fires a warning toast for
 * every alert that is *newer* than the component's mount time. This keeps
 * the initial load (replaying persisted alerts from localStorage) silent
 * while still notifying for any alert that arrives live.
 *
 * Mount once via `GlobalEffects` — the hook is a no-op on the server and
 * in browsers that don't support WebSocket.
 */

import { useEffect, useRef } from 'react';
import { useGeoFenceStore, type GeoFenceAlert } from '@/lib/stores/geofenceStore';
import { toast } from '@/components/ui/toast';
import { resolveAirlineName } from '@/app/(public)/geofences/alertFormat';

/** How long a geofence-entry warning toast stays on screen (ms). Longer than
 *  the 3s default because these alerts are safety-relevant and easy to miss. */
const GEOFENCE_ALERT_DURATION_MS = 8000;

/** Build a concise single-line summary for the toast title. */
function formatAlertTitle(alert: GeoFenceAlert): string {
  const id = alert.callsign?.trim() || alert.icao24.toUpperCase();
  return `✈ ${id} entered "${alert.fenceName}"`;
}

/** Build the secondary body line (altitude + airline when available). */
function formatAlertBody(alert: GeoFenceAlert): string | undefined {
  const parts: string[] = [];

  const airlineName = resolveAirlineName(alert.airlineIcao ?? alert.callsign);
  if (airlineName) parts.push(airlineName);

  if (alert.altitude != null && !Number.isNaN(alert.altitude)) {
    const ft = Math.round(alert.altitude * 3.28084);
    if (ft >= 18000) {
      parts.push(`FL${Math.round(ft / 100)}`);
    } else {
      parts.push(`${Math.round(alert.altitude)} m`);
    }
  }

  if (alert.speed != null && alert.speed > 0) {
    parts.push(`${Math.round(alert.speed)} kt`);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function useGeoFenceToasts(): void {
  const alerts = useGeoFenceStore((s) => s.alerts);

  // Record the wall-clock ms when this hook first mounted. We only toast
  // alerts whose timestamp is after this mark, so replaying persisted
  // history on page load doesn't flood the user.
  const mountedAtRef = useRef<number>(Date.now());

  // Track which (icao24, fenceId) pairs we have already toasted this
  // session to avoid duplicate toasts on re-renders.
  const toastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const alert of alerts) {
      const key = `${alert.icao24}:${alert.fenceId}`;
      if (toastedRef.current.has(key)) continue;

      // Parse the alert timestamp so we can compare it to mount time.
      const alertMs = new Date(alert.timestamp).getTime();
      const isLive = !Number.isNaN(alertMs) && alertMs >= mountedAtRef.current;
      if (!isLive) continue;

      toastedRef.current.add(key);
      toast.warning({
        title: formatAlertTitle(alert),
        body: formatAlertBody(alert),
        duration: GEOFENCE_ALERT_DURATION_MS,
      });
    }
  }, [alerts]);
}
