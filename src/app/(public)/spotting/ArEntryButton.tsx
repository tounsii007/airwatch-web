'use client';

import Link from 'next/link';
import { ScanEye } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';

/** Links to the live AR spotting view. Visible on the /spotting page. */
export function ArEntryButton() {
  const language = useSettingsStore((s) => s.language);
  return (
    <Link href="/ar" aria-label={t('ar_open_sky_view', language)}>
      <GlassPanel className="p-3 flex items-center gap-3 hover:bg-[var(--primary)]/10 transition-colors cursor-pointer">
        <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary)] shrink-0">
          <ScanEye size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)]">
            AR-MODUS
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
            Kamera zum Himmel halten und Flüge live sehen
          </div>
        </div>
        <span className="text-[10px] font-[var(--font-heading)] tracking-widest text-[var(--primary)]">&rarr;</span>
      </GlassPanel>
    </Link>
  );
}
