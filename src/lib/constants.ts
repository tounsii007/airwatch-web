/** All API calls go through Next.js rewrites → no CORS, works on any port */
export const PROXY_BASE_URL = '/api/proxy';

export const API = {
  flights: (query = '') => `${PROXY_BASE_URL}/airlabs/flights${query ? '?' + query : ''}`,
  /**
   * Live flights inside a geographic viewport. {@code bbox} is a
   * comma-separated {@code lat1,lng1,lat2,lng2} string. The proxy
   * passes through to Airlabs's server-side bbox filter, so the
   * response is already trimmed to the visible chunk — no client
   * filtering needed.
   */
  flightsByBbox: (bbox: string, fields?: string) => {
    const f = fields ? `&_fields=${fields}` : '';
    return `${PROXY_BASE_URL}/airlabs/flights?bbox=${encodeURIComponent(bbox)}${f}`;
  },
  /**
   * Live flights filtered by aircraft registration country flag (1-3
   * letters, e.g. {@code FR} for French-registered tails). Useful for
   * country-themed views or analytics drill-downs.
   */
  flightsByFlag: (flag: string, fields?: string) => {
    const f = fields ? `&_fields=${fields}` : '';
    return `${PROXY_BASE_URL}/airlabs/flights?flag=${flag.toUpperCase()}${f}`;
  },
  flight: (params: { flightIcao?: string; flightIata?: string }) => {
    if (params.flightIata) return `${PROXY_BASE_URL}/airlabs/flight?flight_iata=${params.flightIata}`;
    return `${PROXY_BASE_URL}/airlabs/flight?flight_icao=${params.flightIcao}`;
  },
  routes: (params: { flightIcao?: string; flightIata?: string }) => {
    if (params.flightIata) return `${PROXY_BASE_URL}/airlabs/routes?flight_iata=${params.flightIata}`;
    return `${PROXY_BASE_URL}/airlabs/routes?flight_icao=${params.flightIcao}`;
  },
  schedules: (iata: string, departures = true) =>
    `${PROXY_BASE_URL}/airlabs/schedules?${departures ? 'dep_iata' : 'arr_iata'}=${encodeURIComponent(iata)}`,
  scheduleByFlight: (params: { flightIcao?: string; flightIata?: string }) => {
    if (params.flightIata) return `${PROXY_BASE_URL}/airlabs/schedules?flight_iata=${params.flightIata}`;
    return `${PROXY_BASE_URL}/airlabs/schedules?flight_icao=${params.flightIcao}`;
  },
  airport: (iata: string) => `${PROXY_BASE_URL}/airlabs/airports?iata_code=${encodeURIComponent(iata)}`,
  /**
   * Airports within {@code distanceKm} km of (lat, lng). Powers the
   * "airports near me" feature on the airports page — the browser supplies
   * coordinates from {@code navigator.geolocation}, this URL fetches the
   * radius slice. Default 100 km matches the backend default.
   */
  airportsNearby: (lat: number, lng: number, distanceKm = 100) =>
    `${PROXY_BASE_URL}/airlabs/airports/nearby?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&distance=${distanceKm}`,

  // ─── Reference / Stammdaten endpoints ───
  /** Airline catalogue. All filters optional — uppercased before send. */
  airlines: (filters: { country?: string; iata?: string; icao?: string } = {}) => {
    const q = new URLSearchParams();
    if (filters.country) q.set('country_code', filters.country.toUpperCase());
    if (filters.iata) q.set('iata_code', filters.iata.toUpperCase());
    if (filters.icao) q.set('icao_code', filters.icao.toUpperCase());
    const tail = q.toString();
    return `${PROXY_BASE_URL}/airlabs/airlines${tail ? '?' + tail : ''}`;
  },
  /** Cities catalogue, optionally filtered by ISO-3166 alpha-2 country. */
  cities: (country?: string) =>
    `${PROXY_BASE_URL}/airlabs/cities${country ? '?country_code=' + country.toUpperCase() : ''}`,
  /** Country catalogue, optionally narrowed to one entry. */
  countries: (country?: string) =>
    `${PROXY_BASE_URL}/airlabs/countries${country ? '?country_code=' + country.toUpperCase() : ''}`,
  /** Star Alliance / SkyTeam / oneworld membership lookup. */
  aviationCodes: () => `${PROXY_BASE_URL}/airlabs/aviation_codes`,
  /** Air-travel taxes per country. */
  taxes: (country?: string) =>
    `${PROXY_BASE_URL}/airlabs/taxes${country ? '?country_code=' + country.toUpperCase() : ''}`,
  /** Timezone catalogue with UTC offsets. */
  timezones: () => `${PROXY_BASE_URL}/airlabs/timezones`,

  // ─── Per-resource lookups + search ───
  /** Aircraft details by tail registration OR Mode-S 24-bit hex. */
  aircraft: (params: { reg?: string; hex?: string }) => {
    const q = new URLSearchParams();
    if (params.reg) q.set('reg_number', params.reg.toUpperCase());
    else if (params.hex) q.set('hex', params.hex.toUpperCase());
    return `${PROXY_BASE_URL}/airlabs/aircraft?${q.toString()}`;
  },
  /** Airline fleet roster by IATA code. */
  fleets: (airlineIata: string) =>
    `${PROXY_BASE_URL}/airlabs/fleets?airline_iata=${airlineIata.toUpperCase()}`,
  /** Wikipedia summary for an airline (IATA-2) OR airport (IATA-3). */
  wiki: (params: { airlineIata?: string; airportIata?: string }) => {
    const q = new URLSearchParams();
    if (params.airlineIata) q.set('airline_iata', params.airlineIata.toUpperCase());
    else if (params.airportIata) q.set('airport_iata', params.airportIata.toUpperCase());
    return `${PROXY_BASE_URL}/airlabs/wiki?${q.toString()}`;
  },
  /** Autocomplete typeahead across airports + airlines + cities. */
  suggest: (q: string) =>
    `${PROXY_BASE_URL}/airlabs/suggest?q=${encodeURIComponent(q)}`,
  /** Generic location search — geographic entities only. */
  locations: (q: string) =>
    `${PROXY_BASE_URL}/airlabs/locations?q=${encodeURIComponent(q)}`,
  /**
   * Currently-delayed flights. {@code type} is "departures" | "arrivals".
   * Optional filters narrow to one airport or airline.
   */
  delays: (type: 'departures' | 'arrivals',
           filters: { depIata?: string; arrIata?: string; airlineIata?: string } = {}) => {
    const q = new URLSearchParams({ type });
    if (filters.depIata) q.set('dep_iata', filters.depIata.toUpperCase());
    if (filters.arrIata) q.set('arr_iata', filters.arrIata.toUpperCase());
    if (filters.airlineIata) q.set('airline_iata', filters.airlineIata.toUpperCase());
    return `${PROXY_BASE_URL}/airlabs/delays?${q.toString()}`;
  },
  /** Live cargo flights — same filter shape as flights, cargo-only upstream. */
  cargos: (filters: { fields?: string; airlineIcao?: string; bbox?: string; flag?: string } = {}) => {
    const q = new URLSearchParams();
    if (filters.fields) q.set('_fields', filters.fields);
    if (filters.airlineIcao) q.set('airline_icao', filters.airlineIcao.toUpperCase());
    if (filters.bbox) q.set('bbox', filters.bbox);
    if (filters.flag) q.set('flag', filters.flag.toUpperCase());
    const tail = q.toString();
    return `${PROXY_BASE_URL}/airlabs/cargos${tail ? '?' + tail : ''}`;
  },

  weather: (lat: number, lon: number) => `${PROXY_BASE_URL}/weather/${lat.toFixed(2)}/${lon.toFixed(2)}`,
  aircraftMeta: (hex: string) => `${PROXY_BASE_URL}/hexdb/${hex}`,
  aircraftPhoto: (hex: string) => `${PROXY_BASE_URL}/photo/${hex}`,
  // Direct CDN — pics.avs.io serves airline logos with months-long
  // cache headers. Server proxy removed; CSP img-src allowlists the host.
  airlineLogo: (iata: string) => `https://pics.avs.io/200/80/${iata.toUpperCase()}.png`,
  imageProxy: (url: string) => `${PROXY_BASE_URL}/img/${encodeURIComponent(url)}`,
  turbulence: () => `${PROXY_BASE_URL}/turbulence`,
};

// JS colour palette for canvas/SVG-drawn UI (map markers, route trails,
// LiveTicker, panel altitude tint). Kept in lock-step with the CSS design
// tokens in globals.css `:root` — markers are drawn programmatically, so they
// can't read CSS vars; update both when the palette changes. Cyan = high,
// mint = low, amber = mid.
export const COLORS = {
  primary: '#00D4FF',
  accent: '#38F2A3',
  background: '#06111F',
  surface: '#081A2F',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#EF4444',
  info: '#60A5FA',
  altitudeLow: '#38F2A3',
  altitudeMed: '#FBBF24',
  altitudeHigh: '#00D4FF',
  ground: '#6B7F99',
  selected: '#E0F0FF',
};

export const CONVERSION = {
  metersToFeet: 3.28084,
  msToKnots: 1.94384,
  msToKmh: 3.6,
  msToMph: 2.23694,
  /** 1 m/s vertical speed = 196.85 ft/min. */
  msToFpm: 196.85,
};

export const CONFIG = {
  flightUpdateInterval: 5 * 60 * 1000, // 5 minutes
  searchDebounce: 300,
  defaultLat: 48.5,
  defaultLon: 9.0,
  defaultZoom: 5.5,
  minZoom: 2,
  maxZoom: 18,
  altitudeLowMax: 10000,
  altitudeMedMax: 30000,
};
