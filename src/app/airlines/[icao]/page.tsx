'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { API } from '@/lib/constants';
import { apiFetch } from '@/lib/apiFetch';
import { ArrowLeft, Plane, PlaneLanding, Route, Search, Star } from 'lucide-react';
import { resolveAirline } from '@/lib/data/airlines';
import { countryToCode } from '@/lib/data/country-translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { FlagImage } from '@/components/common/FlagImage';

interface AirlineData {
  name: string;
  iata: string;
  icao: string;
  country: string;
}

interface AirlineFlight {
  flightIcao: string;
  flightIata: string;
  depIata: string;
  arrIata: string;
  aircraftIcao: string;
  status: string;
}

export default function AirlineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const icao = (params.icao as string).toUpperCase();
  const { aircraftMap, startPolling, selectAircraft } = useFlightStore();
  const { isFavorite, toggleFavorite } = useFavoritesStore();

  const language = useSettingsStore((s) => s.language);
  // Resolve airline from local database first
  const localAirline = useMemo(() => resolveAirline(`${icao}000`), [icao]);
  const [airline, setAirline] = useState<AirlineData | null>(
    localAirline ? { name: localAirline.name, iata: localAirline.iata, icao: localAirline.icao, country: localAirline.country } : null
  );
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Start polling if no flights loaded
  useEffect(() => {
    if (aircraftMap.size === 0) {
      startPolling();
    }
  }, [aircraftMap.size, startPolling]);

  // Fetch airline info using a flight lookup (derive from ICAO prefix)
  useEffect(() => {
    async function fetchAirlineInfo() {
      try {
        // Try to get airline info from flights data
        const url = `${API.flights(`airline_icao=${icao}&_fields=airline_icao,airline_iata,flag,flight_icao,flight_iata,dep_iata,arr_iata,aircraft_icao,status`)}`;
        const res = await apiFetch(url);
        const data = await res.json();

        if (Array.isArray(data.response) && data.response.length > 0) {
          const first = data.response[0];
          setAirline((prev) => ({
            name: prev?.name ?? localAirline?.name ?? icao,
            iata: prev?.iata || first.airline_iata || '',
            icao: first.airline_icao ?? icao,
            country: prev?.country || first.flag?.toUpperCase() || '',
          }));
        }
      } catch {
        setAirline({
          name: icao,
          iata: '',
          icao: icao,
          country: '',
        });
      }
    }
    fetchAirlineInfo();
  }, [icao, localAirline]);

  const [apiFlights, setApiFlights] = useState<AirlineFlight[]>([]);

  // Fetch flights from API (includes route data)
  useEffect(() => {
    if (!airline) return;
    const fetchUrl = API.flights(`airline_icao=${icao}&_fields=flight_icao,flight_iata,dep_iata,arr_iata,aircraft_icao,status`);
    apiFetch(fetchUrl).then(r => r.json()).then(data => {
      if (Array.isArray(data.response)) {
        setApiFlights(data.response.map((f: Record<string, string>) => ({
          flightIcao: f.flight_icao ?? '',
          flightIata: f.flight_iata ?? f.flight_icao ?? '',
          depIata: f.dep_iata ?? '',
          arrIata: f.arr_iata ?? '',
          aircraftIcao: f.aircraft_icao ?? '',
          status: f.status ?? 'en-route',
        })));
      }
    }).catch(() => {});
  }, [airline, icao]);

  // Merge API flights with live store data
  const airlineFlights = useMemo(() => {
    if (apiFlights.length > 0) return apiFlights;
    // Fallback: derive from live aircraft stream
    const flights: AirlineFlight[] = [];
    const airlineInfo = resolveAirline(icao + '000');
    const iataPrefix = airlineInfo?.iata ?? '';
    aircraftMap.forEach((ac) => {
      const cs = ac.callsign ?? '';
      if (cs.startsWith(icao)) {
        // Convert ICAO callsign to IATA display (TAR606 → TU606)
        const flightNum = cs.slice(3);
        flights.push({
          flightIcao: cs,
          flightIata: iataPrefix ? `${iataPrefix}${flightNum}` : cs,
          depIata: '',
          arrIata: '',
          aircraftIcao: '',
          status: ac.flightStatus ?? (ac.onGround ? 'landed' : 'en-route'),
        });
      }
    });
    return flights;
  }, [aircraftMap, icao, apiFlights]);

  const stats = useMemo(() => {
    let active = 0;
    let ground = 0;
    const routes = new Set<string>();
    for (const f of airlineFlights) {
      const s = f.status?.toLowerCase();
      if (s === 'en-route' || s === 'active') active++;
      if (s === 'landed') ground++;
      if (f.depIata && f.arrIata) routes.add(`${f.depIata}-${f.arrIata}`);
    }
    return { active, routes: routes.size, ground };
  }, [airlineFlights]);

  const filteredFlights = useMemo(() => {
    if (!search.trim()) return airlineFlights;
    const q = search.toLowerCase();
    return airlineFlights.filter(
      (f) =>
        f.flightIcao.toLowerCase().includes(q) ||
        f.flightIata.toLowerCase().includes(q) ||
        f.depIata.toLowerCase().includes(q) ||
        f.arrIata.toLowerCase().includes(q)
    );
  }, [airlineFlights, search]);

  const saved = mounted && isFavorite(`airline-${icao}`);
  const logoIata = airline?.iata || icao;

  return (
    <div className="p-4 space-y-4">
      {/* Back — uses browser history to return to the previous page */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-[var(--primary)] text-sm font-[var(--font-body)] hover:underline cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span>{t('back', language)}</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Airline logo */}
          <GlassPanel className="p-2 bg-white/90 rounded-xl">
            <Image
              src={API.airlineLogo(logoIata)}
              alt={airline?.name ?? icao}
              width={60}
              height={24}
              className="object-contain"
              unoptimized
            />
          </GlassPanel>
          <div>
            <div className="flex items-center gap-2">
              <NeonText text={airline?.name ?? icao} size="text-lg" />
              {airline?.country && countryToCode(airline.country) && (
                <FlagImage code={countryToCode(airline.country) ?? ''} className="w-5 h-4 rounded-sm shadow object-cover" />
              )}
            </div>
            {/* Code chips */}
            <div className="flex gap-1.5 mt-1">
              {airline?.iata && (
                <span className="text-[9px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)]">
                  IATA: {airline.iata}
                </span>
              )}
              <span className="text-[9px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
                ICAO: {airline?.icao ?? icao}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() =>
            toggleFavorite({
              id: `airline-${icao}`,
              type: 'airline',
              label: icao,
              subtitle: airline?.name ?? icao,
              addedAt: Date.now(),
            })
          }
          className="p-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors"
        >
          {mounted ? (
            <Star size={22} className={saved ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
          ) : (
            <Star size={22} className="text-[var(--text-muted)]" />
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <GlassPanel className="p-3 text-center">
          <Plane size={16} className="mx-auto mb-1 text-[var(--success)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--success)]">
            {stats.active}
          </div>
          <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            ACTIVE
          </div>
        </GlassPanel>

        <GlassPanel className="p-3 text-center">
          <Route size={16} className="mx-auto mb-1 text-[var(--info)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--info)]">
            {stats.routes}
          </div>
          <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            ROUTES
          </div>
        </GlassPanel>

        <GlassPanel className="p-3 text-center">
          <PlaneLanding size={16} className="mx-auto mb-1 text-[var(--ground)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--ground)]">
            {stats.ground}
          </div>
          <div className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            GROUND
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
          placeholder="Flug suchen..."
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
          {t('flights_upper', language)} ({filteredFlights.length})
        </h3>
        {filteredFlights.length === 0 ? (
          <GlassPanel className="p-6 text-center">
            <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
              {aircraftMap.size === 0
                ? 'Flugdaten werden geladen...'
                : 'Keine Flüge gefunden'}
            </p>
          </GlassPanel>
        ) : (
          <div className="space-y-2">
            {filteredFlights.map((flight, i) => {
              const isLive = flight.status === 'en-route' || flight.status === 'active';
              const handleClick = () => {
                if (!isLive) return;
                // Find aircraft in store and navigate to map
                const ac = Array.from(aircraftMap.values()).find(
                  (a) => a.callsign?.startsWith(flight.flightIcao.slice(0, 6))
                );
                if (ac) {
                  selectAircraft(ac);
                  router.push('/');
                }
              };
              return (
                <GlassPanel
                  key={`${flight.flightIcao}-${i}`}
                  className={`p-3 flex items-center justify-between ${isLive ? 'cursor-pointer hover:bg-white/5' : ''}`}
                  onClick={isLive ? handleClick : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Plane size={14} className="text-[var(--primary)] shrink-0" />
                    <div>
                      <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--text-primary)]">
                        {flight.flightIata || flight.flightIcao}
                      </span>
                      {flight.depIata && flight.arrIata ? (
                        <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] mt-0.5">
                          {flight.depIata} → {flight.arrIata}
                        </div>
                      ) : (
                        <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)] mt-0.5">
                          {flight.flightIcao}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {flight.aircraftIcao && (
                      <span className="text-[9px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-light)]/50 text-[var(--text-muted)]">
                        {flight.aircraftIcao}
                      </span>
                    )}
                    <StatusBadge status={flight.status} />
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
