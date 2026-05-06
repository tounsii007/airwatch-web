/**
 * Client-side i18n context. (Phase 3.6)
 *
 * The active locale comes from a cookie ({@code airwatch_locale}) read
 * server-side; this provider receives it as a prop and exposes a
 * {@link useT} hook for descendant components.
 *
 * <h3>SSR + hydration</h3>
 * Because the locale arrives as a prop (set on the server from the
 * cookie), the initial client render uses the same dictionary as the
 * server. No flash-of-untranslated-content.
 *
 * <h3>Switching</h3>
 * {@link LanguageSwitcher} writes the cookie + reloads. We deliberately
 * don't try to swap dictionaries in-place — that would require every
 * server-rendered string to re-render, and the easiest way to achieve
 * that is router.refresh(). One reload is acceptable for an action that
 * happens once per operator session.
 */
'use client';

import { createContext, useContext } from 'react';
import { translate, formatNumber, formatDate, formatRelative,
         type LocaleCode, type TranslationParams,
         DEFAULT_LOCALE } from './messages';

interface I18nValue {
  locale: LocaleCode;
  t: (key: string, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, key, params),
});

export function I18nProvider({ locale, children }: { locale: LocaleCode; children: React.ReactNode }) {
  const value: I18nValue = {
    locale,
    t: (key, params) => translate(locale, key, params),
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Translate-function hook with optional params for ICU pluralization +
 * named placeholders. Returns the verbatim key if no entry exists.
 */
export function useT() {
  return useContext(I18nContext).t;
}

/** Read the current locale (e.g. for date/number formatting hints). */
export function useLocale(): LocaleCode {
  return useContext(I18nContext).locale;
}

/** Locale-aware number formatter hook. */
export function useFormatNumber() {
  const locale = useLocale();
  return (n: number, options?: Intl.NumberFormatOptions) => formatNumber(n, locale, options);
}

/** Locale-aware date formatter hook. */
export function useFormatDate() {
  const locale = useLocale();
  return (d: Date | string | number, options?: Intl.DateTimeFormatOptions) => formatDate(d, locale, options);
}

/** Locale-aware "X minutes ago" formatter hook. */
export function useFormatRelative() {
  const locale = useLocale();
  return (deltaMs: number) => formatRelative(deltaMs, locale);
}
