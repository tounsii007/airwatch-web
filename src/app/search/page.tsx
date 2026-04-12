'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NeonText } from '@/components/ui/NeonText';
import { SearchInput } from '@/components/search/SearchInput';
import { ResultTile } from '@/components/search/ResultTile';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { CONFIG } from '@/lib/constants';
import { resolveAirline, getAirlineLogoUrl, searchAirlines } from '@/lib/data/airlines';
import { t } from '@/lib/i18n/translations';
import type { AircraftState } from '@/lib/types';

interface FlightResult {
  type: 'flight';
  aircraft: AircraftState;
  title: string;
  subtitle: string;
  status?: string;
  logoUrl?: string;
}

interface AirlineResult {
  type: 'airline';
  icao: string;
  title: string;
  subtitle: string;
  logoUrl?: string;
}

type SearchResult = FlightResult | AirlineResult;

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const startPolling = useFlightStore((s) => s.startPolling);
  const flightCount = aircraftMap.size;
  const language = useSettingsStore((s) => s.language);

  // Ensure flight data is loaded
  useEffect(() => {
    if (flightCount === 0) {
      startPolling();
    }
  }, [flightCount, startPolling]);

  // Debounce search query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, CONFIG.searchDebounce);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Search through live aircraft + airline database
  const results = useMemo((): SearchResult[] => {
    if (debouncedQuery.length < 2) return [];

    const q = debouncedQuery.toUpperCase();
    const flights: FlightResult[] = [];
    const airlineSet = new Map<string, AirlineResult>();

    for (const aircraft of aircraftMap.values()) {
      const callsign = aircraft.callsign?.toUpperCase() ?? '';
      const icao24 = aircraft.icao24.toUpperCase();

      // Resolve airline info for richer display
      const airlineInfo = resolveAirline(callsign);

      const matches =
        callsign.includes(q) ||
        icao24.includes(q) ||
        (airlineInfo && airlineInfo.name.toUpperCase().includes(q));

      if (matches) {
        const airlineName = airlineInfo?.name;
        const iata = airlineInfo?.iata;
        const subtitleParts: string[] = [];
        if (airlineName) subtitleParts.push(airlineName);
        if (iata) subtitleParts.push(`(${airlineInfo.icao}/${iata})`);
        if (!airlineName) subtitleParts.push(`ICAO: ${icao24}`);
        if (aircraft.onGround) subtitleParts.push('(Ground)');

        // Convert ICAO callsign to IATA display (TAR216 → TU216)
        const displayTitle = iata && callsign.length > 3
          ? `${iata}${callsign.slice(3)}`
          : callsign || icao24;

        flights.push({
          type: 'flight',
          aircraft,
          title: displayTitle,
          subtitle: subtitleParts.join(' '),
          status: aircraft.flightStatus,
          logoUrl: iata ? getAirlineLogoUrl(iata) : undefined,
        });
      }

      // Collect airline prefixes (first 3 chars of ICAO callsign)
      if (callsign.length >= 3) {
        const prefix = callsign.slice(0, 3);
        if (prefix.includes(q)) {
          if (!airlineSet.has(prefix)) {
            const info = resolveAirline(callsign);
            airlineSet.set(prefix, {
              type: 'airline',
              icao: prefix,
              title: info ? info.name : prefix,
              subtitle: info
                ? `${info.icao}/${info.iata} \u2022 ${info.country}`
                : `Airline (ICAO: ${prefix})`,
              logoUrl: info?.iata ? getAirlineLogoUrl(info.iata) : undefined,
            });
          }
        }
      }
    }

    // Also search the airline database directly (for airlines with no live flights)
    const dbAirlines = searchAirlines(debouncedQuery);
    for (const airline of dbAirlines) {
      if (!airlineSet.has(airline.icao)) {
        airlineSet.set(airline.icao, {
          type: 'airline',
          icao: airline.icao,
          title: airline.name,
          subtitle: `${airline.icao}/${airline.iata} \u2022 ${airline.country}`,
          logoUrl: airline.iata ? getAirlineLogoUrl(airline.iata) : undefined,
        });
      }
    }

    // Sort flights: callsign exact starts first, then alphabetical
    flights.sort((a, b) => {
      const aStarts = a.title.startsWith(q) ? 0 : 1;
      const bStarts = b.title.startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.title.localeCompare(b.title);
    });

    // Limit results to keep the UI performant
    const limitedFlights = flights.slice(0, 50);
    const airlines = Array.from(airlineSet.values()).slice(0, 10);

    return [...limitedFlights, ...airlines];
  }, [debouncedQuery, aircraftMap]);

  const flightResults = results.filter((r): r is FlightResult => r.type === 'flight');
  const airlineResults = results.filter((r): r is AirlineResult => r.type === 'airline');

  const handleFlightClick = useCallback(
    (aircraft: AircraftState) => {
      selectAircraft(aircraft);
      router.push('/');
    },
    [selectAircraft, router]
  );

  const handleAirlineClick = useCallback(
    (icao: string) => {
      router.push(`/airlines/${icao}`);
    },
    [router]
  );

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center py-4 mb-2">
        <NeonText text={t('search', language)} size="text-xl" />
        {flightCount > 0 && (
          <p className="text-[var(--text-muted)] text-[10px] font-[var(--font-heading)] mt-2 tracking-wider">
            {flightCount.toLocaleString()} {t('flights_available', language)}
          </p>
        )}
      </div>

      {/* Search input */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={t('search_placeholder', language)}
      />

      {/* Results */}
      <div className="mt-4 space-y-4">
        {debouncedQuery.length >= 2 && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[var(--text-muted)] font-[var(--font-body)] text-sm">
              {t('no_results', language)} &ldquo;{debouncedQuery}&rdquo;
            </p>
            <p className="text-[var(--text-muted)] font-[var(--font-body)] text-xs mt-1">
              {t('try_hint', language)}
            </p>
          </div>
        )}

        {/* Live Flights group */}
        {flightResults.length > 0 && (
          <div>
            <h3 className="text-[var(--text-muted)] text-[9px] font-[var(--font-heading)] tracking-widest mb-2 px-1">
              {t('live_flights', language)} ({flightResults.length})
            </h3>
            <div className="glass-panel divide-y divide-[var(--glass-border)]">
              {flightResults.map((result) => (
                <ResultTile
                  key={result.aircraft.icao24}
                  type="flight"
                  title={result.title}
                  subtitle={result.subtitle}
                  status={result.status}
                  query={debouncedQuery}
                  onClick={() => handleFlightClick(result.aircraft)}
                  logoUrl={result.logoUrl}
                />
              ))}
            </div>
          </div>
        )}

        {/* Airlines group */}
        {airlineResults.length > 0 && (
          <div>
            <h3 className="text-[var(--text-muted)] text-[9px] font-[var(--font-heading)] tracking-widest mb-2 px-1">
              {t('airlines', language)} ({airlineResults.length})
            </h3>
            <div className="glass-panel divide-y divide-[var(--glass-border)]">
              {airlineResults.map((result) => (
                <ResultTile
                  key={result.icao}
                  type="airline"
                  title={result.title}
                  subtitle={result.subtitle}
                  query={debouncedQuery}
                  onClick={() => handleAirlineClick(result.icao)}
                  logoUrl={result.logoUrl}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty state when no query */}
      {debouncedQuery.length < 2 && (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] font-[var(--font-body)] text-sm">
            {t('type_to_search', language)}
          </p>
        </div>
      )}
    </div>
  );
}
