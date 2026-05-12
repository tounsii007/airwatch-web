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
    `${PROXY_BASE_URL}/airlabs/schedules?${departures ? 'dep_iata' : 'arr_iata'}=${iata}`,
  scheduleByFlight: (params: { flightIcao?: string; flightIata?: string }) => {
    if (params.flightIata) return `${PROXY_BASE_URL}/airlabs/schedules?flight_iata=${params.flightIata}`;
    return `${PROXY_BASE_URL}/airlabs/schedules?flight_icao=${params.flightIcao}`;
  },
  airport: (iata: string) => `${PROXY_BASE_URL}/airlabs/airports?iata_code=${iata}`,
  weather: (lat: number, lon: number) => `${PROXY_BASE_URL}/weather/${lat.toFixed(2)}/${lon.toFixed(2)}`,
  aircraftMeta: (hex: string) => `${PROXY_BASE_URL}/hexdb/${hex}`,
  aircraftPhoto: (hex: string) => `${PROXY_BASE_URL}/photo/${hex}`,
  // Direct CDN — pics.avs.io serves airline logos with months-long
  // cache headers. Server proxy removed; CSP img-src allowlists the host.
  airlineLogo: (iata: string) => `https://pics.avs.io/200/80/${iata.toUpperCase()}.png`,
  imageProxy: (url: string) => `${PROXY_BASE_URL}/img/${encodeURIComponent(url)}`,
  turbulence: () => `${PROXY_BASE_URL}/turbulence`,
};

export const COLORS = {
  primary: '#7A9ABF',
  accent: '#D4A574',
  background: '#0A1628',
  surface: '#0F1D32',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  altitudeLow: '#4ADE80',
  altitudeMed: '#FBBF24',
  altitudeHigh: '#E879A8',
  ground: '#6B7280',
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
