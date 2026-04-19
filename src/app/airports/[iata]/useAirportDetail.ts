'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/constants';
import { apiFetch } from '@/lib/apiFetch';
import { mapScheduleFlight } from '@/app/airports/[iata]/mapScheduleFlight';
import type { AirportEntry, AirportScheduleFlight, WeatherInfo } from '@/lib/types';

interface State {
  airport: AirportEntry | null;
  weather: WeatherInfo | null;
  utcOffsetSec: number | null;
  departures: AirportScheduleFlight[];
  arrivals: AirportScheduleFlight[];
  loading: boolean;
}

const INITIAL: State = { airport: null, weather: null, utcOffsetSec: null, departures: [], arrivals: [], loading: true };

/* eslint-disable @typescript-eslint/no-explicit-any */

function toAirport(raw: any, iata: string): AirportEntry {
  return {
    icao: raw.icao_code ?? '',
    iata: raw.iata_code ?? iata,
    name: raw.name ?? '',
    city: raw.city ?? '',
    country: raw.country_code?.toLowerCase() ?? '',
    lat: raw.lat ?? 0,
    lon: raw.lng ?? 0,
  };
}

function toWeather(raw: any): WeatherInfo {
  return {
    temperatureC: raw.temperature_2m,
    windSpeedKmh: raw.wind_speed_10m,
    weatherCode: raw.weather_code,
    isDay: raw.is_day === 1,
    humidity: raw.relative_humidity_2m,
  };
}

async function fetchAirportInfo(iata: string, signal: AbortSignal): Promise<AirportEntry | null> {
  const res = await apiFetch(API.airport(iata), { signal });
  const data = await res.json();
  const raw = Array.isArray(data.response) && data.response.length > 0 ? data.response[0] : null;
  return raw ? toAirport(raw, iata) : null;
}

async function fetchSchedules(iata: string, dep: boolean, signal: AbortSignal): Promise<AirportScheduleFlight[]> {
  const res = await apiFetch(API.schedules(iata, dep), { signal });
  const data = await res.json();
  if (!Array.isArray(data.response)) return [];
  return data.response.map(mapScheduleFlight).slice(0, 50);
}

async function fetchWeather(lat: number, lon: number, signal: AbortSignal): Promise<{ weather: WeatherInfo; utcOffsetSec: number | null } | null> {
  if (!lat || !lon) return null;
  const res = await apiFetch(API.weather(lat, lon), { signal });
  const data = await res.json();
  if (!data.current) return null;
  return { weather: toWeather(data.current), utcOffsetSec: data.utc_offset_seconds ?? null };
}

/** Consolidated loader for the airport detail page. */
export function useAirportDetail(iata: string): State {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      setState({ ...INITIAL });
      try {
        const airport = await fetchAirportInfo(iata, signal);
        if (signal.aborted) return;
        setState((s) => ({ ...s, airport }));

        const lat = airport?.lat ?? 0;
        const lon = airport?.lon ?? 0;
        const [w, departures, arrivals] = await Promise.all([
          fetchWeather(lat, lon, signal),
          fetchSchedules(iata, true, signal),
          fetchSchedules(iata, false, signal),
        ]);
        if (signal.aborted) return;

        setState((s) => ({
          ...s,
          weather: w?.weather ?? null,
          utcOffsetSec: w?.utcOffsetSec ?? null,
          departures,
          arrivals,
          loading: false,
        }));
      } catch {
        if (!signal.aborted) setState((s) => ({ ...s, loading: false }));
      }
    })();

    return () => controller.abort();
  }, [iata]);

  return state;
}
