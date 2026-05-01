'use client';

/**
 * Owns the open/closed state for the Cmd+K palette and registers the
 * global hotkey listener. Mounted once at the layout root.
 *
 * Hotkey rules:
 *   * `Cmd+K` (Mac) / `Ctrl+K` (everywhere else): always opens.
 *   * `/` opens too — but only when no <input>, <textarea>, or
 *     contentEditable element has focus, so the user can still type
 *     "/" inside a search field without trapping it.
 */
import { useCallback, useEffect, useState } from 'react';
import { CommandPalette } from '@/components/layout/CommandPalette';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function CommandPaletteController() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K — works everywhere, even inside inputs (overrides
      // the browser's "focus address bar" default on most platforms).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      // Bare `/` — opens only when not typing into a field.
      if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return <CommandPalette open={open} onClose={close} />;
}
