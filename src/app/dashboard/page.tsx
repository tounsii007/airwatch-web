'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useDashboardStore } from '@/lib/stores/dashboardStore';
import { getWeatherEmoji } from '@/lib/utils';
import { t } from '@/lib/i18n/translations';
import { Plus, X, PlaneTakeoff, PlaneLanding, RefreshCw } from 'lucide-react';
import { createLoadingAirport, fetchDashboardAirport, type DashboardAirport } from '@/app/dashboard/dashboardData';

export default function DashboardPage() {
  const { language } = useSettingsStore();
  const airportCodes = useDashboardStore((s) => s.airportCodes);
  const addAirportCode = useDashboardStore((s) => s.addAirportCode);
  const removeAirportCode = useDashboardStore((s) => s.removeAirportCode);
  const [loadedAirports, setLoadedAirports] = useState<Record<string, DashboardAirport>>({});
  const [newIata, setNewIata] = useState('');

  const airports = useMemo(
    () => airportCodes.map((code) => loadedAirports[code] ?? createLoadingAirport(code)),
    [airportCodes, loadedAirports]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadAirports() {
      const results = await Promise.all(airportCodes.map(fetchDashboardAirport));
      if (cancelled) return;
      const nextLoaded: Record<string, DashboardAirport> = {};
      for (const airport of results) {
        nextLoaded[airport.iata] = airport;
      }
      setLoadedAirports((current) => ({ ...current, ...nextLoaded }));
    }

    void loadAirports();

    return () => {
      cancelled = true;
    };
  }, [airportCodes]);

  const addAirport = () => {
    const iata = newIata.trim().toUpperCase();
    if (!iata || iata.length !== 3 || airports.some((a) => a.iata === iata)) return;
    setNewIata('');
    addAirportCode(iata);
  };

  const removeAirport = (iata: string) => {
    removeAirportCode(iata);
    setLoadedAirports((current) => {
      const next = { ...current };
      delete next[iata.toUpperCase()];
      return next;
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('dashboard', language)} size="text-xl" />
      </div>

      {/* Add airport */}
      <GlassPanel className="flex items-center gap-2 px-3 py-2">
        <Plus size={16} className="text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          value={newIata}
          onChange={(e) => setNewIata(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && addAirport()}
          placeholder={t('add_airport_hint', language)}
          maxLength={3}
          className="flex-1 bg-transparent text-sm font-[var(--font-heading)] font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal outline-none tracking-wider"
        />
        <button
          onClick={addAirport}
          className="px-3 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer"
        >
          {t('add', language)}
        </button>
      </GlassPanel>

      {/* Airport cards */}
      <div className="space-y-4">
        {airports.map((ap) => (
          <GlassPanel key={ap.iata} className="p-4 space-y-3">
            {/* Airport header */}
            <div className="flex items-center justify-between">
              <Link href={`/airports/${ap.iata}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                {ap.country && (
                  <Image src={`/flags/${ap.country}.svg`} alt={ap.country} width={20} height={14} className="rounded-sm shadow" />
                )}
                <span className="neon-text font-[var(--font-heading)] font-bold text-lg text-[var(--primary)]">{ap.iata}</span>
                {ap.name && <span className="text-xs text-[var(--text-secondary)] font-[var(--font-body)]">{ap.name}</span>}
              </Link>
              <div className="flex items-center gap-2">
                {ap.weather && (
                  <span className="text-sm">
                    {getWeatherEmoji(ap.weather.weatherCode, ap.weather.isDay)}{' '}
                    <span className="text-xs font-[var(--font-heading)] text-[var(--text-primary)]">
                      {ap.weather.temperatureC != null ? `${Math.round(ap.weather.temperatureC)}°C` : ''}
                    </span>
                  </span>
                )}
                <button onClick={() => removeAirport(ap.iata)} className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer">
                  <X size={14} className="text-[var(--text-muted)]" />
                </button>
              </div>
            </div>

            {ap.loading ? (
              <div className="flex items-center justify-center py-4 gap-2">
                <RefreshCw size={14} className="text-[var(--primary)] animate-spin" />
                <span className="text-xs text-[var(--text-muted)]">{t('loading', language)}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Departures */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <PlaneTakeoff size={11} className="text-[var(--success)]" />
                    <span className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
                      {t('departure', language)} ({ap.departures.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {ap.departures.slice(0, 5).map((f, i) => (
                      <div key={`${f.flightIata}-${i}`} className="flex items-center justify-between text-[10px]">
                        <span className="font-[var(--font-heading)] font-bold text-[var(--primary)]">{f.flightIata || f.flightIcao}</span>
                        <span className="text-[var(--text-secondary)]">{f.arrIata}</span>
                        <span className="text-[var(--text-muted)]">{formatTimeShort(f.depTime)}</span>
                        {(f.depDelayed ?? 0) > 0 && <span className="text-[var(--error)] text-[8px]">+{f.depDelayed}</span>}
                      </div>
                    ))}
                    {ap.departures.length === 0 && <span className="text-[9px] text-[var(--text-muted)]">--</span>}
                  </div>
                </div>

                {/* Arrivals */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <PlaneLanding size={11} className="text-[var(--accent)]" />
                    <span className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
                      {t('arrival', language)} ({ap.arrivals.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {ap.arrivals.slice(0, 5).map((f, i) => (
                      <div key={`${f.flightIata}-${i}`} className="flex items-center justify-between text-[10px]">
                        <span className="font-[var(--font-heading)] font-bold text-[var(--primary)]">{f.flightIata || f.flightIcao}</span>
                        <span className="text-[var(--text-secondary)]">{f.depIata}</span>
                        <span className="text-[var(--text-muted)]">{formatTimeShort(f.arrTime)}</span>
                        {(f.arrDelayed ?? 0) > 0 && <span className="text-[var(--error)] text-[8px]">+{f.arrDelayed}</span>}
                      </div>
                    ))}
                    {ap.arrivals.length === 0 && <span className="text-[9px] text-[var(--text-muted)]">--</span>}
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

function formatTimeShort(time: string | undefined): string {
  if (!time) return '--:--';
  const match = time.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : time.slice(0, 5);
}
