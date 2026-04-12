'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Map, Search, Radio, Star, Settings, Package } from 'lucide-react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { t } from '@/lib/i18n/translations';

const tabDefs = [
  { href: '/', icon: Map, labelKey: 'nav_map' },
  { href: '/search', icon: Search, labelKey: 'nav_search' },
  { href: '/airports', icon: Radio, labelKey: 'nav_airports' },
  { href: '/cargo', icon: Package, labelKey: 'nav_cargo' },
  { href: '/saved', icon: Star, labelKey: 'nav_saved' },
  { href: '/settings', icon: Settings, labelKey: 'nav_settings' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const language = useSettingsStore((s) => s.language);
  const favCount = useFavoritesStore((s) => s.items.length);

  const tabs = tabDefs.map((tab) => ({
    ...tab,
    label: t(tab.labelKey, language),
  }));

  return (
    <>
      {/* Desktop: Top header bar */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 z-50 h-12 items-center px-6 glass-panel rounded-none border-b border-[var(--glass-border)] border-x-0 border-t-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <span className="neon-text font-[var(--font-heading)] text-sm font-bold text-[var(--primary)]">
            AIRWATCH
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {tabs.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 text-xs font-[var(--font-heading)] font-bold tracking-wider ${
                  isActive
                    ? 'bg-[var(--primary)]/12 text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5'
                }`}
              >
                <span className="relative">
                  <Icon size={14} className={isActive ? 'drop-shadow-[0_0_6px_var(--primary)]' : ''} />
                  {href === '/saved' && favCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--error)] text-white text-[7px] font-bold px-0.5">
                      {favCount}
                    </span>
                  )}
                </span>
                {label}
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-[var(--primary)] shadow-[0_0_4px_var(--primary)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile: Bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel rounded-none border-t border-[var(--glass-border)] border-x-0 border-b-0">
        <div className="flex justify-around py-2 px-2">
          {tabs.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <Icon size={isActive ? 22 : 20} className={isActive ? 'drop-shadow-[0_0_8px_var(--primary)]' : ''} />
                <span className="text-[8px] font-[var(--font-heading)] font-bold tracking-widest">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
