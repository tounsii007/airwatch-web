/**
 * Centralised key derivation for favorite-store ids.
 *
 * Every favourite lives under a key derived from the entity's natural
 * identifier. The string template was inlined in 3+ call sites before
 * this; a typo in any of them would silently make `isFavorite()`
 * return false. One source of truth here keeps the keys consistent
 * and lets tests assert on the shape directly.
 *
 *   favoriteId.airline('DLH')      // 'airline-DLH'
 *   favoriteId.airport('FRA')      // 'airport-FRA'
 *   favoriteId.flight('a1b2c3')    // 'a1b2c3'  (raw icao24 — see note)
 *
 * <h3>Why flight ids aren't prefixed</h3>
 * ICAO24 transponder addresses are globally unique 6-char hex strings
 * with no collision risk against IATA / ICAO airline codes. The
 * favourites store has used the raw `icao24` as the flight key since
 * day 1; persistent user data in localStorage relies on this format,
 * so we keep it un-prefixed to avoid an awkward migration.
 *
 * Airline / airport keys ARE prefixed because their natural ids (3-letter
 * codes) DO collide — `FRA` could be an airline ICAO or an airport IATA.
 *
 * IATA / ICAO are normalised to upper-case to match the favourites
 * store; icao24 stays lower-case (OpenSky convention).
 */
export const favoriteId = {
  airline: (icao: string): string => `airline-${icao.toUpperCase()}`,
  airport: (iata: string): string => `airport-${iata.toUpperCase()}`,
  flight: (icao24: string): string => icao24.toLowerCase(),
} as const;
