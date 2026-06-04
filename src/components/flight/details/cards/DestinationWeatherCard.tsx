'use client';

/**
 * DestinationWeatherCard — "WEATHER AT DESTINATION" glass tile for the flight
 * detail panel. Shows the LIVE weather at the flight's ARRIVAL airport.
 *
 * <h3>Real data only — no synthesised fields</h3>
 * The card resolves the arrival airport's coordinates from {@link airportCoords}
 * and fetches the current conditions through the same proven client path the
 * airport detail page uses — {@link apiFetch} against {@link API.weather} — then
 * maps the upstream `current` block into the project's {@link WeatherInfo} model.
 * Only the fields the backend actually returns exist on that model
 * (temperature, condition code, wind, humidity); visibility / cloud-cover are
 * NOT part of the proxy response, so they are deliberately never rendered. We
 * reuse {@link WeatherInfo} rather than inventing a wider shape precisely so a
 * field can only appear here if it is real.
 *
 * <h3>Why not the module-scope weather cache</h3>
 * `useAirportWeather` exists, but it is the map-label cache and intentionally
 * keeps only the WMO code + day/night flag — it cannot supply temperature,
 * wind or humidity. This card needs those numbers, so it shares the richer
 * `apiFetch(API.weather(...))` client (same endpoint, same rate-limit gate)
 * instead of duplicating any bespoke transport.
 *
 * <h3>Honest gating</h3>
 * Every numeric field is independently gated and rendered only when present —
 * a missing value is dropped, never shown as `0°` or a blank. When the arrival
 * IATA is absent, its coordinates are unknown, or the fetch yields nothing
 * usable, the card collapses to a single subtle "unavailable" line. We never
 * fabricate a reading to fill the tile.
 */

import { useEffect, useState } from 'react';
import { CloudOff, CloudSun, Droplets, Wind } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { apiFetch } from '@/lib/apiFetch';
import { API } from '@/lib/constants';
import { airportCoords } from '@/lib/data/airports';
import { getWeatherEmoji, getWeatherLabel } from '@/lib/utils';
import type { AppLanguage, WeatherInfo } from '@/lib/types';

interface Props {
  /** IATA code of the flight's arrival airport. Optional — gated when absent. */
  arrIata?: string;
  language: AppLanguage;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Map the Open-Meteo proxy `current` block into the project's WeatherInfo
 * model. Mirrors `toWeather` in the airport detail loader so the two surfaces
 * read identical fields from the identical payload — single source of truth
 * for what "real" weather data looks like.
 */
function toWeather(raw: any): WeatherInfo {
  return {
    temperatureC: raw.temperature_2m,
    windSpeedKmh: raw.wind_speed_10m,
    weatherCode: raw.weather_code,
    isDay: raw.is_day === 1,
    humidity: raw.relative_humidity_2m,
  };
}

/**
 * Fetch live weather for the arrival airport via the shared `apiFetch` client.
 * Returns `null` until/unless a usable `current` payload lands; fail-soft on
 * any network or HTTP error so the card simply shows the unavailable state.
 */
function useDestinationWeather(arrIata?: string): WeatherInfo | null {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);

  useEffect(() => {
    setWeather(null);
    const coords = arrIata ? airportCoords(arrIata) : null;
    if (!coords || !coords.lat || !coords.lon) return;

    const controller = new AbortController();
    (async () => {
      try {
        const res = await apiFetch(API.weather(coords.lat, coords.lon), { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.current) return;
        setWeather(toWeather(data.current));
      } catch {
        // Fail-soft: an aborted/failed fetch leaves the card in its
        // "unavailable" state rather than surfacing an error.
      }
    })();

    return () => controller.abort();
  }, [arrIata]);

  return weather;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/** One labelled metric chip (wind / humidity), rendered only when real. */
function MetricChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
      {icon}
      {value}
    </span>
  );
}

/**
 * Live weather at the flight's arrival airport.
 *
 * @param arrIata  Arrival airport IATA; coordinates are resolved from it.
 * @param language Active app language — drives the condition label only;
 *                 the "WEATHER AT DESTINATION" heading is locale-neutral,
 *                 matching the other detail cards (e.g. "STATUS").
 */
export function DestinationWeatherCard({ arrIata, language }: Props) {
  const weather = useDestinationWeather(arrIata);

  // A reading is only worth showing if at least one real field is present.
  const hasTemp = weather?.temperatureC != null;
  const hasCondition = weather?.weatherCode != null;
  const hasWind = weather?.windSpeedKmh != null;
  const hasHumidity = weather?.humidity != null;
  const hasAnything = Boolean(weather) && (hasTemp || hasCondition || hasWind || hasHumidity);

  return (
    <GlassPanel className="rounded-2xl p-4">
      <div className="mb-3 flex items-center gap-2">
        <CloudSun size={14} className="text-[var(--info)]" aria-hidden />
        <span className="text-xs font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
          WEATHER AT DESTINATION
        </span>
      </div>

      {!hasAnything ? (
        <div className="flex items-center gap-1.5">
          <CloudOff size={12} className="text-[var(--text-muted)]" aria-hidden />
          <span className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
            Weather unavailable
          </span>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {getWeatherEmoji(weather!.weatherCode, weather!.isDay)}
            </span>
            {hasTemp && (
              <span className="text-xl font-[var(--font-heading)] font-bold text-[var(--text-primary)] tabular">
                {Math.round(weather!.temperatureC as number)}°C
              </span>
            )}
          </div>

          {hasCondition && (
            <p className="mt-1 text-xs text-[var(--text-secondary)] font-[var(--font-body)]">
              {getWeatherLabel(weather!.weatherCode, language)}
            </p>
          )}

          {(hasWind || hasHumidity) && (
            <div className="mt-2 flex items-center gap-3">
              {hasWind && (
                <MetricChip
                  icon={<Wind size={10} aria-hidden />}
                  value={`${Math.round(weather!.windSpeedKmh as number)} km/h`}
                />
              )}
              {hasHumidity && (
                <MetricChip
                  icon={<Droplets size={10} aria-hidden />}
                  value={`${weather!.humidity}%`}
                />
              )}
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}
