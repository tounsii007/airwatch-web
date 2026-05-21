'use client';

import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/** Local-time clock card shown next to the weather. */
export function ClockPanel({ clock, language }: { clock: string; language: AppLanguage }) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--accent)]" aria-hidden />
          {t('local_time', language)}
        </span>
      }
      bare
      bodyClassName="px-3 pb-3 pt-1 flex flex-col items-center justify-center"
    >
      <span className="text-2xl font-[var(--font-heading)] font-bold text-[var(--accent)] tabular-nums tracking-wider">
        {clock}
      </span>
    </Card>
  );
}
