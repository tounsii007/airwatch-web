import { WEATHER_EN, WEATHER_LABELS, type WeatherLabelSet } from '@/lib/utils/weatherLabels';

/** Return an emoji for the WMO weather code (Open-Meteo codes 0–99). */
export function getWeatherEmoji(code: number | undefined, isDay: boolean): string {
  if (code == null) return '\u{1F321}\u{FE0F}'; // thermometer
  if (code === 0) return isDay ? '\u{2600}\u{FE0F}' : '\u{1F319}'; // sun / moon
  if (code <= 3) return isDay ? '\u{26C5}' : '\u{2601}\u{FE0F}'; // partly cloudy / cloud
  if (code <= 49) return '\u{1F32B}\u{FE0F}'; // fog
  if (code <= 59) return '\u{1F326}\u{FE0F}'; // drizzle
  if (code <= 69) return '\u{1F327}\u{FE0F}'; // rain
  if (code <= 79) return '\u{1F328}\u{FE0F}'; // snow
  if (code <= 82) return '\u{1F327}\u{FE0F}'; // rain showers
  if (code <= 86) return '\u{1F328}\u{FE0F}'; // snow showers
  if (code >= 95) return '\u{26C8}\u{FE0F}'; // thunderstorm
  return '\u{2601}\u{FE0F}'; // cloudy
}

function labelKey(code: number): keyof WeatherLabelSet {
  if (code === 0) return 'clear';
  if (code <= 3) return 'partly_cloudy';
  if (code <= 49) return 'fog';
  if (code <= 59) return 'drizzle';
  if (code <= 69) return 'rain';
  if (code <= 79) return 'snow';
  if (code <= 82) return 'rain_showers';
  if (code <= 86) return 'snow_showers';
  if (code >= 95) return 'thunderstorm';
  return 'cloudy';
}

/** Localized label for the WMO weather code. Falls back to English. */
export function getWeatherLabel(code: number | undefined, lang: string): string {
  if (code == null) return '';
  const labels = WEATHER_LABELS[lang] ?? WEATHER_EN;
  return labels[labelKey(code)];
}
