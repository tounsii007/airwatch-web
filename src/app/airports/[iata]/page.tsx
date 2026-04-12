'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { getWeatherEmoji, getWeatherLabel } from '@/lib/utils';
import { airportCity } from '@/lib/data/airports';
import { API } from '@/lib/constants';
import { apiFetch } from '@/lib/apiFetch';
import { t } from '@/lib/i18n/translations';
import type { AirportEntry, AirportScheduleFlight, WeatherInfo } from '@/lib/types';
import {
  ArrowLeft,
  ArrowUpDown,
  Clock,
  Cloud,
  Droplets,
  PlaneTakeoff,
  PlaneLanding,
  Star,
  Wind,
} from 'lucide-react';

type TabType = 'departures' | 'arrivals';

export default function AirportDetailPage() {
  const params = useParams();
  const iata = (params.iata as string).toUpperCase();
  const { language } = useSettingsStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const [airport, setAirport] = useState<AirportEntry | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('departures');
  const [departures, setDepartures] = useState<AirportScheduleFlight[]>([]);
  const [arrivals, setArrivals] = useState<AirportScheduleFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState<string>('');
  const [utcOffsetSec, setUtcOffsetSec] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'delay'>('time');

  // Single consolidated fetch — airport info + weather + schedules
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function loadAll() {
      setLoading(true);
      try {
        // Phase 1: Airport info
        const airportRes = await apiFetch(API.airport(iata), { signal });
        const airportData = await airportRes.json();
        let lat = 0, lon = 0;
        if (Array.isArray(airportData.response) && airportData.response.length > 0) {
          const a = airportData.response[0];
          lat = a.lat ?? 0;
          lon = a.lng ?? 0;
          if (!signal.aborted) {
            setAirport({
              icao: a.icao_code ?? '', iata: a.iata_code ?? iata,
              name: a.name ?? '', city: a.city ?? '',
              country: a.country_code?.toLowerCase() ?? '', lat, lon,
            });
          }
        }

        if (signal.aborted) return;

        // Phase 2: Weather + Schedules in parallel
        const [weatherRes, depRes, arrRes] = await Promise.all([
          lat && lon ? apiFetch(API.weather(lat, lon), { signal }) : null,
          apiFetch(API.schedules(iata, true), { signal }),
          apiFetch(API.schedules(iata, false), { signal }),
        ]);

        if (signal.aborted) return;

        if (weatherRes) {
          const wd = await weatherRes.json();
          if (wd.current) {
            setWeather({
              temperatureC: wd.current.temperature_2m,
              windSpeedKmh: wd.current.wind_speed_10m,
              weatherCode: wd.current.weather_code,
              isDay: wd.current.is_day === 1,
              humidity: wd.current.relative_humidity_2m,
            });
            if (wd.utc_offset_seconds != null) setUtcOffsetSec(wd.utc_offset_seconds);
          }
        }

        const depData = await depRes.json();
        const arrData = await arrRes.json();
        if (!signal.aborted) {
          if (Array.isArray(depData.response)) setDepartures(depData.response.map(mapScheduleFlight).slice(0, 50));
          if (Array.isArray(arrData.response)) setArrivals(arrData.response.map(mapScheduleFlight).slice(0, 50));
        }
      } catch {
        if (!signal.aborted) { /* ignore network errors */ }
      }
      if (!signal.aborted) setLoading(false);
    }

    void loadAll();
    return () => controller.abort();
  }, [iata]);

  // Clock — show airport local time using UTC offset from weather API
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      if (utcOffsetSec != null) {
        // Calculate airport local time: UTC + offset
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const airportMs = utcMs + utcOffsetSec * 1000;
        const airportDate = new Date(airportMs);
        const h = String(airportDate.getHours()).padStart(2, '0');
        const m = String(airportDate.getMinutes()).padStart(2, '0');
        const s = String(airportDate.getSeconds()).padStart(2, '0');
        setClock(`${h}:${m}:${s}`);
      } else {
        // Fallback: estimate from longitude (15° per hour)
        if (airport) {
          const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
          const estOffset = Math.round(airport.lon / 15) * 3600000;
          const estDate = new Date(utcMs + estOffset);
          const h = String(estDate.getHours()).padStart(2, '0');
          const m = String(estDate.getMinutes()).padStart(2, '0');
          const s = String(estDate.getSeconds()).padStart(2, '0');
          setClock(`${h}:${m}:${s}`);
        } else {
          setClock('--:--:--');
        }
      }
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [airport, utcOffsetSec]);

  const handleFavorite = useCallback(() => {
    toggleFavorite({ id: `airport-${iata}`, type: 'airport', label: iata, subtitle: airport?.name ?? '', addedAt: Date.now() });
  }, [iata, airport, toggleFavorite]);

  const rawSchedules = activeTab === 'departures' ? departures : arrivals;
  const schedules = useMemo(() => {
    if (sortBy === 'delay') {
      return [...rawSchedules].sort((a, b) => {
        const da = (activeTab === 'departures' ? a.depDelayed : a.arrDelayed) ?? 0;
        const db = (activeTab === 'departures' ? b.depDelayed : b.arrDelayed) ?? 0;
        return db - da; // highest delay first
      });
    }
    return rawSchedules; // API already returns sorted by time
  }, [rawSchedules, sortBy, activeTab]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const saved = mounted && isFavorite(`airport-${iata}`);

  return (
    <div className="p-4 space-y-4">
      {/* Back — uses browser history */}
      <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-[var(--primary)] text-sm font-[var(--font-body)] hover:underline cursor-pointer">
        <ArrowLeft size={16} />
        <span>{t('back', language)}</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {airport?.country && (
            <Image src={`/flags/${airport.country}.svg`} alt={airport.country} width={28} height={20} className="rounded-sm shadow" />
          )}
          <div>
            <NeonText text={iata} size="text-2xl" />
            <p className="text-sm text-[var(--text-secondary)] font-[var(--font-body)] mt-0.5">
              {airport?.name || t('loading', language)}
            </p>
          </div>
        </div>
        <button onClick={handleFavorite} className="p-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors">
          <Star size={22} className={saved ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
        </button>
      </div>

      {/* Weather + Clock */}
      <div className="grid grid-cols-2 gap-2">
        <GlassPanel className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Cloud size={14} className="text-[var(--info)]" />
            <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
              {t('weather_label', language)}
            </span>
          </div>
          {weather ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getWeatherEmoji(weather.weatherCode, weather.isDay)}</span>
                <span className="text-xl font-[var(--font-heading)] font-bold text-[var(--text-primary)]">
                  {weather.temperatureC != null ? `${Math.round(weather.temperatureC)}°C` : '--'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-[var(--font-body)] mt-1">
                {getWeatherLabel(weather.weatherCode, language)}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
                <span className="flex items-center gap-1"><Wind size={10} />{weather.windSpeedKmh != null ? `${Math.round(weather.windSpeedKmh)} km/h` : '--'}</span>
                <span className="flex items-center gap-1"><Droplets size={10} />{weather.humidity != null ? `${weather.humidity}%` : '--'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)]">{t('loading', language)}</p>
          )}
        </GlassPanel>

        <GlassPanel className="p-3 flex flex-col items-center justify-center">
          <Clock size={14} className="text-[var(--accent)] mb-1" />
          <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
            {t('local_time', language)}
          </span>
          <span className="text-2xl font-[var(--font-heading)] font-bold text-[var(--accent)] tabular-nums">{clock}</span>
        </GlassPanel>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('departures')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider transition-all ${
            activeTab === 'departures' ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <PlaneTakeoff size={14} />
          {t('departures_tab', language)}
        </button>
        <button
          onClick={() => setActiveTab('arrivals')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider transition-all ${
            activeTab === 'arrivals' ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <PlaneLanding size={14} />
          {t('arrivals_tab', language)}
        </button>
      </div>

      {/* Sort toggle */}
      {!loading && schedules.length > 0 && (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setSortBy(sortBy === 'time' ? 'delay' : 'time')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            <ArrowUpDown size={11} />
            {sortBy === 'time' ? t('delayed', language) : t('scheduled_short', language)}
          </button>
        </div>
      )}

      {/* Schedule List */}
      {loading ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">{t('loading_schedule', language)}</p>
        </GlassPanel>
      ) : schedules.length === 0 ? (
        <GlassPanel className="p-6 text-center">
          <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">{t('no_flights', language)}</p>
        </GlassPanel>
      ) : (
        <div className="space-y-2">
          {schedules.map((flight, i) => {
            const time = activeTab === 'departures' ? flight.depTime : flight.arrTime;
            const delay = activeTab === 'departures' ? flight.depDelayed : flight.arrDelayed;
            const destIata = activeTab === 'departures' ? flight.arrIata : flight.depIata;
            const destCity = destIata ? airportCity(destIata) : '';
            const terminal = activeTab === 'departures' ? flight.depTerminal : flight.arrTerminal;
            const gate = activeTab === 'departures' ? flight.depGate : flight.arrGate;

            return (
              <GlassPanel key={`${flight.flightIata}-${i}`} className="p-3">
                <div className="flex items-center justify-between">
                  {/* Left: Time + Flight */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Time column */}
                    <div className="text-center min-w-[48px] shrink-0">
                      <div className="text-sm font-[var(--font-heading)] font-bold text-[var(--text-primary)]">{formatTime(time)}</div>
                      {delay != null && delay > 0 ? (
                        <span className={`inline-block mt-0.5 text-[8px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded ${
                          delay >= 30 ? 'bg-red-500/20 text-red-400' : delay >= 15 ? 'bg-orange-500/15 text-orange-400' : 'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          +{delay} min
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 text-[8px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-green-500/15 text-green-400">
                          {t('on_time', language)}
                        </span>
                      )}
                    </div>

                    {/* Flight info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--primary)]">
                          {flight.flightIata || flight.flightIcao}
                        </span>
                        {flight.airlineIata && (
                          <Link href={`/airlines/${flight.flightIcao?.slice(0, 3) || flight.airlineIata}`}>
                            <div className="bg-white rounded px-1.5 py-0.5 shrink-0 shadow-sm hover:shadow transition-shadow">
                            <Image
                              src={API.airlineLogo(flight.airlineIata)}
                              alt={flight.airlineIata}
                              width={60}
                              height={22}
                              className="object-contain"
                              unoptimized
                            />
                            </div>
                          </Link>
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] mt-0.5 truncate">
                        {activeTab === 'departures' ? '→' : '←'}{' '}
                        <span className="font-[var(--font-heading)] font-bold">{destIata || '--'}</span>
                        {destCity && <span className="ml-1 text-[var(--text-muted)]">{destCity}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Right: Terminal + Status */}
                  <div className="text-right shrink-0 ml-2">
                    {(terminal || gate) && (
                      <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
                        {terminal ? `${t('terminal_short', language)}${terminal}` : ''}
                        {gate ? ` ${t('gate_short', language)} ${gate}` : ''}
                      </div>
                    )}
                    <StatusBadge status={flight.status} className="mt-0.5" />
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapScheduleFlight(f: any): AirportScheduleFlight {
  return {
    flightIcao: f.flight_icao ?? '',
    flightIata: f.flight_iata ?? '',
    airlineIata: f.airline_iata ?? '',
    depIata: f.dep_iata ?? '',
    arrIata: f.arr_iata ?? '',
    status: f.status ?? undefined,
    depTime: f.dep_time ?? f.dep_estimated ?? undefined,
    arrTime: f.arr_time ?? f.arr_estimated ?? undefined,
    depDelayed: f.delayed != null ? Number(f.delayed) : undefined,
    arrDelayed: f.arr_delayed != null ? Number(f.arr_delayed) : undefined,
    depTerminal: f.dep_terminal ?? undefined,
    arrTerminal: f.arr_terminal ?? undefined,
    depGate: f.dep_gate ?? undefined,
    arrGate: f.arr_gate ?? undefined,
  };
}

function formatTime(time: string | undefined): string {
  if (!time) return '--:--';
  const match = time.match(/(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  return time.slice(0, 5);
}
