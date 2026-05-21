'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BarChart2, ChevronRight, Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SectionPanel } from '@/app/(public)/settings/SectionPanel';
import { SettingRow } from '@/app/(public)/settings/SettingPrimitives';
import { useStatsStore } from '@/lib/stores/statsStore';
import { toast } from '@/components/ui/toast';
import type { AppLanguage } from '@/lib/types';

/** Link to /stats + destructive reset action with Dialog confirmation. */
export function MyStatsSection({ language }: { language: AppLanguage }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const clearStats = useStatsStore((s) => s.clearStats);
  const viewCount = useStatsStore((s) => s.viewedFlights.length);

  const handleConfirmReset = () => {
    clearStats();
    setConfirmOpen(false);
    toast({ title: t('stats_cleared', language), variant: 'default', duration: 3000 });
  };

  // The confirm body has a plural-aware form (1 flight vs. n flights). Each
  // locale provides both keys; we pick the right one at render time.
  const confirmBody = viewCount === 1
    ? t('reset_statistics_confirm_one', language)
    : t('reset_statistics_confirm', language).replace('{0}', String(viewCount));

  return (
    <>
      <SectionPanel icon={<BarChart2 size={12} />} title={t('my_statistics', language)}>
        <div className="divide-y divide-[var(--glass-border)]">
          {/* Navigation row to full stats page */}
          <SettingRow icon={<BarChart2 size={16} className="text-[var(--primary)]" />} label={t('stats', language)}>
            <Link
              href="/stats"
              className="flex items-center gap-1 text-xs font-[var(--font-heading)] tracking-wide text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
              aria-label={t('stats', language)}
            >
              <ChevronRight size={14} />
            </Link>
          </SettingRow>

          {/* Reset row — only shown when there's data to clear */}
          {viewCount > 0 && (
            <SettingRow
              icon={<Trash2 size={16} className="text-[var(--error)]" />}
              label={t('reset_statistics', language)}
              hint={
                viewCount === 1
                  ? t('view_count_tracked_one', language)
                  : t('view_count_tracked', language).replace('{0}', String(viewCount))
              }
            >
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="text-xs font-[var(--font-heading)] tracking-wide px-2.5 py-1 rounded-lg border border-[var(--error)]/30 text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors"
              >
                {t('clear', language)}
              </button>
            </SettingRow>
          )}
        </div>
      </SectionPanel>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('reset_statistics', language)}
        description={confirmBody}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              {t('cancel', language)}
            </Button>
            <Button
              variant="danger"
              size="sm"
              leadingIcon={<Trash2 size={14} />}
              onClick={handleConfirmReset}
            >
              {t('clear', language)}
            </Button>
          </div>
        }
      >
        <div className="flex items-center justify-center py-2">
          <span
            className="inline-flex items-center justify-center w-12 h-12 rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--error) 12%, transparent)',
              boxShadow: '0 0 0 1px color-mix(in srgb, var(--error) 28%, transparent)',
              color: 'var(--error)',
            }}
          >
            <Trash2 size={22} />
          </span>
        </div>
      </Dialog>
    </>
  );
}
