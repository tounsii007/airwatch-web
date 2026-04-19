'use client';

import { useEffect, useMemo, useState } from 'react';
import { API } from '@/lib/constants';
import { apiFetch } from '@/lib/apiFetch';
import { resolveAirline } from '@/lib/data/airlines';
import { mapAirlineFlight, type AirlineData, type AirlineFlight } from '@/app/airlines/[icao]/airlineTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */

const AIRLINE_FIELDS = 'airline_icao,airline_iata,flag,flight_icao,flight_iata,dep_iata,arr_iata,aircraft_icao,status';
const FLIGHT_FIELDS = 'flight_icao,flight_iata,dep_iata,arr_iata,aircraft_icao,status';

function mergeAirline(prev: AirlineData | null, local: AirlineData | null, first: any, icao: string): AirlineData {
  return {
    name: prev?.name ?? local?.name ?? icao,
    iata: prev?.iata || first.airline_iata || '',
    icao: first.airline_icao ?? icao,
    country: prev?.country || first.flag?.toUpperCase() || '',
  };
}

/** Detail-page loader: resolves the airline info + fetches its live flights. */
export function useAirlineDetail(icao: string) {
  const local = useMemo(() => {
    const a = resolveAirline(`${icao}000`);
    return a ? ({ name: a.name, iata: a.iata, icao: a.icao, country: a.country } satisfies AirlineData) : null;
  }, [icao]);

  const [airline, setAirline] = useState<AirlineData | null>(local);
  const [apiFlights, setApiFlights] = useState<AirlineFlight[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(API.flights(`airline_icao=${icao}&_fields=${AIRLINE_FIELDS}`));
        const data = await res.json();
        const first = Array.isArray(data.response) && data.response.length > 0 ? data.response[0] : null;
        if (first) setAirline((prev) => mergeAirline(prev, local, first, icao));
      } catch {
        setAirline({ name: icao, iata: '', icao, country: '' });
      }
    })();
  }, [icao, local]);

  useEffect(() => {
    if (!airline) return;
    (async () => {
      try {
        const res = await apiFetch(API.flights(`airline_icao=${icao}&_fields=${FLIGHT_FIELDS}`));
        const data = await res.json();
        if (Array.isArray(data.response)) setApiFlights(data.response.map(mapAirlineFlight));
      } catch {
        /* ignore — fallback is live store data */
      }
    })();
  }, [airline, icao]);

  return { airline, apiFlights };
}
