import type { AirportScheduleFlight } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Map a raw Airlabs schedule entry to our AirportScheduleFlight type. */
export function mapScheduleFlight(f: any): AirportScheduleFlight {
  return {
    flightIcao: f.flight_icao ?? '',
    flightIata: f.flight_iata ?? '',
    airlineIata: f.airline_iata ?? '',
    depIata: f.dep_iata ?? '',
    arrIata: f.arr_iata ?? '',
    status: f.status ?? undefined,
    depTime: f.dep_time ?? f.dep_estimated ?? undefined,
    arrTime: f.arr_time ?? f.arr_estimated ?? undefined,
    depDelayed: f.delayed != null ? Number(f.delayed) : undefined,
    arrDelayed: f.arr_delayed != null ? Number(f.arr_delayed) : undefined,
    depTerminal: f.dep_terminal ?? undefined,
    arrTerminal: f.arr_terminal ?? undefined,
    depGate: f.dep_gate ?? undefined,
    arrGate: f.arr_gate ?? undefined,
    csAirlineIata: f.cs_airline_iata ?? undefined,
    csFlightIata: f.cs_flight_iata ?? undefined,
    // cs_flight_number is sometimes a number, sometimes a string in the wild.
    csFlightNumber: f.cs_flight_number != null ? String(f.cs_flight_number) : undefined,
  };
}

/** Extract HH:MM from a schedule time string. */
export function formatScheduleTime(time: string | undefined): string {
  if (!time) return '--:--';
  const match = time.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : time.slice(0, 5);
}
