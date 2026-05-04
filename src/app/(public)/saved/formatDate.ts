import type { AppLanguage } from '@/lib/types';

const LOCALE_MAP: Record<AppLanguage, string> = {
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
};

/**
 * Format a unix-ms timestamp as a short date string (`dd/mm/yyyy`) in the
 * appropriate locale. Falls back to en-GB for unknown locales.
 */
export function formatDate(ts: number, language: AppLanguage): string {
  return new Date(ts).toLocaleDateString(LOCALE_MAP[language] ?? 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
