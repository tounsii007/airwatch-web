'use client';

import { AlertTriangle, Check, RefreshCw, Star, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';

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
 * close. Visual state follows the refresh status. Uses the shared IconButton
 * primitive so hover, focus, and active scale stay consistent across the app.
 */
export function DetailsHeaderActions({
  size, isRefreshing, refreshStatus, isFav, onRefresh, onToggleFavorite, onClose,
}: Props) {
  // IconButton size is the chrome dim (sm = 28px). The icon size prop is
  // independent — pass it through so the parent can still tune per-platform
  // (size=12 on mobile, size=16 on desktop) without us hard-coding either.
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <IconButton
        aria-label="Refresh"
        onClick={onRefresh}
        variant="ghost"
        size="sm"
      >
        {refreshStatus === 'success' ? (
          <Check size={size} className="text-[var(--success)]" />
        ) : refreshStatus === 'error' ? (
          <AlertTriangle size={size} className="text-[var(--error)]" />
        ) : (
          <RefreshCw size={size} className={`text-[var(--primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
        )}
      </IconButton>
      <IconButton
        aria-label="Toggle favorite"
        onClick={onToggleFavorite}
        variant="ghost"
        size="sm"
      >
        <Star size={size} className={isFav ? 'text-[var(--accent)] fill-[var(--accent)]' : 'text-[var(--text-muted)]'} />
      </IconButton>
      <IconButton
        aria-label="Close"
        onClick={onClose}
        variant="ghost"
        size="sm"
      >
        <X size={size} className="text-[var(--text-muted)]" />
      </IconButton>
    </div>
  );
}
