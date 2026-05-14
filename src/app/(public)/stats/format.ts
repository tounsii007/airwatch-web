import type { AppLanguage } from '@/lib/types';

const LOCALE_MAP: Record<AppLanguage, string> = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  ar: 'ar-EG',
  pl: 'pl-PL',
  nl: 'nl-NL',
  tr: 'tr-TR',
};

export function localeOf(language: AppLanguage): string {
  return LOCALE_MAP[language] ?? 'en-US';
}

/**
 * Locale-aware short date — used inside list rows so DE users see
 * "14.05.2026" while EN users see "5/14/2026" without us shipping
 * per-locale format strings.
 */
export function formatShortDate(timestamp: number, language: AppLanguage): string {
  return new Date(timestamp).toLocaleDateString(localeOf(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * "Today" / "Yesterday" / "N days ago" — falls back to a short date
 * past 7 days so a long history doesn't degenerate into "453 days ago".
 * `now` is injectable for deterministic tests.
 */
export function formatRelativeDate(
  timestamp: number,
  language: AppLanguage,
  now: number = Date.now(),
): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diffDays = Math.floor((startOfDay(now) - startOfDay(timestamp)) / 86_400_000);

  if (diffDays <= 0) return relativeLabel('today', language);
  if (diffDays === 1) return relativeLabel('yesterday', language);
  if (diffDays < 7) return relativeLabel('days_ago', language).replace('{0}', String(diffDays));
  return formatShortDate(timestamp, language);
}

type RelativeKey = 'today' | 'yesterday' | 'days_ago';

const FALLBACK: Record<RelativeKey, Record<AppLanguage, string>> = {
  today:     { en: 'Today',     de: 'Heute',     fr: "Aujourd'hui", es: 'Hoy',     it: 'Oggi',    ar: 'اليوم',     pl: 'Dziś',    nl: 'Vandaag', tr: 'Bugün' },
  yesterday: { en: 'Yesterday', de: 'Gestern',   fr: 'Hier',        es: 'Ayer',    it: 'Ieri',    ar: 'الأمس',     pl: 'Wczoraj', nl: 'Gisteren', tr: 'Dün' },
  days_ago:  { en: '{0}d ago',  de: 'vor {0} T', fr: 'il y a {0}j', es: 'hace {0}d', it: '{0}g fa', ar: 'منذ {0} يوم', pl: '{0} dni temu', nl: '{0}d geleden', tr: '{0} gün önce' },
};

function relativeLabel(key: RelativeKey, language: AppLanguage): string {
  return FALLBACK[key][language] ?? FALLBACK[key].en;
}

/** Locale-aware integer / decimal formatting, e.g. 1_234 → "1,234" / "1.234". */
export function formatNumber(
  value: number,
  language: AppLanguage,
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat(localeOf(language), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
