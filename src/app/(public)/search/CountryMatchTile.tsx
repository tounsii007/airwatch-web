'use client';

import { countryFlag } from '@/lib/data/countries';
import { localizeCountry } from '@/lib/data/country-translations';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { CountryResult } from '@/app/(public)/search/searchTypes';

interface Props {
  country: CountryResult;
  language: AppLanguage;
}

/**
 * Summary tile rendered at the top of the search results when the user's
 * query resolves to a known country in any of the nine app locales.
 *
 * <p>Renders the country flag (derived via Unicode regional-indicator
 * letters so it works without backend data), the localised country name,
 * and a compact count line showing how many airlines / airports / flights
 * are surfaced below.
 *
 * <p>The component is purely presentational — it does not navigate. The
 * groups below let the user drill into each result. Keeping this tile
 * navigation-free also avoids competing with the more specific tiles.
 */
export function CountryMatchTile({ country, language }: Props) {
  const local = localizeCountry(country.canonical, language);
  const flag = country.code ? countryFlag(country.code) : '';
  const body = t('search_country_match_body', language)
    .replace('{0}', String(country.airlineCount))
    .replace('{1}', String(country.airportCount))
    .replace('{2}', String(country.flightCount));

  return (
    <div
      className="glass-panel p-4 flex items-center gap-3"
      data-testid="country-match-tile"
      data-country={country.canonical}
    >
      {flag && (
        <span className="text-3xl shrink-0" aria-hidden>
          {flag}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
          {t('search_country_match_title', language).replace('{0}', local.toUpperCase())}
        </div>
        <div className="text-sm font-bold text-[var(--text)] truncate">{local}</div>
        <div className="text-xs text-[var(--text-secondary)] mt-0.5">{body}</div>
      </div>
    </div>
  );
}
