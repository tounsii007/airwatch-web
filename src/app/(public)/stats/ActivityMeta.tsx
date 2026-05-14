'use client';

import { Calendar, CalendarClock, Flame } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { ActivitySummary } from '@/app/(public)/stats/statsMetrics';
import { formatNumber, formatShortDate, localeOf } from '@/app/(public)/stats/format';

interface Props {
  summary: ActivitySummary;
  language: AppLanguage;
}

function Cell({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <GlassPanel className="px-3 py-2.5 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `color-mix(in srgb, var(${accent}) 14%, transparent)`,
          color: `var(${accent})`,
          boxShadow: `0 0 0 1px color-mix(in srgb, var(${accent}) 30%, transparent)`,
        }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">{label}</div>
        <div className="text-sm font-[var(--font-heading)] font-bold text-[var(--text-primary)] truncate">{value}</div>
        {hint && (
          <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">{hint}</div>
        )}
      </div>
    </GlassPanel>
  );
}

/**
 * Three-cell "how you've been using the app" strip — tracking-since,
 * days-active, peak day. Only renders when we have something to say.
 */
export function ActivityMeta({ summary, language }: Props) {
  if (summary.trackingSince === null) return null;

  const since = formatShortDate(summary.trackingSince, language);
  const peakLabel = summary.peakDay
    ? new Date(summary.peakDay).toLocaleDateString(localeOf(language), {
        day: '2-digit',
        month: 'short',
      })
    : '—';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Cell
        icon={<CalendarClock size={18} strokeWidth={2.25} />}
        label={t('tracking_since', language)}
        value={since}
        accent="--info"
      />
      <Cell
        icon={<Calendar size={18} strokeWidth={2.25} />}
        label={t('days_active', language)}
        value={formatNumber(summary.daysActive, language)}
        accent="--success"
      />
      <Cell
        icon={<Flame size={18} strokeWidth={2.25} />}
        label={t('peak_day', language)}
        value={peakLabel}
        hint={`${formatNumber(summary.peakDayViews, language)} ${t('times_viewed', language)}`}
        accent="--warning"
      />
    </div>
  );
}
