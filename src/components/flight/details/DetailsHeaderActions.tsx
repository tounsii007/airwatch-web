'use client';

import { AlertTriangle, Check, RefreshCw, Star, X } from 'lucide-react';

export type RefreshStatus = 'idle' | 'success' | 'error';

interface Props {
  size: number;
  isRefreshing: boolean;
  refreshStatus: RefreshStatus;
  isFav: boolean;
  onRefresh: () => void;
  onToggleFavorite: () => void;
  onClose: () => void;
}

/**
 * Header action buttons for the flight details panel — refresh, star/favorite,
 * close. Visual state follows the refresh status.
 */
export function DetailsHeaderActions({
  size, isRefreshing, refreshStatus, isFav, onRefresh, onToggleFavorite, onClose,
}: Props) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-white/5 relative" aria-label="Refresh">
        {refreshStatus === 'success' ? (
          <Check size={size} className="text-[var(--success)]" />
        ) : refreshStatus === 'error' ? (
          <AlertTriangle size={size} className="text-[var(--error)]" />
        ) : (
          <RefreshCw size={size} className={`text-[var(--primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
        )}
      </button>
      <button onClick={onToggleFavorite} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Toggle favorite">
        <Star size={size} className={isFav ? 'text-[var(--accent)] fill-[var(--accent)]' : 'text-[var(--text-muted)]'} />
      </button>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Close">
        <X size={size} className="text-[var(--text-muted)]" />
      </button>
    </div>
  );
}
