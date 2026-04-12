'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { formatAltitude, formatSpeed, getAltitudeColor } from '@/lib/utils';
import { CONVERSION } from '@/lib/constants';
import { t } from '@/lib/i18n/translations';
import { localizeCountry } from '@/lib/data/country-translations';
import { resolveAirline } from '@/lib/data/airlines';
import type { AircraftState } from '@/lib/types';
import { Plane, PlaneLanding, Radio, Search, LayoutDashboard, Binoculars } from 'lucide-react';

const POPULAR_AIRPORTS = [
  { iata: 'FRA', name: 'Frankfurt' },
  { iata: 'MUC', name: 'Munich' },
  { iata: 'LHR', name: 'London Heathrow' },
  { iata: 'CDG', name: 'Paris CDG' },
  { iata: 'AMS', name: 'Amsterdam' },
  { iata: 'ZRH', name: 'Zurich' },
  { iata: 'VIE', name: 'Vienna' },
  { iata: 'IST', name: 'Istanbul' },
  { iata: 'BCN', name: 'Barcelona' },
  { iata: 'FCO', name: 'Rome Fiumicino' },
  { iata: 'JFK', name: 'New York JFK' },
  { iata: 'DXB', name: 'Dubai' },
];

export default function AirportsPage() {
  const { aircraftMap, startPolling } = useFlightStore();
  const { altitudeUnit, speedUnit, language } = useSettingsStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (aircraftMap.size === 0) {
      startPolling();
    }
  }, [aircraftMap.size, startPolling]);

  const stats = useMemo(() => {
    let airborne = 0;
    let ground = 0;
    aircraftMap.forEach((ac) => {
      if (ac.onGround) {
        ground++;
      } else {
        airborne++;
      }
    });
    return { airborne, ground, total: aircraftMap.size };
  }, [aircraftMap]);

  const recentDepartures = useMemo(() => {
    const flights = Array.from(aircraftMap.values());
    const result: AircraftState[] = [];
    for (const ac of flights) {
      if (
        ac.callsign &&
        !ac.onGround &&
        ac.baroAltitude != null &&
        ac.baroAltitude * CONVERSION.metersToFeet < 10000
      ) {
        result.push(ac);
      }
      if (result.length >= 30) break;
    }
    return result;
  }, [aircraftMap]);

  const filteredDepartures = useMemo(() => {
    if (!search.trim()) return recentDepartures;
    const q = search.toLowerCase();
    return recentDepartures.filter(
      (ac) =>
        ac.callsign?.toLowerCase().includes(q) ||
        ac.originCountry?.toLowerCase().includes(q)
    );
  }, [recentDepartures, search]);

  const filteredAirports = useMemo(() => {
    if (!search.trim()) return POPULAR_AIRPORTS;
    const q = search.toLowerCase();
    return POPULAR_AIRPORTS.filter(
      (a) =>
        a.iata.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center py-3">
        <NeonText text={t('airports', language)} size="text-xl" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <GlassPanel className="p-3 text-center">
          <Plane size={18} className="mx-auto mb-1 text-[var(--success)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--success)]">
            {stats.airborne.toLocaleString()}
          </div>
          <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('airborne', language)}
          </div>
        </GlassPanel>

        <GlassPanel className="p-3 text-center">
          <PlaneLanding size={18} className="mx-auto mb-1 text-[var(--ground)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--ground)]">
            {stats.ground.toLocaleString()}
          </div>
          <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('on_ground', language)}
          </div>
        </GlassPanel>

        <GlassPanel className="p-3 text-center">
          <Radio size={18} className="mx-auto mb-1 text-[var(--primary)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--primary)]">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('total', language)}
          </div>
        </GlassPanel>
      </div>

      {/* Quick links */}
      <div className="flex gap-2">
        <Link href="/dashboard" className="flex-1">
          <GlassPanel className="px-3 py-2.5 flex items-center gap-2 hover:bg-[var(--primary)]/10 transition-colors">
            <LayoutDashboard size={14} className="text-[var(--primary)]" />
            <span className="text-[10px] font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-secondary)]">
              {t('dashboard', language)}
            </span>
          </GlassPanel>
        </Link>
        <Link href="/spotting" className="flex-1">
          <GlassPanel className="px-3 py-2.5 flex items-center gap-2 hover:bg-[var(--primary)]/10 transition-colors">
            <Binoculars size={14} className="text-[var(--accent)]" />
            <span className="text-[10px] font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-secondary)]">
              {t('spotting', language)}
            </span>
          </GlassPanel>
        </Link>
      </div>

      {/* Popular Airports */}
      <div>
        <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
          {t('popular_airports', language)}
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filteredAirports.map((airport) => (
            <Link key={airport.iata} href={`/airports/${airport.iata}`}>
              <GlassPanel className="px-3 py-2 whitespace-nowrap cursor-pointer hover:bg-[var(--primary)]/10 transition-colors">
                <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--primary)]">
                  {airport.iata}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] ml-1.5 font-[var(--font-body)]">
                  {airport.name}
                </span>
              </GlassPanel>
            </Link>
          ))}
        </div>
      </div>

      {/* Search */}
      <GlassPanel className="flex items-center gap-2 px-3 py-2">
        <Search size={16} className="text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_flight_airport', language)}
          className="flex-1 bg-transparent text-sm font-[var(--font-body)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs"
          >
            &times;
          </button>
        )}
      </GlassPanel>

      {/* Recent Departures */}
      <div>
        <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
          {t('last_departures', language)}
        </h3>
        {filteredDepartures.length === 0 ? (
          <GlassPanel className="p-6 text-center">
            <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
              {aircraftMap.size === 0
                ? t('loading_flight_data', language)
                : t('no_results', language)}
            </p>
          </GlassPanel>
        ) : (
          <div className="space-y-2">
            {filteredDepartures.map((ac) => {
              const airlineInfo = resolveAirline(ac.callsign ?? '');
              const countryLabel = ac.originCountry
                ? localizeCountry(ac.originCountry, language)
                : (airlineInfo?.name ?? t('unknown', language));

              return (
                <GlassPanel
                  key={ac.icao24}
                  className="p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: getAltitudeColor(ac.baroAltitude, ac.onGround) }}
                    />
                    <div>
                      <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
                        {ac.callsign || 'N/A'}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)]">
                        {countryLabel}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <div className="text-xs font-[var(--font-heading)] text-[var(--accent)]">
                        {formatAltitude(ac.baroAltitude, altitudeUnit)}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
                        {formatSpeed(ac.velocity, speedUnit)}
                      </div>
                    </div>
                    <StatusBadge status={ac.flightStatus} />
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
