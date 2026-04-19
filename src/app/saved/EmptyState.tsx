'use client';

import { Star } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/** Placeholder shown on the saved page when the user has no favorites yet. */
export function EmptyState({ language }: { language: AppLanguage }) {
  return (
    <GlassPanel className="p-8 text-center">
      <Star size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-secondary)] font-[var(--font-body)]">{t('no_favorites_saved', language)}</p>
      <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)] mt-1">{t('mark_favorites_hint', language)}</p>
    </GlassPanel>
  );
}
