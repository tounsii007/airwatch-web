'use client';

/**
 * Floating banner that surfaces a {@link useFlightStore} `error` value
 * in a glanceable way. The mapping from raw error code → user-facing
 * title + hint string lives here so {@link MapView} stays focused on
 * map orchestration rather than i18n branching.
 *
 *   <MapApiErrorBanner error="rate_limited" language="en" />
 *
 * Returns `null` when `error` is `null` — caller can render it
 * unconditionally without a guard.
 */
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface ErrorCopy {
  title: string;
  hint: string;
}

function lookup(error: string, language: AppLanguage): ErrorCopy {
  if (error.includes('month_limit')) {
    return { title: t('api_limit_reached', language), hint: t('api_limit_hint', language) };
  }
  if (error === 'network_error') {
    return { title: t('api_network_error', language), hint: t('api_network_hint', language) };
  }
  if (error.includes('proxy')) {
    return { title: t('api_proxy_error', language), hint: t('api_proxy_hint', language) };
  }
  if (error === 'rate_limited') {
    return { title: t('api_rate_limited', language), hint: t('api_rate_hint', language) };
  }
  return { title: t('api_error', language), hint: t('api_error_hint', language) };
}

interface Props {
  error: string | null;
  language: AppLanguage;
}

export function MapApiErrorBanner({ error, language }: Props) {
  if (!error) return null;
  const { title, hint } = lookup(error, language);
  return (
    <div
      className="absolute top-12 left-3 right-3 z-[999] glass-panel-elevated border border-[var(--error)]/40 bg-[var(--error)]/8 px-3 py-2 pointer-events-none animate-scale-in rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <p className="text-[10px] font-[var(--font-heading)] font-bold text-[var(--error)] tracking-wider">
        {title}
      </p>
      <p className="text-[9px] font-[var(--font-body)] text-[var(--text-secondary)] mt-0.5">
        {hint}
      </p>
    </div>
  );
}
