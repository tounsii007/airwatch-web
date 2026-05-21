'use client';

/**
 * Top-right live status overlay: animated dot + flight count. The dot
 * encodes connection health (loading → amber pulse, error → red), so
 * even at-a-glance you can tell whether the feed is healthy.
 *
 * Kept as its own component to keep {@link MapView} focused on map
 * orchestration — the "tell me what's going on" surface is here.
 */
import { CountUp } from '@/components/ui';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  count: number;
  isLoading: boolean;
  hasError: boolean;
  language: AppLanguage;
}

export function MapStatusOverlay({ count, isLoading, hasError, language }: Props) {
  return (
    <div
      className="absolute top-3 right-3 z-[1000] glass-panel px-3 py-1.5 pointer-events-none animate-fade-in rounded-lg"
      style={{ animationDelay: '60ms' }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2">
        {isLoading && (
          <div
            className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse-glow"
            aria-hidden="true"
          />
        )}
        {hasError && (
          <div
            className="w-2 h-2 rounded-full bg-[var(--error)]"
            aria-hidden="true"
          />
        )}
        <span className="text-[var(--text-primary)] text-xs font-[var(--font-heading)] tracking-wider tabular">
          <CountUp value={count} />{' '}
          <span className="text-[var(--text-muted)]">{t('flights_upper', language)}</span>
        </span>
      </div>
    </div>
  );
}
