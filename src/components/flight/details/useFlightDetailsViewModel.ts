import { useMemo } from 'react';
import { airportCity, airportCountry, airportCoords } from '@/lib/data/airports';
import { resolveAirline } from '@/lib/data/airlines';
import { codeToCountryName, countryToCode, localizeCountry } from '@/lib/data/country-translations';
import { haversineDistance } from '@/lib/utils';
import type { AircraftMetadata, AppLanguage, FlightRouteInfo, AircraftState } from '@/lib/types';

export function useFlightDetailsViewModel({
  details,
  language,
  selectedAircraft,
}: {
  details: { metadata: AircraftMetadata | null; photoUrl: string | null; routeInfo: FlightRouteInfo | null };
  language: AppLanguage;
  selectedAircraft: AircraftState | null;
}) {
  return useMemo(() => {
    if (!selectedAircraft) {
      return null;
    }

    const routeInfo = details.routeInfo;
    const depIata = routeInfo?.departureAirport || selectedAircraft.depIata;
    const arrIata = routeInfo?.arrivalAirport || selectedAircraft.arrIata;
    const airlineInfo = selectedAircraft.callsign ? resolveAirline(selectedAircraft.callsign) : undefined;
    const airlineIata = airlineInfo?.iata || routeInfo?.operatorIata;
    const displayCallsign = airlineIata && selectedAircraft.callsign
      ? `${airlineIata}${selectedAircraft.callsign.slice(3)}`
      : selectedAircraft.callsign;

    const depCntryRaw = routeInfo?.depCountry || (depIata ? airportCountry(depIata) : undefined);
    const arrCntryRaw = routeInfo?.arrCountry || (arrIata ? airportCountry(arrIata) : undefined);
    const depCountry = depCntryRaw && depCntryRaw.length === 2 ? localizeCountry(codeToCountryName(depCntryRaw), language) : depCntryRaw;
    const arrCountry = arrCntryRaw && arrCntryRaw.length === 2 ? localizeCountry(codeToCountryName(arrCntryRaw), language) : arrCntryRaw;
    const depCity = routeInfo?.depCity || (depIata ? airportCity(depIata) : undefined);
    const arrCity = routeInfo?.arrCity || (arrIata ? airportCity(arrIata) : undefined);

    let co2Estimate: { co2Kg: number; distKm: number } | null = null;
    if (depIata && arrIata) {
      const dep = airportCoords(depIata);
      const arr = airportCoords(arrIata);
      if (dep && arr) {
        const distKm = haversineDistance(dep.lat, dep.lon, arr.lat, arr.lon);
        const category = selectedAircraft.category ?? 4;
        const factor = category === 6 ? 0.08 : category === 3 ? 0.12 : category === 2 ? 0.15 : 0.10;
        co2Estimate = { distKm: Math.round(distKm), co2Kg: Math.round(distKm * factor) };
      }
    }

    return {
      airlineIata,
      airlineInfo,
      arrCity,
      arrCode: arrCntryRaw ? countryToCode(arrCntryRaw) : '',
      arrCountry,
      arrIata,
      co2Estimate,
      depCity,
      depCode: depCntryRaw ? countryToCode(depCntryRaw) : '',
      depCountry,
      depIata,
      displayCallsign,
      metadata: details.metadata,
      photoUrl: details.photoUrl,
      routeInfo,
    };
  }, [details, language, selectedAircraft]);
}
