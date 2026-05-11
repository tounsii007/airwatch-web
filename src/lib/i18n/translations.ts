/**
 * Type-safe, lazy-loaded i18n.
 *
 *   - `en.json` is bundled eagerly — it is both the fallback and the baseline
 *     that defines the legal set of keys.
 *   - `de.json` / `fr.json` are code-split by Next.js and fetched on demand
 *     when the user selects that locale.
 *   - `TranslationKey` is derived from the EN dictionary so TypeScript catches
 *     typos like `t('nav_geofenvces', 'en')`.
 *
 * `t()` is synchronous: at render time it reads from an in-memory cache. Call
 * `loadLocale(locale)` once at app boot (and on every locale change) to
 * populate that cache. While a non-EN locale is still loading, `t()` falls
 * back to EN — fast enough that users don't see raw keys flicker.
 */

import type { AppLanguage } from '@/lib/types';
import enDictionary from '@/lib/i18n/locales/en.json';

/** Every valid translation key, derived from the EN dictionary. */
export type TranslationKey = keyof typeof enDictionary;

/** Read-only view of a single language's dictionary. */
export type Dictionary = Readonly<Record<TranslationKey, string>>;

const cache: Partial<Record<AppLanguage, Dictionary>> = {
  en: enDictionary as Dictionary,
};

const loaders: Record<Exclude<AppLanguage, 'en'>, () => Promise<{ default: Dictionary }>> = {
  de: () => import('@/lib/i18n/locales/de.json') as Promise<{ default: Dictionary }>,
  fr: () => import('@/lib/i18n/locales/fr.json') as Promise<{ default: Dictionary }>,
  es: () => import('@/lib/i18n/locales/es.json') as Promise<{ default: Dictionary }>,
  it: () => import('@/lib/i18n/locales/it.json') as Promise<{ default: Dictionary }>,
  ar: () => import('@/lib/i18n/locales/ar.json') as Promise<{ default: Dictionary }>,
  pl: () => import('@/lib/i18n/locales/pl.json') as Promise<{ default: Dictionary }>,
  nl: () => import('@/lib/i18n/locales/nl.json') as Promise<{ default: Dictionary }>,
  tr: () => import('@/lib/i18n/locales/tr.json') as Promise<{ default: Dictionary }>,
};

/**
 * Eagerly load a locale's dictionary into the cache. Call this when the user
 * changes the language so subsequent `t()` lookups are cache hits.
 */
export async function loadLocale(locale: AppLanguage): Promise<Dictionary> {
  if (cache[locale]) return cache[locale]!;
  if (locale === 'en') return cache.en!;

  const loader = loaders[locale];
  if (!loader) return cache.en!;

  const mod = await loader();
  cache[locale] = mod.default;
  return mod.default;
}

/**
 * Get a translated string by key and locale.
 * Falls back to English, then returns the key itself (never `undefined`).
 */
export function t(key: TranslationKey, locale: AppLanguage): string {
  return cache[locale]?.[key] ?? cache.en![key] ?? key;
}

/**
 * Test-only: returns all three dictionaries, eagerly loaded. The parity test
 * lives in translations.test.ts and uses this to assert that DE/FR cover the
 * same keys as EN.
 *
 * @internal
 */
export async function loadAllForTesting(): Promise<Record<AppLanguage, Dictionary>> {
  const [de, fr, es, it, ar, pl, nl, tr] = await Promise.all([
    loaders.de(),
    loaders.fr(),
    loaders.es(),
    loaders.it(),
    loaders.ar(),
    loaders.pl(),
    loaders.nl(),
    loaders.tr(),
  ]);
  return {
    en: enDictionary as Dictionary,
    de: de.default,
    fr: fr.default,
    es: es.default,
    it: it.default,
    ar: ar.default,
    pl: pl.default,
    nl: nl.default,
    tr: tr.default,
  };
}
