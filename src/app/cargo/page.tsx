'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { formatAltitude, formatSpeed, getAltitudeColor } from '@/lib/utils';
import { t } from '@/lib/i18n/translations';
import { resolveAirline, getAirlineLogoUrl } from '@/lib/data/airlines';
import { airportCity, airportCountry } from '@/lib/data/airports';
import type { AircraftState } from '@/lib/types';
import { Package, Plane, PlaneLanding, Search, ArrowRight, ChevronUp } from 'lucide-react';
import { ManagedImage } from '@/components/common/ManagedImage';

/** Known pure-freight airline ICAO codes */
const CARGO_AIRLINE_ICAOS = new Set([
  'FDX', // FedEx
  'UPS', // UPS Airlines
  'GTI', // Atlas Air
  'GEC', // Lufthansa Cargo
  'CLX', // Cargolux
  'BOX', // ASL Airlines (DHL contractor)
  'ABX', // ABX Air
  'TAY', // ASL Airlines Belgium (TNT)
  'NPT', // Kalitta Air
  'WGN', // Western Global Airlines
  'ATG', // Air Transport International
  'SQC', // Singapore Airlines Cargo
  'ADB', // Antonov Airlines
  'CKS', // Centurion Air Cargo
  'AEC', // Amerijet International
  'GMI', // German Cargo
  'FPO', // FlyPelican / cargo ops
  'TGX', // Tasman Cargo
  'KFS', // Kalitta Charters
  'MSC', // MSC Air Cargo
  'QAF', // Qantas Freight
  'BAW', // (some BA cargo flights)
  'ETD', // Etihad Cargo
  'UAE', // Emirates SkyCargo (shares with pax)
]);

function isCargoFlight(ac: AircraftState): boolean {
  if (ac.airlineIcao && CARGO_AIRLINE_ICAOS.has(ac.airlineIcao.toUpperCase())) return true;
  // Fallback: callsign prefix matches known cargo operators
  const cs = ac.callsign?.toUpperCase() ?? '';
  if (
    cs.startsWith('FDX') || cs.startsWith('UPS') || cs.startsWith('GTI') ||
    cs.startsWith('CLX') || cs.startsWith('BOX') || cs.startsWith('TAY') ||
    cs.startsWith('GEC') || cs.startsWith('ABX') || cs.startsWith('WGN')
  ) return true;
  return false;
}

export default function CargoPage() {
  const { aircraftMap, startPolling, selectAircraft } = useFlightStore();
  const { altitudeUnit, speedUnit, language } = useSettingsStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'airborne' | 'ground'>('all');
  const router = useRouter();

  useEffect(() => {
    if (aircraftMap.size === 0) startPolling();
  }, [aircraftMap.size, startPolling]);

  const cargoFlights = useMemo(() => {
    const result: AircraftState[] = [];
    aircraftMap.forEach((ac) => {
      if (isCargoFlight(ac)) result.push(ac);
    });
    return result.sort((a, b) => (b.baroAltitude ?? 0) - (a.baroAltitude ?? 0));
  }, [aircraftMap]);

  const stats = useMemo(() => {
    const airborne = cargoFlights.filter((ac) => !ac.onGround).length;
    const ground = cargoFlights.filter((ac) => ac.onGround).length;
    // Count unique operators
    const ops = new Set(cargoFlights.map((ac) => ac.airlineIcao).filter(Boolean));
    return { airborne, ground, total: cargoFlights.length, operators: ops.size };
  }, [cargoFlights]);

  const filtered = useMemo(() => {
    let list = cargoFlights;
    if (statusFilter === 'airborne') list = list.filter((ac) => !ac.onGround);
    if (statusFilter === 'ground') list = list.filter((ac) => ac.onGround);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (ac) =>
        ac.callsign?.toLowerCase().includes(q) ||
        ac.airlineIcao?.toLowerCase().includes(q) ||
        ac.depIata?.toLowerCase().includes(q) ||
        ac.arrIata?.toLowerCase().includes(q)
    );
  }, [cargoFlights, search, statusFilter]);

  const handleTrack = (ac: AircraftState) => {
    selectAircraft(ac);
    router.push('/');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center py-3">
        <NeonText text={t('cargo_tracking', language)} size="text-xl" />
      </div>

      {/* Stats Row — clickable filter buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <GlassPanel
          className={`p-3 text-center cursor-pointer transition-colors ${statusFilter === 'airborne' ? 'border-[var(--success)]/50 bg-[var(--success)]/8' : 'hover:bg-white/5'}`}
          onClick={() => setStatusFilter(statusFilter === 'airborne' ? 'all' : 'airborne')}
        >
          <Plane size={16} className="mx-auto mb-1 text-[var(--success)]" />
          <div className="text-base font-[var(--font-heading)] font-bold text-[var(--success)]">
            {stats.airborne}
          </div>
          <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('airborne', language)}
          </div>
        </GlassPanel>

        <GlassPanel
          className={`p-3 text-center cursor-pointer transition-colors ${statusFilter === 'ground' ? 'border-[var(--ground)]/50 bg-[var(--ground)]/8' : 'hover:bg-white/5'}`}
          onClick={() => setStatusFilter(statusFilter === 'ground' ? 'all' : 'ground')}
        >
          <PlaneLanding size={16} className="mx-auto mb-1 text-[var(--ground)]" />
          <div className="text-base font-[var(--font-heading)] font-bold text-[var(--ground)]">
            {stats.ground}
          </div>
          <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('on_ground', language)}
          </div>
        </GlassPanel>

        <GlassPanel
          className={`p-3 text-center cursor-pointer transition-colors ${statusFilter === 'all' ? 'border-[var(--accent)]/50 bg-[var(--accent)]/8' : 'hover:bg-white/5'}`}
          onClick={() => setStatusFilter('all')}
        >
          <Package size={16} className="mx-auto mb-1 text-[var(--accent)]" />
          <div className="text-base font-[var(--font-heading)] font-bold text-[var(--accent)]">
            {stats.total}
          </div>
          <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('total', language)}
          </div>
        </GlassPanel>

        <GlassPanel className="p-3 text-center">
          <Package size={16} className="mx-auto mb-1 text-[var(--primary)]" />
          <div className="text-base font-[var(--font-heading)] font-bold text-[var(--primary)]">
            {stats.operators}
          </div>
          <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('cargo_operators', language)}
          </div>
        </GlassPanel>
      </div>

      {/* Search */}
      <GlassPanel className="flex items-center gap-2 px-3 py-2">
        <Search size={16} className="text-[var(--text-muted)] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_flights', language)}
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

      {/* Flight List */}
      <div>
        <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
          {t('cargo_flights', language)}
          {filtered.length > 0 && (
            <span className="ml-2 text-[var(--primary)]">{filtered.length}</span>
          )}
        </h3>

        {aircraftMap.size === 0 ? (
          <GlassPanel className="p-6 text-center">
            <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
              {t('loading_flight_data', language)}
            </p>
          </GlassPanel>
        ) : filtered.length === 0 ? (
          <GlassPanel className="p-6 text-center space-y-2">
            <Package size={28} className="mx-auto text-[var(--text-muted)]" />
            <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
              {search ? t('no_results', language) : t('no_cargo_flights', language)}
            </p>
            {!search && (
              <p className="text-[var(--text-muted)] text-xs font-[var(--font-body)] opacity-70">
                {t('cargo_hint', language)}
              </p>
            )}
          </GlassPanel>
        ) : (
          <div className="space-y-2">
            {filtered.map((ac) => {
              const airlineInfo = resolveAirline(ac.callsign ?? '');
              const operatorName = airlineInfo?.name ?? ac.airlineIcao ?? 'Cargo';
              const airlineIata = airlineInfo?.iata;
              const displayCallsign = airlineIata && ac.callsign
                ? `${airlineIata}${ac.callsign.slice(3)}`
                : ac.callsign || ac.icao24;
              const depCity = ac.depIata ? airportCity(ac.depIata) : null;
              const arrCity = ac.arrIata ? airportCity(ac.arrIata) : null;

              return (
                <GlassPanel
                  key={ac.icao24}
                  className="p-3 cursor-pointer hover:bg-[var(--primary)]/8 transition-colors"
                  onClick={() => handleTrack(ac)}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Logo + Flight info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {airlineIata ? (
                        <div className="relative w-14 h-7 bg-white rounded shrink-0 shadow-sm overflow-hidden flex items-center justify-center px-1">
                          <ManagedImage
                            src={getAirlineLogoUrl(airlineIata, 'sm')}
                            alt={operatorName}
                            fill
                            sizes="56px"
                            unoptimized
                            className="object-contain p-1"
                            fallback={
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: getAltitudeColor(ac.baroAltitude, ac.onGround) }}
                              />
                            }
                          />
                        </div>
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: getAltitudeColor(ac.baroAltitude, ac.onGround) }}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--primary)]">
                            {displayCallsign}
                          </span>
                          <StatusBadge status={ac.flightStatus} />
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)] truncate">
                          {operatorName}
                        </div>
                      </div>
                    </div>

                    {/* Right: Altitude + Speed */}
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs font-[var(--font-heading)] text-[var(--accent)]">
                        {formatAltitude(ac.baroAltitude, altitudeUnit)}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
                        {formatSpeed(ac.velocity, speedUnit)}
                      </div>
                    </div>
                  </div>

                  {/* Route row with flags */}
                  {(ac.depIata || ac.arrIata) && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--glass-border)]">
                      {ac.depIata && (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {airportCountry(ac.depIata) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/flags/${airportCountry(ac.depIata).toLowerCase()}.svg`} alt="" className="w-4 h-3 rounded-sm object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                          <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--success)]">{ac.depIata}</span>
                          {depCity && <span className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">{depCity}</span>}
                        </div>
                      )}
                      <ArrowRight size={12} className="text-[var(--text-muted)] shrink-0" />
                      {ac.arrIata && (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          {arrCity && <span className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">{arrCity}</span>}
                          <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--accent)]">{ac.arrIata}</span>
                          {airportCountry(ac.arrIata) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/flags/${airportCountry(ac.arrIata).toLowerCase()}.svg`} alt="" className="w-4 h-3 rounded-sm object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </GlassPanel>
              );
            })}
          </div>
        )}

        {/* Scroll to top + count indicator */}
        {filtered.length > 10 && (
          <div className="flex items-center justify-between pt-3">
            <span className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
              {filtered.length} {t('flights_count', language)}
            </span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer"
            >
              <ChevronUp size={12} />
              TOP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
