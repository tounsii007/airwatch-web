'use client';

/**
 * Dashboard-wide controls: sort dropdown + manual refresh button +
 * last-updated indicator. Sits below the title, above the cards. Uses
 * the IconButton primitive for the refresh affordance and keeps the
 * sort select inline for native dropdown behaviour.
 */
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { IconButton } from '@/components/ui/IconButton';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { SORT_LABELS, type SortMode } from '@/app/(public)/dashboard/sortAirports';

interface Props {
  sort: SortMode;
  onSortChange: (next: SortMode) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: number | null;
}

function formatRelative(ms: number | null): string {
  if (!ms) return '—';
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export function DashboardToolbar({
  sort,
  onSortChange,
  onRefresh,
  isRefreshing,
  lastUpdated,
}: Props) {
  const language = useSettingsStore((s) => s.language);
  return (
    <GlassPanel className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl">
      <label className="flex items-center gap-2 cursor-pointer">
        <ArrowUpDown size={14} className="text-[var(--text-muted)]" aria-hidden />
        <span className="t-meta t-mono text-[var(--text-muted)] tracking-widest uppercase">
          sort
        </span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortMode)}
          className="t-label t-mono bg-transparent text-[var(--text-primary)] outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded"
          aria-label={t('dashboard_sort_label', language)}
        >
          {(Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(([key, label]) => (
            <option key={key} value={key} className="bg-[var(--surface)]">
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <span
          className="t-meta t-mono text-[var(--text-muted)] hidden sm:inline tabular"
          aria-live="polite"
        >
          Updated {formatRelative(lastUpdated)}
        </span>
        <IconButton
          aria-label={t('dashboard_refresh_label', language)}
          onClick={onRefresh}
          loading={isRefreshing}
          variant="ghost"
          size="sm"
        >
          <RefreshCw size={14} className="text-[var(--primary)]" aria-hidden />
        </IconButton>
      </div>
    </GlassPanel>
  );
}
