/** Airline header data + a flight row shape used on the detail page. */

export interface AirlineData {
  name: string;
  iata: string;
  icao: string;
  country: string;
}

export interface AirlineFlight {
  flightIcao: string;
  flightIata: string;
  depIata: string;
  arrIata: string;
  aircraftIcao: string;
  status: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapAirlineFlight(f: any): AirlineFlight {
  return {
    flightIcao: f.flight_icao ?? '',
    flightIata: f.flight_iata ?? f.flight_icao ?? '',
    depIata: f.dep_iata ?? '',
    arrIata: f.arr_iata ?? '',
    aircraftIcao: f.aircraft_icao ?? '',
    status: f.status ?? 'en-route',
  };
}
