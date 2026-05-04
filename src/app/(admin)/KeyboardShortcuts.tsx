'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/(admin)/Toast';

/**
 * Keyboard shortcuts for the admin shell.
 *
 * Operators love keyboard nav — switching between Dashboard / Security /
 * Errors during an incident is faster than clicking. We mirror the
 * Gmail / Linear convention of "g <letter>" two-key navigation:
 *
 *     g d → /admin/dashboard
 *     g p → /admin/ports
 *     g s → /admin/security
 *     g h → /admin/health
 *     g i → /admin/instances
 *     g e → /admin/endpoints
 *     g u → /admin/users
 *     g f → /admin/features
 *     g v → /admin/events
 *     g q → /admin/quota
 *     g y → /admin/system
 *     g r → /admin/errors
 *     g c → /admin/cache
 *     g j → /admin/jobs
 *     g t → /admin/settings
 *     ?   → show shortcuts overlay
 *
 * Single-key shortcuts (no `g` prefix):
 *     /   → focus the page's search box (if present)
 *     r   → trigger the layout's RefreshButton
 *     ?   → toggle the shortcuts cheat-sheet overlay
 *
 * Disabled when the user is typing in an input/textarea/contentEditable.
 */

const NAV_MAP: Record<string, { path: string; label: string }> = {
  d: { path: '/admin/dashboard', label: 'Dashboard' },
  p: { path: '/admin/ports',     label: 'Ports' },
  s: { path: '/admin/security',  label: 'Security' },
  h: { path: '/admin/health',    label: 'Health' },
  i: { path: '/admin/instances', label: 'Instances' },
  e: { path: '/admin/endpoints', label: 'Endpoints' },
  u: { path: '/admin/users',     label: 'Users' },
  f: { path: '/admin/features',  label: 'Features' },
  v: { path: '/admin/events',    label: 'Events' },
  q: { path: '/admin/quota',     label: 'Quota' },
  y: { path: '/admin/system',    label: 'System' },
  r: { path: '/admin/errors',    label: 'Errors' },
  c: { path: '/admin/cache',     label: 'Cache' },
  j: { path: '/admin/jobs',      label: 'Jobs' },
  t: { path: '/admin/settings',  label: 'Settings' },
};

const G_PREFIX_TIMEOUT_MS = 1500; // window after `g` to press the second key

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t.isContentEditable
  );
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const toast  = useToast();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let gPrefixActive = false;
    let gTimer: number | null = null;

    function clearG() {
      gPrefixActive = false;
      if (gTimer != null) { window.clearTimeout(gTimer); gTimer = null; }
    }

    function onKey(e: KeyboardEvent) {
      // Bypass when the user is typing — we don't want `r` in a form
      // input to navigate away.
      if (isTypingTarget(e)) return;
      // Bypass on Cmd/Ctrl/Alt to leave OS shortcuts alone.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Help overlay toggle.
      if (key === '?') {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Two-key `g <letter>` nav.
      if (gPrefixActive) {
        const target = NAV_MAP[key];
        if (target) {
          e.preventDefault();
          router.push(target.path);
        }
        clearG();
        return;
      }

      if (key === 'g') {
        gPrefixActive = true;
        gTimer = window.setTimeout(clearG, G_PREFIX_TIMEOUT_MS);
        return;
      }

      // Single-key shortcuts.
      if (key === '/') {
        const search = document.querySelector<HTMLInputElement>('input[type="search"]');
        if (search) {
          e.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearG();
    };
  }, [router, toast]);

  if (!showHelp) return null;

  return (
    <ShortcutsOverlay onClose={() => setShowHelp(false)} />
  );
}

function ShortcutsOverlay({ onClose }: { onClose: () => void }) {
  // Close on ESC.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          maxWidth: 560,
          width: '100%',
          color: 'var(--text-primary)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 id="shortcuts-title" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.875rem',
            letterSpacing: '0.15em',
            color: 'var(--primary-bright)',
            margin: 0,
          }}>
            KEYBOARD SHORTCUTS
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem 1.25rem' }}>
          {Object.entries(NAV_MAP).map(([k, v]) => (
            <ShortcutRow key={k} keys={['g', k]} label={v.label} />
          ))}
        </div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem 1.25rem' }}>
          <ShortcutRow keys={['/']} label="Focus search" />
          <ShortcutRow keys={['?']} label="Toggle this help" />
          <ShortcutRow keys={['Esc']} label="Close overlays" />
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.8125rem' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ display: 'inline-flex', gap: 4 }}>
        {keys.map((k) => (
          <kbd key={k} style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.625rem',
            background: 'var(--surface-light)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '0.15rem 0.45rem',
            minWidth: 18,
            textAlign: 'center',
          }}>{k}</kbd>
        ))}
      </span>
    </div>
  );
}
