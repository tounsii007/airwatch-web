'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';

/**
 * Syncs the theme setting to the <html> element's class list.
 * - 'dark' → adds 'dark', removes 'light'
 * - 'light' → adds 'light', removes 'dark'
 * - 'system' → matches prefers-color-scheme
 */
export function ThemeProvider() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    function applyTheme(mode: 'dark' | 'light') {
      if (mode === 'light') {
        root.classList.remove('dark');
        root.classList.add('light');
      } else {
        root.classList.remove('light');
        root.classList.add('dark');
      }
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    applyTheme(theme);
  }, [theme]);

  return null;
}
