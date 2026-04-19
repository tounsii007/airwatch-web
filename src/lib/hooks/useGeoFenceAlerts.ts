'use client';

import { useEffect } from 'react';
import { useGeoFenceStore, type GeoFenceAlert } from '@/lib/stores/geofenceStore';
import { getOrCreateClientId } from '@/lib/flights/geofence';

/**
 * Listens to the backend flight WebSocket for `geofence_alert` frames and
 * feeds them into {@link useGeoFenceStore}. Mounts a single WS per document;
 * call this once at a layout/root boundary.
 *
 * Messages we care about (from `GeoFenceService.sendAlertToClient`):
 * ```json
 * { "type": "geofence_alert",
 *   "data": { "fenceId": 1, "icao24": "abc", ... } }
 * ```
 */
export function useGeoFenceAlerts() {
  const pushAlert = useGeoFenceStore((s) => s.pushAlert);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') return;

    const backendUrl = process.env.NEXT_PUBLIC_PROXY_URL;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = backendUrl
      ? backendUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/flights'
      : `${proto}//${window.location.host}/ws/flights`;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    // Tell the backend which client id we are so it knows which fence
    // alerts belong to us. (Backend correlates via fence.clientId.)
    const clientId = getOrCreateClientId();

    const connect = () => {
      if (disposed) return;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        // Handshake: send our client id so the backend can route alerts.
        ws?.send(JSON.stringify({ type: 'hello', clientId }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as { type?: string; data?: GeoFenceAlert };
          if (msg.type === 'geofence_alert' && msg.data) {
            pushAlert(msg.data);
          }
        } catch {
          /* ignore non-JSON frames */
        }
      };

      ws.onclose = () => {
        ws = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 10_000);
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      ws = null;
    };
  }, [pushAlert]);
}
