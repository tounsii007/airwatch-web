'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

export function useUserLocation(language: AppLanguage, retryToken: number) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.geolocation) {
      const unsupportedTimer = window.setTimeout(() => {
        if (!cancelled) {
          setGeoError(t('geo_unavailable', language));
        }
      }, 0);

      return () => {
        cancelled = true;
        window.clearTimeout(unsupportedTimer);
      };
    }

    const resetTimer = window.setTimeout(() => {
      if (!cancelled) {
        setGeoError(null);
      }
    }, 0);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setUserLat(position.coords.latitude);
        setUserLon(position.coords.longitude);
        setGeoError(null);
      },
      () => {
        if (!cancelled) {
          setGeoError(t('geo_denied', language));
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
    };
  }, [language, retryToken]);

  return { userLat, userLon, geoError };
}
