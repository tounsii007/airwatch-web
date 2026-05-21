'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import { formatNumber } from '@/app/(public)/stats/format';

interface Props {
  /** 24-element array, one entry per hour-of-day (local time). */
  buckets: number[];
  language: AppLanguage;
}

/**
 * Tiny CSS-only 24-bar histogram of when the user has been opening
 * flight details. No charting library — each bar is a single div whose
 * height is set inline, so the bundle stays untouched. Tooltips on
 * hover show the absolute view count for that hour.
 */
export function ActivityChart({ buckets, language }: Props) {
  const max = useMemo(() => Math.max(1, ...buckets), [buckets]);
  const total = useMemo(() => buckets.reduce((a, b) => a + b, 0), [buckets]);
  // Find the peak hour label — computed unconditionally (hooks rules).
  const peakHour = useMemo(() => {
    const idx = buckets.indexOf(Math.max(...buckets));
    return `${String(idx).padStart(2, '0')}:00`;
  }, [buckets]);

  if (total === 0) return null;

  return (
    <Card
      title={t('activity_by_hour', language)}
      subtitle={`Peak: ${peakHour}`}
      bare
      bodyClassName="px-4 pb-4 pt-1"
    >
      <div className="flex items-end justify-between gap-[2px] h-20" role="img" aria-label={t('activity_by_hour', language)}>
        {buckets.map((value, hour) => {
          const height = Math.max(4, Math.round((value / max) * 100));
          const isPeak = value === max && value > 0;
          return (
            <div
              key={hour}
              className="flex-1 flex flex-col items-center justify-end h-full group"
              title={`${String(hour).padStart(2, '0')}:00 — ${formatNumber(value, language)}`}
            >
              <div
                className="w-full rounded-sm transition-all group-hover:opacity-100"
                style={{
                  height: `${height}%`,
                  background: isPeak
                    ? 'linear-gradient(180deg, var(--primary-bright), var(--primary))'
                    : 'color-mix(in srgb, var(--primary) 35%, transparent)',
                  boxShadow: isPeak ? '0 0 8px color-mix(in srgb, var(--primary) 45%, transparent)' : undefined,
                  opacity: isPeak ? 1 : 0.7,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </Card>
  );
}
