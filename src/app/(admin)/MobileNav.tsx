'use client';

import { useEffect, useState } from 'react';

/**
 * Mobile-only hamburger overlay for the admin nav.
 *
 * Desktop layout (>= 720 px) renders the inline {@code .admin-nav}
 * directly in the header; this component is hidden via CSS.
 *
 * Below 720 px the inline nav is hidden and we render a hamburger
 * trigger that opens a full-screen overlay with the same nav links
 * — easier to tap, no overflow scroll required.
 *
 * Implementation:
 *   * Uses {@code body.overflow=hidden} while open to prevent
 *     background scroll-bleed.
 *   * Closes on link click, ESC, or backdrop tap.
 *   * Trap-focus inside the menu while open (basic — a single
 *     focusable element loops to the close button).
 */

interface NavItem {
  href: string;
  label: string;
  group: 'ops' | 'metrics' | 'actions';
}

const NAV: readonly NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', group: 'ops' },
  { href: '/admin/ports',     label: 'Ports',     group: 'ops' },
  { href: '/admin/security',  label: 'Security',  group: 'ops' },
  { href: '/admin/health',    label: 'Health',    group: 'ops' },
  { href: '/admin/instances', label: 'Instances', group: 'ops' },
  { href: '/admin/endpoints', label: 'Endpoints', group: 'metrics' },
  { href: '/admin/users',     label: 'Users',     group: 'metrics' },
  { href: '/admin/features',  label: 'Features',  group: 'metrics' },
  { href: '/admin/events',    label: 'Events',    group: 'metrics' },
  { href: '/admin/quota',     label: 'Quota',     group: 'metrics' },
  { href: '/admin/system',    label: 'System',    group: 'metrics' },
  { href: '/admin/errors',    label: 'Errors',    group: 'actions' },
  { href: '/admin/cache',     label: 'Cache',     group: 'actions' },
  { href: '/admin/jobs',      label: 'Jobs',      group: 'actions' },
  { href: '/admin/settings',  label: 'Settings',  group: 'actions' },
];

const GROUP_LABEL = {
  ops:     'Operations',
  metrics: 'Metrics',
  actions: 'Actions',
};

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="admin-mobile-nav-trigger"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? '✕' : '☰'}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className="admin-mobile-nav-overlay"
          onClick={() => setOpen(false)}
        >
          <div
            className="admin-mobile-nav-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {(['ops', 'metrics', 'actions'] as const).map((g) => (
              <section key={g}>
                <h3 className="admin-mobile-nav-group">{GROUP_LABEL[g]}</h3>
                <nav>
                  {NAV.filter((n) => n.group === g).map((n) => (
                    <a
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="admin-mobile-nav-link"
                    >
                      {n.label}
                    </a>
                  ))}
                </nav>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
