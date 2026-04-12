import { API } from '@/lib/constants';
import type { AircraftMetadata, FlightRouteInfo } from '@/lib/types';

export interface FlightDetailsData {
  metadata: AircraftMetadata | null;
  photoUrl: string | null;
  routeInfo: FlightRouteInfo | null;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown | null> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function fetchFlightDetails(
  icao24: string,
  callsign: string | undefined,
  signal: AbortSignal
): Promise<FlightDetailsData> {
  const trimmedCallsign = callsign?.trim();

  const [flightData, metadataData, photoData] = await Promise.allSettled([
    trimmedCallsign ? fetchJson(API.flight({ flightIcao: trimmedCallsign }), signal) : Promise.resolve(null),
    fetchJson(API.aircraftMeta(icao24), signal),
    fetchJson(API.aircraftPhoto(icao24), signal),
  ]);

  let routeInfo: FlightRouteInfo | null = null;
  const flight = flightData.status === 'fulfilled' ? (flightData.value as { response?: Record<string, unknown> } | null)?.response : null;
  if (flight) {
    routeInfo = {
      callsign: trimmedCallsign ?? '',
      departureAirport: String(flight.dep_iata ?? flight.dep_icao ?? '---'),
      arrivalAirport: String(flight.arr_iata ?? flight.arr_icao ?? '---'),
      operatorIata: flight.airline_iata as string | undefined,
      flightNumber: (flight.flight_iata ?? flight.flight_icao) as string | undefined,
      status: flight.status as string | undefined,
      depCity: flight.dep_city as string | undefined,
      arrCity: flight.arr_city as string | undefined,
      depCountry: flight.dep_country as string | undefined,
      arrCountry: flight.arr_country as string | undefined,
      depTerminal: flight.dep_terminal as string | undefined,
      arrTerminal: flight.arr_terminal as string | undefined,
      depGate: flight.dep_gate as string | undefined,
      arrGate: flight.arr_gate as string | undefined,
      arrBaggage: flight.arr_baggage as string | undefined,
      depDelayed: flight.dep_delayed as number | undefined,
      arrDelayed: flight.arr_delayed as number | undefined,
      duration: flight.duration as number | undefined,
      scheduledDep: flight.dep_time as string | undefined,
      scheduledArr: flight.arr_time as string | undefined,
    };
  } else if (trimmedCallsign) {
    try {
      const routeData = (await fetchJson(API.routes({ flightIcao: trimmedCallsign }), signal)) as
        | { response?: Record<string, unknown> | Record<string, unknown>[] }
        | null;
      const route = Array.isArray(routeData?.response) ? routeData.response[0] : routeData?.response;
      if (route) {
        routeInfo = {
          callsign: trimmedCallsign,
          departureAirport: String(route.dep_iata ?? '---'),
          arrivalAirport: String(route.arr_iata ?? '---'),
          duration: route.duration as number | undefined,
        };
      }
    } catch {
      routeInfo = null;
    }
  }

  const metadataResponse = metadataData.status === 'fulfilled' ? (metadataData.value as Record<string, unknown> | null) : null;
  const metadata =
    metadataResponse?.Registration
      ? {
          registration: metadataResponse.Registration as string | undefined,
          typecode: metadataResponse.ICAOTypeCode as string | undefined,
          manufacturer: metadataResponse.Manufacturer as string | undefined,
          model: metadataResponse.Type as string | undefined,
          operatorName: metadataResponse.RegisteredOwners as string | undefined,
        }
      : null;

  const photoResponse = photoData.status === 'fulfilled' ? (photoData.value as { photos?: Array<{ src?: string }> } | null) : null;
  const photoSource = photoResponse?.photos?.[0]?.src;

  return {
    routeInfo,
    metadata,
    photoUrl: photoSource ? API.imageProxy(photoSource) : null,
  };
}
