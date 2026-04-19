export interface WeatherLabelSet {
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

export const WEATHER_EN: WeatherLabelSet = {
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

export const WEATHER_LABELS: Record<string, WeatherLabelSet> = {
  en: WEATHER_EN,
  de: {
    clear: 'Klar',
    partly_cloudy: 'Teilweise bewölkt',
    fog: 'Nebel',
    drizzle: 'Nieselregen',
    rain: 'Regen',
    snow: 'Schnee',
    rain_showers: 'Regenschauer',
    snow_showers: 'Schneeschauer',
    thunderstorm: 'Gewitter',
    cloudy: 'Bewölkt',
  },
  fr: {
    clear: 'Dégagé',
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
