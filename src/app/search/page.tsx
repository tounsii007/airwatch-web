'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NeonText } from '@/components/ui/NeonText';
import { SearchInput } from '@/components/search/SearchInput';
import { ResultTile } from '@/components/search/ResultTile';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { CONFIG } from '@/lib/constants';
import { t } from '@/lib/i18n/translations';
import type { AircraftState, AppLanguage } from '@/lib/types';
import { NoResultsState, TypeToSearchState } from '@/app/search/SearchEmptyState';
import { ResultsGroup } from '@/app/search/ResultsGroup';
import { useDebouncedValue } from '@/app/search/useDebouncedValue';
import { useSearchResults } from '@/app/search/useSearchResults';
import { MIN_QUERY_LENGTH } from '@/app/search/searchTypes';

function Header({ language, flightCount }: { language: AppLanguage; flightCount: number }) {
  return (
    <div className="text-center py-4 mb-2">
      <NeonText text={t('search', language)} size="text-xl" />
      {flightCount > 0 && (
        <p className="text-[var(--text-muted)] text-[10px] font-[var(--font-heading)] mt-2 tracking-wider">
          {flightCount.toLocaleString()} {t('flights_available', language)}
        </p>
      )}
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), CONFIG.searchDebounce);

  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const startPolling = useFlightStore((s) => s.startPolling);
  const flightCount = aircraftMap.size;
  const language = useSettingsStore((s) => s.language);

  useEffect(() => { if (flightCount === 0) startPolling(); }, [flightCount, startPolling]);

  const { flights, airlines } = useSearchResults(debouncedQuery);
  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const hasResults = flights.length + airlines.length > 0;

  const handleFlightClick = useCallback((aircraft: AircraftState) => {
    selectAircraft(aircraft);
    router.push('/');
  }, [selectAircraft, router]);

  const handleAirlineClick = useCallback((icao: string) => router.push(`/airlines/${icao}`), [router]);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Header language={language} flightCount={flightCount} />
      <SearchInput value={query} onChange={setQuery} placeholder={t('search_placeholder', language)} />

      <div className="mt-4 space-y-4">
        {hasQuery && !hasResults && <NoResultsState query={debouncedQuery} language={language} />}

        <ResultsGroup title={t('live_flights', language)} count={flights.length}>
          {flights.map((r) => (
            <ResultTile
              key={r.aircraft.icao24}
              type="flight"
              title={r.title}
              subtitle={r.subtitle}
              status={r.status}
              query={debouncedQuery}
              onClick={() => handleFlightClick(r.aircraft)}
              logoUrl={r.logoUrl}
              aircraft={r.aircraft}
            />
          ))}
        </ResultsGroup>

        <ResultsGroup title={t('airlines', language)} count={airlines.length}>
          {airlines.map((r) => (
            <ResultTile
              key={r.icao}
              type="airline"
              title={r.title}
              subtitle={r.subtitle}
              query={debouncedQuery}
              onClick={() => handleAirlineClick(r.icao)}
              logoUrl={r.logoUrl}
            />
          ))}
        </ResultsGroup>
      </div>

      {!hasQuery && <TypeToSearchState language={language} />}
    </div>
  );
}
