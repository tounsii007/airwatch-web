'use client';

import { Check, Leaf, Share2 } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Co2Estimate {
  co2Kg: number;
  distKm: number;
}

interface Props {
  language: AppLanguage;
  co2Estimate: Co2Estimate | null | undefined;
  copied: boolean;
  onShare: () => void;
}

/** CO₂ footer with per-passenger emissions + share button. */
export function Co2Footer({ language, co2Estimate, copied, onShare }: Props) {
  return (
    <div className="px-4 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
      {co2Estimate ? (
        <div className="flex items-center gap-2">
          <Leaf size={14} className="text-[var(--success)]" />
          <div>
            <span className="text-xs font-[var(--font-heading)] font-bold text-[var(--success)]">
              ~{co2Estimate.co2Kg} kg CO2
            </span>
            <span className="text-[9px] text-[var(--text-muted)] ml-1.5">
              {co2Estimate.distKm.toLocaleString()} km · {t('co2_per_pax', language)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Leaf size={12} className="text-[var(--text-muted)]" />
          <span className="text-[9px] text-[var(--text-muted)]">{t('co2_unavailable', language)}</span>
        </div>
      )}
      <button
        onClick={onShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer"
        aria-label={t('share', language)}
      >
        {copied ? <Check size={12} /> : <Share2 size={12} />}
        {copied ? t('copied', language) : t('share', language)}
      </button>
    </div>
  );
}
