'use client';

import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { useGeoNearbyAirports } from './useGeoNearbyAirports';

/**
 * "Airports near you" panel — surfaces airports within 100 km of the user's
 * current geolocation, fetched via the proxied {@code /airports/nearby}
 * Airlabs endpoint.
 *
 * <h3>UX</h3>
 *  * Initial state: a compact CTA explaining the value + an "Allow" button
 *    so we never silently prompt for geolocation on page load.
 *  * After grant: a short list (top 5) of airports as clickable cards
 *    that deep-link into the airport detail page.
 *  * Denied / unavailable: a one-line hint with a re-try link.
 */
export function NearbyAirportsPanel({ distanceKm = 100 }: { distanceKm?: number }) {
  const { language } = useSettingsStore();
  const { status, airports, error, position, requestLocation } = useGeoNearbyAirports(distanceKm);

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
            {t('airports_near_you', language)}
          </h3>
          {position && (
            <p className="text-[10px] text-[var(--text-muted)]">
              {position.lat.toFixed(2)}°, {position.lng.toFixed(2)}° · {distanceKm} km
            </p>
          )}
        </div>
        {status === 'idle' && (
          <button
            type="button"
            onClick={requestLocation}
            className="px-3 py-1.5 text-xs font-[var(--font-heading)] font-bold rounded bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
          >
            {t('use_my_location', language)}
          </button>
        )}
      </div>

      {status === 'idle' && (
        <p className="text-xs text-[var(--text-muted)]">{t('airports_near_you_cta', language)}</p>
      )}
      {status === 'requesting' && (
        <p className="text-xs text-[var(--text-muted)]">{t('locating', language)}…</p>
      )}
      {status === 'loading' && (
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-[var(--surface-hover)] animate-pulse" />
          ))}
        </div>
      )}
      {(status === 'denied' || status === 'unavailable') && (
        <p className="text-xs text-[var(--text-muted)]">
          {t(status === 'denied' ? 'geo_denied' : 'geo_unavailable', language)}{' '}
          <button type="button" onClick={requestLocation} className="underline text-[var(--primary)]">
            {t('retry', language)}
          </button>
        </p>
      )}
      {status === 'error' && (
        <p className="text-xs text-[var(--text-muted)]">
          {error === 'rate_limited' ? t('top_delays_err_rate_limited', language)
            : error === 'quota_exhausted' ? t('top_delays_err_quota', language)
            : t('top_delays_err_generic', language)}
        </p>
      )}
      {status === 'ready' && airports.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">{t('no_nearby_airports', language)}</p>
      )}

      {status === 'ready' && airports.length > 0 && (
        <ul className="space-y-1">
          {airports.slice(0, 5).map((a) => (
            <li key={a.icao_code ?? a.iata_code ?? a.name}>
              <Link
                href={`/airports/${(a.iata_code ?? a.icao_code ?? '').toUpperCase()}`}
                className="flex items-center justify-between px-2 py-2 rounded hover:bg-[var(--surface-hover)] transition"
              >
                <div className="min-w-0">
                  <div className="text-xs font-[var(--font-heading)] font-bold text-[var(--primary)]">
                    {a.iata_code ?? a.icao_code} ·{' '}
                    <span className="font-normal text-[var(--text-secondary)]">{a.name}</span>
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {a.city ?? a.country_code ?? ''}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
