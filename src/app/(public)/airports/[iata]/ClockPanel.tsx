'use client';

import { Clock } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/** Local-time clock card shown next to the weather. */
export function ClockPanel({ clock, language }: { clock: string; language: AppLanguage }) {
  return (
    <GlassPanel className="p-3 flex flex-col items-center justify-center">
      <Clock size={14} className="text-[var(--accent)] mb-1" />
      <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
        {t('local_time', language)}
      </span>
      <span className="text-2xl font-[var(--font-heading)] font-bold text-[var(--accent)] tabular-nums">{clock}</span>
    </GlassPanel>
  );
}
