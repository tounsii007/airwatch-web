'use client';

import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { getWeatherEmoji, getWeatherLabel } from '@/lib/utils';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { DashboardAirport } from '@/app/(public)/dashboard/dashboardData';

interface Props {
  airport: DashboardAirport;
  language: AppLanguage;
  onRemove: (iata: string) => void;
}

function FlagBadge({ country }: { country?: string }) {
  if (!country) return null;
  return (
    <Image
      src={`/flags/${country}.svg`}
      alt=""
      width={20}
      height={14}
      className="rounded-sm shadow shrink-0"
      unoptimized
    />
  );
}

function WeatherBadge({
  weather,
  language,
}: {
  weather: DashboardAirport['weather'];
  language: AppLanguage;
}) {
  if (!weather) return null;
  const temp = weather.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : '';
  // Plain-language fallback so screen readers don't read "sun emoji 18".
  const label = getWeatherLabel(weather.weatherCode, language);
  return (
    <span
      className="t-label inline-flex items-center gap-1"
      aria-label={`${label}${temp ? `, ${temp}` : ''}`}
    >
      <span aria-hidden>{getWeatherEmoji(weather.weatherCode, weather.isDay)}</span>
      {temp && (
        <span className="t-mono text-[var(--text-primary)]">{temp}</span>
      )}
    </span>
  );
}

/** Header row for a dashboard airport card. */
export function AirportCardHeader({ airport, language, onRemove }: Props) {
  const fullLabel = `${airport.iata}${airport.name ? ` (${airport.name})` : ''}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={`/airports/${airport.iata}`}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
        aria-label={t('aria_open_airport_details', language).replace('{0}', fullLabel)}
      >
        <FlagBadge country={airport.country} />
        <span className="t-display t-mono font-bold text-[var(--primary)] tracking-wider">
          {airport.iata}
        </span>
        {airport.name && (
          <span className="t-label text-[var(--text-secondary)] truncate">
            {airport.name}
          </span>
        )}
      </Link>
      <div className="flex items-center gap-3 shrink-0">
        <WeatherBadge weather={airport.weather} language={language} />
        <IconButton
          aria-label={t('aria_remove_airport_from_dashboard', language).replace('{0}', airport.iata)}
          onClick={() => onRemove(airport.iata)}
          variant="ghost"
          size="sm"
        >
          <X size={14} className="text-[var(--text-muted)]" aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
