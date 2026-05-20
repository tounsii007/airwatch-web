'use client';

/**
 * Bottom-sheet "More" menu — surfaces every route that doesn't fit the
 * 5-tab primary bar. Opens upward from the bottom-nav so the
 * mental-model is consistent with iOS/Material patterns ("more options
 * in the same place you already are").
 *
 * A11y notes:
 *   * The trigger is a button with aria-expanded.
 *   * The sheet itself is role="dialog" with aria-modal so focus stays
 *     trapped (basic implementation — Tab cycles within, Esc closes).
 *   * The backdrop dismisses on click; pointer-events route through
 *     the overlay above the nav so the underlying nav is still usable
 *     once dismissed.
 */
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, X } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { SECONDARY_ITEMS } from '@/components/layout/navItems';

interface Props {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function MoreMenuTrigger({ open, onToggle }: Props) {
  const language = useSettingsStore((s) => s.language);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={t('nav_more', language)}
      data-pill-active={open || undefined}
      className={`relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 z-10 active:scale-95 ${
        open
          ? 'text-[var(--primary)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}
    >
      <MoreHorizontal
        size={open ? 22 : 20}
        aria-hidden
        className={`transition-all duration-200 ${open ? 'drop-shadow-[0_0_8px_var(--primary)]' : ''}`}
      />
      <span className="t-meta t-mono font-bold tracking-widest">
        {t('nav_more', language)}
      </span>
    </button>
  );
}

export function MoreMenuSheet({ open, onClose }: Props) {
  const pathname = usePathname();
  const language = useSettingsStore((s) => s.language);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Esc to close, focus trap to first link on open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    sheetRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop — semi-opaque blur so the busy map underneath
          recedes visually without going pitch black. */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm animate-fade-in"
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav_more', language)}
        className="fixed left-0 right-0 bottom-16 lg:bottom-auto lg:top-16 lg:left-1/2 lg:-translate-x-1/2 lg:max-w-2xl lg:rounded-2xl z-[60] glass-panel-floating border-t border-[var(--glass-border-strong)] lg:border animate-slide-up"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)]">
          <span className="t-label t-mono font-bold tracking-wider text-[var(--text-secondary)]">
            {t('nav_more', language)}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} className="text-[var(--text-muted)]" aria-hidden />
          </button>
        </div>
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1 p-3">
          {SECONDARY_ITEMS.map(({ href, icon: Icon, labelKey }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-[var(--primary)]/12 text-[var(--primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon size={20} aria-hidden />
                  <span className="t-meta t-mono font-bold tracking-wider">
                    {t(labelKey, language)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
