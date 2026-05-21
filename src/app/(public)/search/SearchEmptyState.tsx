'use client';

import { Search, SearchX, Plane, Keyboard } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Kbd } from '@/components/ui/Kbd';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

// ─── TypeToSearchState ───────────────────────────────────────────────────────

/**
 * Shown before the user types anything. Encourages discovery with a
 * keyboard-shortcut hint and example query formats.
 */
export function TypeToSearchState({ language }: { language: AppLanguage }) {
  return (
    <EmptyState
      icon={<Search size={28} strokeWidth={1.5} />}
      title={t('type_to_search', language)}
      body={
        <span className="space-y-2 block">
          <span className="block">{t('search_examples', language)}</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Keyboard size={12} aria-hidden />
            {' '}Press{' '}
            <Kbd keys={['⌘', 'K']} />
            {' '}to focus from anywhere
          </span>
        </span>
      }
      variant="info"
      className="mt-4"
    />
  );
}

// ─── NoResultsState ──────────────────────────────────────────────────────────

/**
 * Shown when a non-empty query returns zero matches across all result
 * groups. Surfaces the search term and offers a reformulation hint.
 */
export function NoResultsState({
  query,
  language,
}: {
  query: string;
  language: AppLanguage;
}) {
  return (
    <EmptyState
      icon={<SearchX size={28} strokeWidth={1.5} />}
      title={
        <>
          {t('no_results', language)}{' '}
          <span className="text-[var(--primary-bright)]">&ldquo;{query}&rdquo;</span>
        </>
      }
      body={t('try_hint', language)}
      action={
        <span className="flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
          <ExampleChip label="TU744" />
          <ExampleChip label="LH" />
          <ExampleChip label="3C4AB2" />
          <ExampleChip label="Ryanair" />
        </span>
      }
      variant="default"
    />
  );
}

// ─── LiveEmptyState ──────────────────────────────────────────────────────────

/**
 * Shown in any live-flights list that has no aircraft yet. Signals the
 * real-time nature of the data (will populate automatically).
 */
export function LiveEmptyState({ language }: { language: AppLanguage }) {
  return (
    <EmptyState
      icon={<Plane size={28} strokeWidth={1.5} />}
      title={t('no_flights_found', language)}
      body={t('api_error_hint', language)}
      variant="warning"
      bare
    />
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ExampleChip({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md font-mono text-[0.7rem] tracking-wide border border-[var(--glass-border)] text-[var(--text-secondary)] bg-white/[0.03]">
      {label}
    </span>
  );
}
