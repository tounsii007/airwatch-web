'use client';

/**
 * Skip-to-content link. Invisible until a keyboard user Tabs onto it;
 * then it slides in from the top-left and offers a one-keystroke jump
 * past the nav chrome straight to the page's main landmark.
 *
 * Required by WCAG 2.4.1 (Bypass Blocks) — without it, every keyboard
 * user has to Tab through the bottom nav, header buttons, and the
 * brand wordmark before reaching the actual page content.
 *
 * Pairs with `<main id="main-content">` in the root layout.
 */
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

export function SkipToContent() {
  const language = useSettingsStore((s) => s.language);
  return (
    <a
      href="#main-content"
      className="fixed top-2 left-2 z-[2000] -translate-y-20 focus:translate-y-0 transition-transform duration-150 px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--bg)] font-[var(--font-heading)] text-xs font-bold tracking-wider shadow-[0_0_24px_-6px_var(--primary)]"
    >
      {t('skip_to_content', language)}
    </a>
  );
}
