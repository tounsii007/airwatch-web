/**
 * Locale toggle for the admin shell. (Phase 3.6)
 *
 * Writes the {@code airwatch_locale} cookie + reloads the page so
 * server-rendered strings re-resolve in the new dictionary.
 */
'use client';

import { useLocale } from '@/app/(admin)/i18n/I18nProvider';
import { LOCALE_LABEL, LOCALE_COOKIE_NAME, type LocaleCode } from '@/app/(admin)/i18n/messages';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const current = useLocale();

  function setLocale(next: LocaleCode) {
    if (next === current) return;
    // Cookie scoped to /admin so the public app isn't affected.
    // 1-year lifetime — the operator chose this consciously, no need to expire it.
    document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // Full reload (not router.refresh) because the i18n context is set
    // by the layout's server render — refresh re-renders pages but not
    // the layout itself.
    window.location.reload();
  }

  const options: LocaleCode[] = ['en', 'de'];

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: 'inline-flex',
        gap: 2,
        background: 'var(--sunken)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: 2,
      }}
    >
      {options.map(code => {
        const active = code === current;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            title={LOCALE_LABEL[code]}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: compact ? '0.625rem' : '0.7rem',
              letterSpacing: '0.08em',
              color: active ? 'var(--primary-bright)' : 'var(--text-muted)',
              background: active
                ? 'color-mix(in srgb, var(--primary-bright) 15%, transparent)'
                : 'transparent',
              border: 'none',
              padding: compact ? '2px 6px' : '4px 10px',
              borderRadius: 3,
              cursor: active ? 'default' : 'pointer',
              textTransform: 'uppercase' as const,
            }}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
