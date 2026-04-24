'use client';

import { useEffect } from 'react';
import { useGeoFenceAlerts } from '@/lib/hooks/useGeoFenceAlerts';
import { loadAirports } from '@/lib/data/airports';
import { loadCityI18n } from '@/lib/data/city-translations';

/**
 * Client-only component that mounts once at the root layout and starts
 * cross-page subscriptions (currently just the geo-fence WS listener).
 *
 * Renders nothing.
 */
export function GlobalEffects(): null {
  useGeoFenceAlerts();

  // Warm the data caches once per session. Both are fetched with
  // `cache: force-cache`, so the browser keeps them across reloads.
  useEffect(() => {
    void loadAirports();
    void loadCityI18n();
  }, []);

  return null;
}
