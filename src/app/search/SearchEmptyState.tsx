'use client';

import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/** "Type to search" placeholder before the user types anything. */
export function TypeToSearchState({ language }: { language: AppLanguage }) {
  return (
    <div className="text-center py-12">
      <p className="text-[var(--text-muted)] font-[var(--font-body)] text-sm">{t('type_to_search', language)}</p>
    </div>
  );
}

/** "No results" placeholder shown for a non-empty query that didn't match. */
export function NoResultsState({ query, language }: { query: string; language: AppLanguage }) {
  return (
    <div className="text-center py-8">
      <p className="text-[var(--text-muted)] font-[var(--font-body)] text-sm">
        {t('no_results', language)} &ldquo;{query}&rdquo;
      </p>
      <p className="text-[var(--text-muted)] font-[var(--font-body)] text-xs mt-1">{t('try_hint', language)}</p>
    </div>
  );
}
