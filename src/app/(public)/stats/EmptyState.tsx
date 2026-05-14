'use client';

import Link from 'next/link';
import { BarChart2, MapPin } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/**
 * Shown when the user has no viewed-flights history yet. The CTA
 * sends them to the map — the only place where view counts grow.
 */
export function EmptyState({ language }: { language: AppLanguage }) {
  return (
    <GlassPanel className="p-8 text-center space-y-4">
      <BarChart2 size={32} className="mx-auto text-[var(--text-muted)]" aria-hidden />
      <div className="space-y-1.5">
        <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">{t('no_stats_yet', language)}</p>
        <p className="text-[var(--text-muted)] text-xs font-[var(--font-body)] opacity-70">{t('no_stats_hint', language)}</p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider border border-[color-mix(in_srgb,var(--primary)_45%,transparent)] text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] transition-colors"
      >
        <MapPin size={13} />
        {t('open_map', language)}
      </Link>
    </GlassPanel>
  );
}
