'use client';

import { Star } from 'lucide-react';
import { EmptyState as UIEmptyState } from '@/components/ui/EmptyState';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/** Placeholder shown on the saved page when the user has no favorites yet. */
export function EmptyState({ language }: { language: AppLanguage }) {
  return (
    <UIEmptyState
      icon={<Star size={28} strokeWidth={1.5} />}
      title={t('no_favorites_saved', language)}
      body={t('mark_favorites_hint', language)}
      variant="warning"
    />
  );
}
