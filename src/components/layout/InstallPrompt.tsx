'use client';

/**
 * "Install AirWatch" toast.
 *
 * Captures the `beforeinstallprompt` event Chrome / Edge fire when the
 * PWA install criteria are met (HTTPS, valid manifest, service worker
 * registered, not already installed). Shows a small actionable toast
 * the user can use to install with one click — much higher conversion
 * than the address-bar icon, which most users don't notice.
 *
 * <h3>Hide rules</h3>
 *   * Already-installed (`appinstalled` event has fired in this session
 *     OR the page is running in standalone display-mode).
 *   * User dismissed it — we remember in localStorage and don't show
 *     again for 14 days, so we don't nag.
 *   * Browser doesn't support the API (Safari iOS — they have their
 *     own "Add to Home Screen" flow that we don't gate).
 */
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';

const DISMISS_KEY = 'airwatch.install-prompt.dismissed-at';
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const language = useSettingsStore((s) => s.language);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Hide if running standalone — the user already installed.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setHidden(true);
      return;
    }

    // Hide if dismissed within the snooze window.
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
      if (at && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
        setHidden(true);
        return;
      }
    } catch { /* private mode — show as if never dismissed */ }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // suppress Chrome's default mini-bar
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || !deferred) return null;

  async function handleInstall() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice; // user clicked OK or Cancel — either way, deferred is single-use.
    } catch { /* user closed the native dialog — fine */ }
    setDeferred(null);
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode */ }
    setDeferred(null);
    setHidden(true);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[calc(100%-2rem)]
                 rounded-xl border border-[var(--primary)]/35
                 bg-[var(--bg-card,_#0f1d32)]/95 backdrop-blur
                 shadow-[0_8px_32px_rgba(0,0,0,0.45)] p-4
                 flex items-center gap-3"
    >
      <Download size={20} className="text-[var(--primary)] shrink-0" />
      <div className="flex-1 min-w-0">
        <div id="install-prompt-title" className="text-sm font-[var(--font-heading)] text-[var(--text-primary)]">
          {t('install_prompt_title', language)}
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
          {t('install_prompt_hint', language)}
        </div>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="px-3 py-1.5 rounded-md text-xs font-[var(--font-heading)] tracking-wide
                   bg-[var(--primary)]/15 text-[var(--primary)]
                   hover:bg-[var(--primary)]/25 transition-colors"
      >
        {t('install_prompt_action', language)}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('install_prompt_dismiss', language)}
        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
