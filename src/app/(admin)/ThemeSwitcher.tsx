'use client';

import { useEffect, useState } from 'react';

/**
 * Theme picker for the admin shell.
 *
 * <h3>How the wiring fits together</h3>
 *
 * 1. {@link THEME_BOOTSTRAP_SCRIPT} (rendered in the layout's <head>)
 *    runs synchronously before the first paint. It reads the saved
 *    theme from localStorage and stamps the matching `theme-*` class on
 *    {@code <html>}, so the page never flashes the wrong palette.
 *
 * 2. This component reads the same key on mount, mirrors it into React
 *    state for a controlled selector, and on change writes back to
 *    localStorage AND swaps the class on {@code <html>} so the new
 *    theme applies immediately without a reload.
 *
 * 3. CSS variables in admin.css are scoped under
 *    `.admin-shell.theme-X` so the palette switch is one class swap,
 *    no per-element style recalc beyond CSS-variable inheritance.
 */

export interface ThemeOption {
  id: 'auto' | 'dark' | 'light' | 'soft' | 'slate';
  label: string;
  description: string;
  /** A CSS gradient that previews the theme inside the picker. */
  swatch: string;
}

export const AVAILABLE_THEMES: readonly ThemeOption[] = [
  {
    id: 'auto',
    label: 'Auto (system)',
    description: 'Follows your OS dark/light preference automatically.',
    swatch: 'linear-gradient(135deg, #0A1628 0%, #0A1628 50%, #F5F7FA 50%, #F5F7FA 100%)',
  },
  {
    id: 'dark',
    label: 'Dark (default)',
    description: 'Deep navy. The original AirWatch admin look.',
    swatch: 'linear-gradient(135deg, #0A1628 0%, #1A2E48 100%)',
  },
  {
    id: 'light',
    label: 'Light',
    description: 'Crisp white background, deep slate text. Daylight desks.',
    swatch: 'linear-gradient(135deg, #F5F7FA 0%, #EDF1F7 100%)',
  },
  {
    id: 'soft',
    label: 'Soft sepia',
    description: 'Warm paper tone. Easier on the eyes for long shifts.',
    swatch: 'linear-gradient(135deg, #FAF6EE 0%, #F1E9D6 100%)',
  },
  {
    id: 'slate',
    label: 'Slate',
    description: 'Muted low-contrast dark. Night ops without glare.',
    swatch: 'linear-gradient(135deg, #1A1F2E 0%, #2E3445 100%)',
  },
];

const STORAGE_KEY = 'airwatch.admin.theme';
const DEFAULT_THEME: ThemeOption['id'] = 'auto';

/**
 * Apply a theme to the document root. For 'auto', resolve via
 * matchMedia(prefers-color-scheme) — light OS preference → 'light',
 * dark OS preference → 'dark'. The actual class on <html> is always
 * one of the concrete theme-* values; 'auto' is just the SOURCE of
 * the choice, not a CSS class on its own.
 */
function applyTheme(id: ThemeOption['id']) {
  const resolved = resolveTheme(id);
  const html = document.documentElement;
  for (const t of AVAILABLE_THEMES) html.classList.remove(`theme-${t.id}`);
  html.classList.add(`theme-${resolved}`);
}

function resolveTheme(id: ThemeOption['id']): Exclude<ThemeOption['id'], 'auto'> {
  if (id !== 'auto') return id;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * In-head script string. Reads localStorage and applies the theme
 * BEFORE first paint so there's no white-flash on a light theme
 * landing on the default-dark CSS.
 *
 * Inlined as a string so we can stamp it via <script dangerouslySetInnerHTML>
 * with a CSP nonce. Pure DOM API, no React, no module deps.
 */
export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}') || '${DEFAULT_THEME}';
    var allowed = ['auto','dark','light','soft','slate'];
    if (allowed.indexOf(t) === -1) t = '${DEFAULT_THEME}';
    // Resolve 'auto' against the OS preference RIGHT NOW so the first
    // paint already uses the right palette — no flash of wrong theme.
    var resolved = t;
    if (t === 'auto') {
      try {
        resolved = (window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      } catch (_) { resolved = 'dark'; }
    }
    var html = document.documentElement;
    var concretes = ['dark','light','soft','slate'];
    for (var i = 0; i < concretes.length; i++) html.classList.remove('theme-' + concretes[i]);
    html.classList.add('theme-' + resolved);

    // Listen for OS theme changes while in 'auto' mode and re-apply.
    if (t === 'auto' && window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: light)');
      var onChange = function (e) {
        var r = e.matches ? 'light' : 'dark';
        for (var j = 0; j < concretes.length; j++) html.classList.remove('theme-' + concretes[j]);
        html.classList.add('theme-' + r);
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  } catch (_) { /* private mode / disabled storage — keep CSS defaults */ }
})();
`;

export function ThemeSwitcher() {
  const [active, setActive] = useState<ThemeOption['id']>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let saved: ThemeOption['id'] = DEFAULT_THEME;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) as ThemeOption['id'] | null;
      if (raw && AVAILABLE_THEMES.some((t) => t.id === raw)) saved = raw;
    } catch {
      /* storage blocked — fall through to default */
    }
    setActive(saved);
    setMounted(true);
  }, []);

  function pick(id: ThemeOption['id']) {
    setActive(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
    applyTheme(id);
  }

  return (
    <section className="admin-card">
      <h2>Appearance</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
        Choose a colour theme for the admin shell. Stored in this browser
        only ({STORAGE_KEY}); other devices keep their own selection.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {AVAILABLE_THEMES.map((t) => {
          // Before mount we don't know which theme is selected — every
          // tile renders neutral so the SSR HTML doesn't disagree with
          // the eventual client state (suppresses hydration warnings).
          const isActive = mounted && t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => pick(t.id)}
              aria-pressed={isActive}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                padding: '0.75rem',
                border: `1px solid ${isActive ? 'var(--primary-bright)' : 'var(--border)'}`,
                borderRadius: 6,
                background: isActive ? 'color-mix(in srgb, var(--primary-bright) 8%, transparent)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
                fontFamily: 'inherit',
                transition: 'border-color 150ms, background 150ms',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  height: 48,
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: t.swatch,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8125rem', color: 'var(--primary-bright)' }}>
                  {t.label}
                </span>
                {isActive && (
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '0.625rem',
                      color: 'var(--success)',
                      letterSpacing: '0.1em',
                    }}
                    suppressHydrationWarning
                  >
                    ● ACTIVE
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                {t.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
