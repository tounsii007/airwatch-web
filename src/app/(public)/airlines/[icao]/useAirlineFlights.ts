'use client';

import { useMemo } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { resolveAirline } from '@/lib/data/airlines';
import type { AirlineFlight } from '@/app/(public)/airlines/[icao]/airlineTypes';

function toIata(prefix: string, icaoCallsign: string): string {
  const num = icaoCallsign.slice(3);
  return prefix ? `${prefix}${num}` : icaoCallsign;
}

function deriveStatus(onGround: boolean, flightStatus?: string): string {
  return flightStatus ?? (onGround ? 'landed' : 'en-route');
}

/** Fall back to deriving flights from the live store when the API returns none. */
function fromLiveStore(icao: string, aircraftMap: ReadonlyMap<string, { callsign?: string; flightStatus?: string; onGround: boolean }>): AirlineFlight[] {
  const airlineInfo = resolveAirline(icao + '000');
  const prefix = airlineInfo?.iata ?? '';
  const out: AirlineFlight[] = [];
  aircraftMap.forEach((ac) => {
    const cs = ac.callsign ?? '';
    if (!cs.startsWith(icao)) return;
    out.push({
      flightIcao: cs,
      flightIata: toIata(prefix, cs),
      depIata: '',
      arrIata: '',
      aircraftIcao: '',
      status: deriveStatus(ac.onGround, ac.flightStatus),
    });
  });
  return out;
}

/** API results preferred; otherwise derive from live aircraft store. */
export function useAirlineFlights(icao: string, apiFlights: readonly AirlineFlight[]): AirlineFlight[] {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  return useMemo(() => {
    if (apiFlights.length > 0) return [...apiFlights];
    return fromLiveStore(icao, aircraftMap);
  }, [apiFlights, aircraftMap, icao]);
}
