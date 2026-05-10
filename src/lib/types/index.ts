export interface AircraftState {
  icao24: string;
  callsign?: string;
  originCountry?: string;
  latitude?: number;
  longitude?: number;
  baroAltitude?: number;
  onGround: boolean;
  velocity?: number;
  trueTrack?: number;
  verticalRate?: number;
  geoAltitude?: number;
  squawk?: string;
  category: number;
  flightStatus?: string;
  lastUpdate: number;
  // Route data from bulk /flights response
  depIata?: string;
  arrIata?: string;
  airlineIcao?: string;
}

export interface AirlineInfo {
  icao: string;
  iata: string;
  name: string;
  country: string;
}

export interface AirportEntry {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface FlightRouteInfo {
  callsign: string;
  departureAirport: string;
  arrivalAirport: string;
  operatorIata?: string;
  flightNumber?: string;
  status?: string;
  scheduledDep?: string;
  scheduledArr?: string;
  depCity?: string;
  arrCity?: string;
  depCountry?: string;
  arrCountry?: string;
  depTerminal?: string;
  arrTerminal?: string;
  depGate?: string;
  arrGate?: string;
  arrBaggage?: string;
  depDelayed?: number;
  arrDelayed?: number;
  duration?: number;
}

export interface AircraftMetadata {
  typecode?: string;
  model?: string;
  manufacturer?: string;
  operatorName?: string;
  registration?: string;
  engine?: string;
  engineCount?: string;
  built?: number;
  age?: number;
  msn?: string;
}

export interface WeatherInfo {
  temperatureC?: number;
  windSpeedKmh?: number;
  weatherCode?: number;
  isDay: boolean;
  humidity?: number;
}

export interface AirportScheduleFlight {
  flightIcao: string;
  flightIata: string;
  airlineIata: string;
  depIata: string;
  arrIata: string;
  status?: string;
  depTime?: string;
  arrTime?: string;
  depDelayed?: number;
  arrDelayed?: number;
  depTerminal?: string;
  arrTerminal?: string;
  depGate?: string;
  arrGate?: string;
}

export interface FavoriteItem {
  id: string;
  type: 'flight' | 'airline' | 'airport';
  label: string;
  subtitle?: string;
  addedAt: number;
  pinned?: boolean;
  /** Extra metadata for saved flights */
  airlineName?: string;
  airlineIata?: string;
  depIata?: string;
  arrIata?: string;
  originCountry?: string;
}

export type AltitudeFilter = 'all' | 'low' | 'medium' | 'high' | 'ground';
export type CategoryFilter = 'all' | 'jets' | 'helicopters' | 'cargo' | 'light' | 'ground';
export type SpeedUnit = 'knots' | 'kmh' | 'mph';
export type AltitudeUnit = 'feet' | 'meters';
export type AppLanguage = 'en' | 'de' | 'fr' | 'es' | 'it';
export type AppTheme = 'dark' | 'light' | 'system';
export type MapStyle = 'dark' | 'satellite' | 'streets' | 'terrain' | 'night' | 'toner';
