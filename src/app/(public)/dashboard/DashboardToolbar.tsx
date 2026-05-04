'use client';

/**
 * Dashboard-wide controls: sort dropdown + manual refresh button +
 * last-updated indicator. Sits below the title, above the cards. Uses
 * the same glass-panel idiom as the rest of the page so it doesn't
 * read as foreign chrome.
 */
import { ArrowUpDown, RefreshCw } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
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
  return (
    <GlassPanel className="flex items-center justify-between gap-3 px-3 py-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <ArrowUpDown size={14} className="text-[var(--text-muted)]" aria-hidden />
        <span className="t-meta t-mono text-[var(--text-muted)] tracking-widest uppercase">
          sort
        </span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortMode)}
          className="t-label t-mono bg-transparent text-[var(--text-primary)] outline-none cursor-pointer"
          aria-label="Sort dashboard airports by"
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
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw
            size={14}
            className={`text-[var(--primary)] ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden
          />
        </button>
      </div>
    </GlassPanel>
  );
}
