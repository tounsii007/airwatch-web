'use client';

/**
 * Singleton toast renderer. Mount once at the root of the layout (next
 * to BottomNav). Reads the toast store and renders a stacked column of
 * notifications in the bottom-right (desktop) / top-centre (mobile)
 * corner. Each entry schedules its own auto-dismiss based on the
 * `duration` carried on the entry.
 */

import { useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useToastStore, type ToastEntry } from './toast';

const VARIANT_CLASS: Record<ToastEntry['variant'], string> = {
  default: 'border-[var(--glass-border-strong)]',
  success: 'border-[var(--success)]/45',
  warning: 'border-[var(--warning)]/45',
  error:   'border-[var(--error)]/45',
  info:    'border-[var(--info)]/45',
};

const VARIANT_ICON: Record<ToastEntry['variant'], React.ReactNode> = {
  default: null,
  success: <CheckCircle2 size={16} className="text-[var(--success)] shrink-0" aria-hidden />,
  warning: <AlertTriangle size={16} className="text-[var(--warning)] shrink-0" aria-hidden />,
  error:   <AlertCircle  size={16} className="text-[var(--error)] shrink-0" aria-hidden />,
  info:    <Info         size={16} className="text-[var(--info)] shrink-0" aria-hidden />,
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  // Schedule auto-dismiss timers per-toast. Each entry's `duration` may
  // differ, so we run one timer per active toast and tear it down when
  // the toast disappears (manual dismiss or unmount).
  useEffect(() => {
    const timers = toasts
      .filter((t) => t.duration > 0)
      .map((t) =>
        window.setTimeout(() => dismiss(t.id), t.duration),
      );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed z-[2000] top-14 lg:top-auto lg:bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 flex flex-col gap-2 w-[min(90vw,360px)]"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === 'error' ? 'alert' : 'status'}
          aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
          className={`pointer-events-auto glass-panel-floating animate-slide-up flex items-start gap-2 px-3 py-2.5 rounded-xl border ${VARIANT_CLASS[t.variant]}`}
        >
          {VARIANT_ICON[t.variant]}
          <div className="flex-1 min-w-0">
            <div className="t-body font-medium text-[var(--text-primary)] truncate">
              {t.title}
            </div>
            {t.body && (
              <div className="t-meta text-[var(--text-muted)] mt-0.5">{t.body}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 -mr-1 -mt-0.5 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
