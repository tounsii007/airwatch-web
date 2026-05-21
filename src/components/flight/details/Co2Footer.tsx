'use client';

import { Check, Leaf, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
    <div className="px-4 py-4 border-b border-[var(--glass-border)] flex items-center justify-between gap-2">
      {co2Estimate ? (
        <div className="flex items-center gap-2 min-w-0">
          <Leaf size={14} className="text-[var(--success)] shrink-0" aria-hidden />
          <div className="min-w-0">
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
          <Leaf size={12} className="text-[var(--text-muted)]" aria-hidden />
          <span className="text-[9px] text-[var(--text-muted)]">{t('co2_unavailable', language)}</span>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={copied ? <Check size={12} /> : <Share2 size={12} />}
        onClick={onShare}
        aria-label={t('share', language)}
      >
        {copied ? t('copied', language) : t('share', language)}
      </Button>
    </div>
  );
}
