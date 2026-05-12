'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchInput } from '@/components/search/SearchInput';
import { ResultTile } from '@/components/search/ResultTile';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { CONFIG } from '@/lib/constants';
import { t } from '@/lib/i18n/translations';
import type { AircraftState } from '@/lib/types';
import { NoResultsState, TypeToSearchState } from '@/app/(public)/search/SearchEmptyState';
import { ResultsGroup } from '@/app/(public)/search/ResultsGroup';
import { useAirlabsSuggest } from '@/app/(public)/search/useAirlabsSuggest';
import { useDebouncedValue } from '@/app/(public)/search/useDebouncedValue';
import { useSearchResults } from '@/app/(public)/search/useSearchResults';
import { MIN_QUERY_LENGTH } from '@/app/(public)/search/searchTypes';
import { PageContainer, Stagger, FadeIn, CountUp } from '@/components/ui';

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
  const { items: suggestItems } = useAirlabsSuggest(debouncedQuery, 0);
  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH;
  const hasResults = flights.length + airlines.length + suggestItems.length > 0;

  // Routes for /suggest tiles — airports route to /airports/{IATA},
  // airlines to /airlines/{IATA}, cities don't have a dedicated page
  // yet so the tile becomes informational only.
  const suggestHref = (s: typeof suggestItems[number]): string | null => {
    if (s.type === 'airport' && s.iata) return `/airports/${s.iata.toUpperCase()}`;
    if (s.type === 'airline' && s.iata) return `/airlines/${s.iata.toUpperCase()}`;
    return null;
  };

  const handleFlightClick = useCallback((aircraft: AircraftState) => {
    selectAircraft(aircraft);
    router.push('/');
  }, [selectAircraft, router]);

  const handleAirlineClick = useCallback((icao: string) => router.push(`/airlines/${icao}`), [router]);

  // Live availability badge — animates in on mount, count tweens via
  // CountUp so the "live" feel matches the real-time WS feed.
  const liveBadge = flightCount > 0 ? (
    <span className="badge badge-success badge-dot">
      <CountUp value={flightCount} /> {t('flights_available', language)}
    </span>
  ) : null;

  return (
    <PageContainer
      maxWidth="lg"
      title={t('search', language)}
      subtitle={liveBadge}
    >
      <FadeIn>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t('search_placeholder', language)}
        />
      </FadeIn>

      <div className="mt-4 space-y-4">
        {hasQuery && !hasResults && (
          <FadeIn>
            <NoResultsState query={debouncedQuery} language={language} />
          </FadeIn>
        )}

        {flights.length > 0 && (
          <FadeIn delay={50}>
            <ResultsGroup title={t('live_flights', language)} count={flights.length}>
              <Stagger>
                {flights.map((r) => (
                  <div key={r.aircraft.icao24} className="animate-fade-up">
                    <ResultTile
                      type="flight"
                      title={r.title}
                      subtitle={r.subtitle}
                      status={r.status}
                      query={debouncedQuery}
                      onClick={() => handleFlightClick(r.aircraft)}
                      logoUrl={r.logoUrl}
                      aircraft={r.aircraft}
                    />
                  </div>
                ))}
              </Stagger>
            </ResultsGroup>
          </FadeIn>
        )}

        {airlines.length > 0 && (
          <FadeIn delay={100}>
            <ResultsGroup title={t('airlines', language)} count={airlines.length}>
              <Stagger>
                {airlines.map((r) => (
                  <div key={r.icao} className="animate-fade-up">
                    <ResultTile
                      type="airline"
                      title={r.title}
                      subtitle={r.subtitle}
                      query={debouncedQuery}
                      onClick={() => handleAirlineClick(r.icao)}
                      logoUrl={r.logoUrl}
                    />
                  </div>
                ))}
              </Stagger>
            </ResultsGroup>
          </FadeIn>
        )}

        {suggestItems.length > 0 && (
          <FadeIn delay={150}>
            <ResultsGroup title={t('places', language)} count={suggestItems.length}>
              <Stagger>
                {suggestItems.map((s, i) => {
                  const href = suggestHref(s);
                  const title = s.iata
                    ? `${s.iata.toUpperCase()} · ${s.name ?? ''}`
                    : (s.name ?? '');
                  const subtitle = [s.city, s.country_code].filter(Boolean).join(', ');
                  return (
                    <div key={`${s.iata ?? s.icao ?? s.name ?? i}-${i}`} className="animate-fade-up">
                      <ResultTile
                        type={s.type === 'airline' ? 'airline' : 'airport'}
                        title={title}
                        subtitle={subtitle}
                        query={debouncedQuery}
                        onClick={() => { if (href) router.push(href); }}
                      />
                    </div>
                  );
                })}
              </Stagger>
            </ResultsGroup>
          </FadeIn>
        )}
      </div>

      {!hasQuery && (
        <FadeIn delay={150}>
          <TypeToSearchState language={language} />
        </FadeIn>
      )}
    </PageContainer>
  );
}
