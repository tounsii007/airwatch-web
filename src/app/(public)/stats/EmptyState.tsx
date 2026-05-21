'use client';

import Link from 'next/link';
import { BarChart2, MapPin } from 'lucide-react';
import { EmptyState as UIEmptyState } from '@/components/ui/EmptyState';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/**
 * Shown when the user has no viewed-flights history yet. The CTA
 * sends them to the map — the only place where view counts grow.
 */
export function EmptyState({ language }: { language: AppLanguage }) {
  return (
    <UIEmptyState
      icon={<BarChart2 size={28} strokeWidth={1.5} />}
      title={t('no_stats_yet', language)}
      body={t('no_stats_hint', language)}
      action={
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider border border-[color-mix(in_srgb,var(--primary)_45%,transparent)] text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] transition-colors"
        >
          <MapPin size={13} />
          {t('open_map', language)}
        </Link>
      }
      variant="info"
    />
  );
}
