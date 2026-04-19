import { describe, expect, it, beforeAll } from 'vitest';
import { loadAllForTesting, loadLocale, t, type Dictionary } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

/**
 * Contract check: every language map has the same set of keys.
 * A missing key in DE/FR = silent fallback in the UI, which we want to catch.
 */
describe('translations dictionary', () => {
  let all: Record<AppLanguage, Dictionary>;
  let baselineKeys: Set<string>;

  beforeAll(async () => {
    all = await loadAllForTesting();
    baselineKeys = new Set(Object.keys(all.en));
  });

  it('has EN/DE/FR dictionaries', () => {
    expect(Object.keys(all).sort()).toEqual(['de', 'en', 'fr']);
  });

  it.each(['de', 'fr'] as const)(
    'language "%s" covers every key from the baseline (en)',
    (lang) => {
      const missing = [...baselineKeys].filter((k) => !(k in all[lang]));
      expect(missing, `${lang} is missing keys`).toHaveLength(0);
    },
  );

  it.each(['de', 'fr'] as const)(
    'language "%s" introduces no keys the baseline lacks',
    (lang) => {
      const extras = Object.keys(all[lang]).filter((k) => !baselineKeys.has(k));
      expect(extras, `${lang} has rogue keys`).toHaveLength(0);
    },
  );

  it.each(['en', 'de', 'fr'] as const)(
    'language "%s" has no empty string values',
    (lang) => {
      const empty = Object.entries(all[lang])
        .filter(([, v]) => typeof v === 'string' && v.trim() === '')
        .map(([k]) => k);
      expect(empty, `${lang} has empty translations`).toHaveLength(0);
    },
  );
});

describe('t()', () => {
  beforeAll(async () => {
    await loadLocale('de');
    await loadLocale('fr');
  });

  it('returns the translated string for a known key', () => {
    expect(t('airports', 'en')).toBe('AIRPORTS');
  });

  it('returns the key itself when nothing matches (fail-open)', () => {
    // @ts-expect-error — deliberately using an unknown key at runtime
    expect(t('this_key_does_not_exist', 'en')).toBe('this_key_does_not_exist');
  });
});
