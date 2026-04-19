'use client';

import Link from 'next/link';
import { BarChart2, ChevronRight } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { SectionPanel } from '@/app/settings/SectionPanel';
import type { AppLanguage } from '@/lib/types';

/** Link to the /stats page, rendered as a settings-style row. */
export function MyStatsSection({ language }: { language: AppLanguage }) {
  return (
    <SectionPanel icon={<BarChart2 size={12} />} title={t('my_statistics', language)}>
      <Link
        href="/stats"
        className="flex items-center justify-between py-2 text-sm font-[var(--font-body)] text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <BarChart2 size={16} className="text-[var(--primary)]" />
          {t('stats', language)}
        </div>
        <ChevronRight size={14} className="text-[var(--text-muted)]" />
      </Link>
    </SectionPanel>
  );
}
