'use client';

import { useEffect } from 'react';
import { useGeoFenceAlerts } from '@/lib/hooks/useGeoFenceAlerts';
import { loadAirports } from '@/lib/data/airports';

/**
 * Client-only component that mounts once at the root layout and starts
 * cross-page subscriptions (currently just the geo-fence WS listener).
 *
 * Renders nothing.
 */
export function GlobalEffects(): null {
  useGeoFenceAlerts();

  // Warm the airports cache once per session. Fetched with `cache: force-cache`,
  // so the browser keeps it across reloads.
  useEffect(() => {
    void loadAirports();
  }, []);

  return null;
}
