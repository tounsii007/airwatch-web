/**
 * Server-side locale resolver. Reads the {@code airwatch_locale} cookie
 * set by {@link LanguageSwitcher}. Defaults to {@link DEFAULT_LOCALE}
 * when missing or unknown.
 *
 * <p>Server components call this at render time and pass the result
 * down to {@link I18nProvider} so the initial client tree shares the
 * same dictionary.
 */
import { cookies } from 'next/headers';
import { type LocaleCode, DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from './messages';

// Re-export for back-compat with anything that imported COOKIE_NAME
// from this module before. New code should import LOCALE_COOKIE_NAME
// from ./messages directly to avoid pulling next/headers transitively.
export const COOKIE_NAME = LOCALE_COOKIE_NAME;

export async function getLocale(): Promise<LocaleCode> {
  try {
    const store = await cookies();
    const raw = store.get(LOCALE_COOKIE_NAME)?.value;
    if (raw === 'de' || raw === 'en') return raw;
  } catch {
    // cookies() throws outside a request scope (e.g. during build) — fall through.
  }
  return DEFAULT_LOCALE;
}
