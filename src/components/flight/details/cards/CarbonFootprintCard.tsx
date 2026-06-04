'use client';

/**
 * CarbonFootprintCard — "CARBON FOOTPRINT" glass tile for the flight detail panel.
 *
 * Promotes the former inline {@link Co2Footer} into a titled glass card so the
 * estimated CO2 emissions read as a first-class section rather than a footer
 * strip. The body is unchanged:
 *
 *   - When an estimate exists, shows `~<co2Kg> kg CO2`, the great-circle
 *     distance in km, and the per-passenger label.
 *   - When the estimate is null/undefined, falls back to the existing
 *     "unavailable" copy.
 *
 * The Share button (with its copied → check-icon state) is preserved verbatim.
 */

import { Check, Leaf, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
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

export function CarbonFootprintCard({ language, co2Estimate, copied, onShare }: Props) {
  return (
    <GlassPanel className="rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Leaf size={14} className="text-[var(--success)]" aria-hidden />
        <span className="text-xs font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
          CARBON FOOTPRINT
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
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
    </GlassPanel>
  );
}
