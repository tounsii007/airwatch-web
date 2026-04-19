'use client';

import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import { getWeatherEmoji } from '@/lib/utils';
import type { DashboardAirport } from '@/app/dashboard/dashboardData';

interface Props {
  airport: DashboardAirport;
  onRemove: (iata: string) => void;
}

function FlagBadge({ country }: { country?: string }) {
  if (!country) return null;
  return <Image src={`/flags/${country}.svg`} alt={country} width={20} height={14} className="rounded-sm shadow" />;
}

function WeatherBadge({ weather }: { weather: DashboardAirport['weather'] }) {
  if (!weather) return null;
  const temp = weather.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : '';
  return (
    <span className="text-sm">
      {getWeatherEmoji(weather.weatherCode, weather.isDay)}{' '}
      <span className="text-xs font-[var(--font-heading)] text-[var(--text-primary)]">{temp}</span>
    </span>
  );
}

/** Header row for a dashboard airport card. */
export function AirportCardHeader({ airport, onRemove }: Props) {
  return (
    <div className="flex items-center justify-between">
      <Link href={`/airports/${airport.iata}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <FlagBadge country={airport.country} />
        <span className="neon-text font-[var(--font-heading)] font-bold text-lg text-[var(--primary)]">{airport.iata}</span>
        {airport.name && <span className="text-xs text-[var(--text-secondary)] font-[var(--font-body)]">{airport.name}</span>}
      </Link>
      <div className="flex items-center gap-2">
        <WeatherBadge weather={airport.weather} />
        <button
          onClick={() => onRemove(airport.iata)}
          className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Remove airport"
        >
          <X size={14} className="text-[var(--text-muted)]" />
        </button>
      </div>
    </div>
  );
}
