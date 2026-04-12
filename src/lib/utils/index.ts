import type { AltitudeUnit, SpeedUnit } from '@/lib/types';
import { COLORS, CONFIG, CONVERSION } from '@/lib/constants';

/**
 * Format altitude value with the user's preferred unit.
 * Input is meters (as returned by the API / stored in AircraftState).
 */
export function formatAltitude(meters: number | undefined, unit: AltitudeUnit): string {
  if (meters == null || meters === 0) return '--';
  switch (unit) {
    case 'feet': {
      const ft = meters * CONVERSION.metersToFeet;
      if (ft < 1000) return `${Math.round(ft)} ft`;
      return `${(ft / 1000).toFixed(1)}k ft`;
    }
    case 'meters': {
      if (meters < 1000) return `${Math.round(meters)} m`;
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }
}

/**
 * Format speed value with the user's preferred unit.
 * Input is m/s (as stored in AircraftState after km/h -> m/s conversion).
 */
export function formatSpeed(ms: number | undefined, unit: SpeedUnit): string {
  if (ms == null || ms === 0) return '--';
  switch (unit) {
    case 'knots':
      return `${Math.round(ms * CONVERSION.msToKnots)} kts`;
    case 'kmh':
      return `${Math.round(ms * CONVERSION.msToKmh)} km/h`;
    case 'mph':
      return `${Math.round(ms * CONVERSION.msToMph)} mph`;
  }
}

/**
 * Return the hex color string for an aircraft's altitude band.
 * Thresholds are in feet (matching CONFIG.altitudeLowMax / altitudeMedMax).
 */
export function getAltitudeColor(meters: number | undefined, onGround: boolean): string {
  if (onGround) return COLORS.ground;
  if (meters == null || meters === 0) return COLORS.primary; // no data → blue instead of grey
  const feet = meters * CONVERSION.metersToFeet;
  if (feet < 100) return COLORS.ground;
  if (feet < CONFIG.altitudeLowMax) return COLORS.altitudeLow;
  if (feet < CONFIG.altitudeMedMax) return COLORS.altitudeMed;
  return COLORS.altitudeHigh;
}

/**
 * Return the color for a flight status string.
 */
export function getStatusColor(status: string | undefined): string {
  switch (status?.toLowerCase()) {
    case 'en-route':
    case 'active':
      return COLORS.success;
    case 'landed':
      return COLORS.primary;
    case 'scheduled':
      return COLORS.warning;
    case 'cancelled':
      return COLORS.error;
    default:
      return COLORS.ground;
  }
}

/**
 * Return a short English label for a flight status string.
 */
export function getStatusLabel(status: string | undefined): string {
  switch (status?.toLowerCase()) {
    case 'en-route':
    case 'active':
      return 'LIVE';
    case 'landed':
      return 'LANDED';
    case 'scheduled':
      return 'SCHED';
    case 'cancelled':
      return 'CNCL';
    default:
      return status?.toUpperCase() ?? '';
  }
}

/**
 * Calculate the great-circle distance between two lat/lon pairs using
 * the Haversine formula. Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371.0; // Earth radius in km
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Return an emoji representing the WMO weather code.
 * Uses Open-Meteo WMO weather interpretation codes (0-99).
 */
export function getWeatherEmoji(code: number | undefined, isDay: boolean): string {
  if (code == null) return '\u{1F321}\u{FE0F}'; // thermometer
  if (code === 0) return isDay ? '\u{2600}\u{FE0F}' : '\u{1F319}'; // sun / moon
  if (code <= 3) return isDay ? '\u{26C5}' : '\u{2601}\u{FE0F}'; // partly cloudy / cloud
  if (code <= 49) return '\u{1F32B}\u{FE0F}'; // fog
  if (code <= 59) return '\u{1F326}\u{FE0F}'; // drizzle (sun behind rain cloud)
  if (code <= 69) return '\u{1F327}\u{FE0F}'; // rain
  if (code <= 79) return '\u{1F328}\u{FE0F}'; // snow
  if (code <= 82) return '\u{1F327}\u{FE0F}'; // rain showers
  if (code <= 86) return '\u{1F328}\u{FE0F}'; // snow showers
  if (code >= 95) return '\u{26C8}\u{FE0F}'; // thunderstorm
  return '\u{2601}\u{FE0F}'; // cloudy
}

interface WeatherLabelSet {
  clear: string;
  partly_cloudy: string;
  fog: string;
  drizzle: string;
  rain: string;
  snow: string;
  rain_showers: string;
  snow_showers: string;
  thunderstorm: string;
  cloudy: string;
}

const WEATHER_EN: WeatherLabelSet = {
  clear: 'Clear',
  partly_cloudy: 'Partly cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  rain_showers: 'Rain showers',
  snow_showers: 'Snow showers',
  thunderstorm: 'Thunderstorm',
  cloudy: 'Cloudy',
};

const WEATHER_LABELS: Record<string, WeatherLabelSet> = {
  en: WEATHER_EN,
  de: {
    clear: 'Klar',
    partly_cloudy: 'Teilweise bew\u00F6lkt',
    fog: 'Nebel',
    drizzle: 'Nieselregen',
    rain: 'Regen',
    snow: 'Schnee',
    rain_showers: 'Regenschauer',
    snow_showers: 'Schneeschauer',
    thunderstorm: 'Gewitter',
    cloudy: 'Bew\u00F6lkt',
  },
  fr: {
    clear: 'D\u00E9gag\u00E9',
    partly_cloudy: 'Partiellement nuageux',
    fog: 'Brouillard',
    drizzle: 'Bruine',
    rain: 'Pluie',
    snow: 'Neige',
    rain_showers: 'Averses',
    snow_showers: 'Averses de neige',
    thunderstorm: 'Orage',
    cloudy: 'Nuageux',
  },
};

/**
 * Return a localized label for the WMO weather code.
 * Falls back to English if the language is not supported.
 */
export function getWeatherLabel(code: number | undefined, lang: string): string {
  if (code == null) return '';
  const labels: WeatherLabelSet = WEATHER_LABELS[lang] ?? WEATHER_EN;

  if (code === 0) return labels.clear;
  if (code <= 3) return labels.partly_cloudy;
  if (code <= 49) return labels.fog;
  if (code <= 59) return labels.drizzle;
  if (code <= 69) return labels.rain;
  if (code <= 79) return labels.snow;
  if (code <= 82) return labels.rain_showers;
  if (code <= 86) return labels.snow_showers;
  if (code >= 95) return labels.thunderstorm;
  return labels.cloudy;
}
