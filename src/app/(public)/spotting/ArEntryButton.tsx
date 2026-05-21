'use client';

import Link from 'next/link';
import { ChevronRight, ScanEye } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';

/**
 * Links to the live AR spotting view. Visible on the /spotting page.
 * Wrapped in a GlassPanel with interactive hover lift so the call-to-
 * action reads as "tap me to start", not as a passive caption.
 */
export function ArEntryButton() {
  const language = useSettingsStore((s) => s.language);
  return (
    <Link href="/ar" aria-label={t('ar_open_sky_view', language)} className="block">
      <GlassPanel
        interactive
        className="p-3 flex items-center gap-3 rounded-xl hover:bg-[var(--primary)]/10 transition-colors"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--primary) 16%, transparent)',
            boxShadow: '0 0 0 1px color-mix(in srgb, var(--primary) 28%, transparent), 0 0 24px -6px var(--primary)',
            color: 'var(--primary)',
          }}
          aria-hidden
        >
          <ScanEye size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)]">
            AR-MODUS
          </div>
          <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
            Kamera zum Himmel halten und Flüge live sehen
          </div>
        </div>
        <ChevronRight size={14} className="text-[var(--primary)] shrink-0" aria-hidden />
      </GlassPanel>
    </Link>
  );
}
