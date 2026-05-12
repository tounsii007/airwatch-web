'use client';

import { useCallback, useEffect, useState } from 'react';
import { API } from '@/lib/constants';
import { fetchAirlabsArray } from '@/lib/airlabs/fetch';
import { z } from 'zod';

/**
 * Browser-geolocation-driven "airports near me" hook.
 *
 * <h3>Permission flow</h3>
 *   * {@code idle}             — initial state, nothing requested
 *   * {@code requesting}       — geolocation prompt visible
 *   * {@code denied}           — user denied, surface a hint to re-allow
 *   * {@code unavailable}      — browser doesn't support geolocation (e.g. http on a non-localhost host)
 *   * {@code loading}          — coordinates received, fetching airports
 *   * {@code ready}            — airports loaded
 *   * {@code error}            — fetch failed (network / quota / etc.)
 *
 * <h3>Privacy</h3>
 * Coordinates are rounded to 4 decimals (≈ 11 m precision) before sending
 * to the backend, both for cache-key stability and to limit the precision
 * we expose. Coordinates aren't stored — they live in component state and
 * vanish on navigation.
 */

export type GeoStatus = 'idle' | 'requesting' | 'denied' | 'unavailable' | 'loading' | 'ready' | 'error';

const NearbyAirport = z.object({
  iata_code: z.string().nullable().optional(),
  icao_code: z.string().nullable().optional(),
  name: z.string().optional(),
  city: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
}).passthrough();

export type NearbyAirport = z.infer<typeof NearbyAirport>;

export interface NearbyState {
  status: GeoStatus;
  airports: NearbyAirport[];
  /** Last error code from {@link fetchAirlabsArray} when status === 'error'. */
  error: string | null;
  /** User's last known coordinates (rounded). null until they grant permission. */
  position: { lat: number; lng: number } | null;
  /** Trigger the geolocation request. Idempotent if already in progress. */
  requestLocation: () => void;
}

export function useGeoNearbyAirports(distanceKm = 100): NearbyState {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [airports, setAirports] = useState<NearbyAirport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const requestLocation = useCallback(() => {
    if (status === 'requesting' || status === 'loading') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Round to 4 decimals — same precision as the backend cache key.
        const lat = Math.round(pos.coords.latitude * 1e4) / 1e4;
        const lng = Math.round(pos.coords.longitude * 1e4) / 1e4;
        setPosition({ lat, lng });
        setStatus('loading');
      },
      (err) => {
        // err.code === PositionError.PERMISSION_DENIED === 1
        setStatus(err.code === 1 ? 'denied' : 'error');
        setError(err.message);
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, [status]);

  useEffect(() => {
    if (!position) return;
    let cancelled = false;
    (async () => {
      const url = API.airportsNearby(position.lat, position.lng, distanceKm);
      const result = await fetchAirlabsArray(url, NearbyAirport, 'airports/nearby');
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setAirports([]);
        setStatus('error');
      } else {
        setAirports(result.items);
        setStatus('ready');
        setError(null);
      }
    })();
    return () => { cancelled = true; };
  }, [position, distanceKm]);

  return { status, airports, error, position, requestLocation };
}
