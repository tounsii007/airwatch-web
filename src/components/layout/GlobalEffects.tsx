'use client';

import { useEffect } from 'react';
import { useGeoFenceAlerts } from '@/lib/hooks/useGeoFenceAlerts';
import { useGeoFenceToasts } from '@/lib/hooks/useGeoFenceToasts';
import { loadAirports } from '@/lib/data/airports';
import { loadCityI18n } from '@/lib/data/city-translations';
import { dirAttr } from '@/lib/i18n/rtl';
import { useSettingsStore } from '@/lib/stores/settingsStore';

/**
 * Client-only component that mounts once at the root layout and starts
 * cross-page subscriptions (currently just the geo-fence WS listener).
 *
 * Also keeps the {@code <html>} element's {@code lang} and {@code dir}
 * attributes in sync with the user's chosen language so:
 *   * Screen readers pronounce the page in the right voice.
 *   * Native form controls + browser-rendered widgets pick up RTL when
 *     the user selects Arabic.
 *   * Tailwind's logical properties (ms-/me-/text-start/etc.) flip
 *     direction without component-level changes.
 *
 * Renders nothing.
 */
export function GlobalEffects(): null {
  useGeoFenceAlerts();
  useGeoFenceToasts();
  const language = useSettingsStore((s) => s.language);

  // Warm the data caches once per session. Both are fetched with
  // `cache: force-cache`, so the browser keeps them across reloads.
  useEffect(() => {
    void loadAirports();
    void loadCityI18n();
  }, []);

  // Sync <html lang + dir> on every language change. Hydration starts
  // with whatever the SSR rendered (en/ltr); this swap on the client
  // is the smallest delta to switch a Arabic-preferring user into RTL
  // without a server-side language detection round-trip.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = dirAttr(language);
  }, [language]);

  return null;
}
