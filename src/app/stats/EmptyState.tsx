'use client';

import { BarChart2 } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/** Shown when the user has no viewed-flights history yet. */
export function EmptyState({ language }: { language: AppLanguage }) {
  return (
    <GlassPanel className="p-8 text-center space-y-3">
      <BarChart2 size={32} className="mx-auto text-[var(--text-muted)]" />
      <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">{t('no_stats_yet', language)}</p>
      <p className="text-[var(--text-muted)] text-xs font-[var(--font-body)] opacity-70">{t('no_stats_hint', language)}</p>
    </GlassPanel>
  );
}
