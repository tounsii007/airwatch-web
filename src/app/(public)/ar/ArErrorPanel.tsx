'use client';

import { AlertTriangle } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface Props {
  title: string;
  message: string;
  onRetry?: () => void;
}

/** Fullscreen error card for unrecoverable AR failures (denied perms, no sensors). */
export function ArErrorPanel({ title, message, onRetry }: Props) {
  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex items-center justify-center p-6 z-40">
      <GlassPanel className="w-full max-w-md p-6 text-center space-y-4">
        <AlertTriangle size={32} className="mx-auto text-[var(--warning)]" />
        <div>
          <div className="text-sm font-[var(--font-heading)] font-bold text-[var(--text-primary)] tracking-wider">{title}</div>
          <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)] mt-1">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer"
          >
            ERNEUT VERSUCHEN
          </button>
        )}
      </GlassPanel>
    </div>
  );
}
