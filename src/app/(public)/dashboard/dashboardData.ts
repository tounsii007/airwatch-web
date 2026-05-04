import { API } from '@/lib/constants';
import type { AirportScheduleFlight, WeatherInfo } from '@/lib/types';

export interface DashboardAirport {
  arrivals: AirportScheduleFlight[];
  country?: string;
  departures: AirportScheduleFlight[];
  iata: string;
  loading: boolean;
  name?: string;
  weather?: WeatherInfo;
}

export const DEFAULT_AIRPORTS = ['FRA', 'LHR', 'CDG', 'JFK'];

export function createLoadingAirport(iata: string): DashboardAirport {
  return { iata, departures: [], arrivals: [], loading: true };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSchedule(flight: any): AirportScheduleFlight {
  return {
    flightIcao: flight.flight_icao ?? '',
    flightIata: flight.flight_iata ?? '',
    airlineIata: flight.airline_iata ?? '',
    depIata: flight.dep_iata ?? '',
    arrIata: flight.arr_iata ?? '',
    status: flight.status ?? undefined,
    depTime: flight.dep_time ?? flight.dep_estimated ?? undefined,
    arrTime: flight.arr_time ?? flight.arr_estimated ?? undefined,
    depDelayed: flight.delayed != null ? Number(flight.delayed) : undefined,
    arrDelayed: flight.arr_delayed != null ? Number(flight.arr_delayed) : undefined,
    depTerminal: flight.dep_terminal ?? undefined,
    arrTerminal: flight.arr_terminal ?? undefined,
    depGate: flight.dep_gate ?? undefined,
    arrGate: flight.arr_gate ?? undefined,
  };
}

export async function fetchDashboardAirport(iata: string): Promise<DashboardAirport> {
  const entry = createLoadingAirport(iata);

  try {
    let lat: number | null = null;
    let lng: number | null = null;

    try {
      const infoRes = await fetch(API.airport(iata));
      const infoData = (await infoRes.json()) as { response?: Array<Record<string, unknown>> };
      const info = infoData.response?.[0];
      if (info) {
        entry.name = info.name as string | undefined;
        entry.country = typeof info.country_code === 'string' ? info.country_code.toLowerCase() : undefined;
        lat = typeof info.lat === 'number' ? info.lat : null;
        lng = typeof info.lng === 'number' ? info.lng : null;
      }
    } catch {
      lat = null;
      lng = null;
    }

    const fetches: Promise<unknown>[] = [
      fetch(API.schedules(iata, true)).then((response) => response.json()).catch(() => null),
      fetch(API.schedules(iata, false)).then((response) => response.json()).catch(() => null),
    ];

    if (lat != null && lng != null) {
      fetches.push(fetch(API.weather(lat, lng)).then((response) => response.json()).catch(() => null));
    }

    const [depData, arrData, weatherData] = (await Promise.all(fetches)) as [
      { response?: unknown[] } | null,
      { response?: unknown[] } | null,
      { current?: Record<string, unknown> } | null,
    ];

    if (Array.isArray(depData?.response)) {
      entry.departures = depData.response.map(mapSchedule).slice(0, 8);
    }

    if (Array.isArray(arrData?.response)) {
      entry.arrivals = arrData.response.map(mapSchedule).slice(0, 8);
    }

    if (weatherData?.current) {
      const current = weatherData.current;
      entry.weather = {
        temperatureC: current.temperature_2m as number,
        windSpeedKmh: current.wind_speed_10m as number,
        weatherCode: current.weather_code as number,
        isDay: current.is_day === 1,
        humidity: current.relative_humidity_2m as number,
      };
    }
  } catch {
    return { ...entry, loading: false };
  }

  return { ...entry, loading: false };
}
