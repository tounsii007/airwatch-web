'use client';

import { Cloud, Droplets, Wind } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { getWeatherEmoji, getWeatherLabel } from '@/lib/utils';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage, WeatherInfo } from '@/lib/types';

interface Props {
  weather: WeatherInfo | null;
  language: AppLanguage;
}

function Title({ language }: { language: AppLanguage }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Cloud size={14} className="text-[var(--info)]" />
      <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
        {t('weather_label', language)}
      </span>
    </div>
  );
}

function TempLine({ weather }: { weather: WeatherInfo }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-2xl">{getWeatherEmoji(weather.weatherCode, weather.isDay)}</span>
      <span className="text-xl font-[var(--font-heading)] font-bold text-[var(--text-primary)]">
        {weather.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : '--'}
      </span>
    </div>
  );
}

function MetaRow({ weather }: { weather: WeatherInfo }) {
  const wind = weather.windSpeedKmh != null ? `${Math.round(weather.windSpeedKmh)} km/h` : '--';
  const hum = weather.humidity != null ? `${weather.humidity}%` : '--';
  return (
    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
      <span className="flex items-center gap-1"><Wind size={10} />{wind}</span>
      <span className="flex items-center gap-1"><Droplets size={10} />{hum}</span>
    </div>
  );
}

/** Weather card used on the airport detail page. */
export function WeatherPanel({ weather, language }: Props) {
  return (
    <GlassPanel className="p-3">
      <Title language={language} />
      {weather ? (
        <div>
          <TempLine weather={weather} />
          <p className="text-xs text-[var(--text-secondary)] font-[var(--font-body)] mt-1">
            {getWeatherLabel(weather.weatherCode, language)}
          </p>
          <MetaRow weather={weather} />
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)]">{t('loading', language)}</p>
      )}
    </GlassPanel>
  );
}
