/**
 * Centralised key derivation for favorite-store ids.
 *
 * Every favourite lives under a typed key (`flight-{icao24}`,
 * `airline-{icao}`, `airport-{iata}`). The string template was inlined
 * in 3+ call sites before this; a typo in any of them would silently
 * make `isFavorite()` return false. One source of truth here keeps the
 * keys consistent and lets tests assert on the shape directly.
 *
 *   favoriteId.airline('DLH')      // 'airline-DLH'
 *   favoriteId.airport('FRA')      // 'airport-FRA'
 *   favoriteId.flight('a1b2c3')    // 'flight-a1b2c3'
 *
 * IATA / ICAO are normalised to upper-case to match the favourites
 * store; icao24 transponder hex stays lower-case (matches the OpenSky
 * convention the rest of the codebase already uses).
 */
export const favoriteId = {
  airline: (icao: string): string => `airline-${icao.toUpperCase()}`,
  airport: (iata: string): string => `airport-${iata.toUpperCase()}`,
  flight: (icao24: string): string => `flight-${icao24.toLowerCase()}`,
} as const;
