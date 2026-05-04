'use client';

import { useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';

/**
 * CSV export trigger — wraps an existing /admin/api/export/*.csv
 * endpoint with a button that:
 *   1. Fires the request with the user's session cookie.
 *   2. Streams the body into a Blob, creates an object URL, clicks
 *      a hidden anchor with `download="<filename>"`, then revokes
 *      the URL. No round-trip through the page navigation history.
 *   3. Shows a Toast on completion (success or failure).
 *
 * Used in: /admin/security (audit), /admin/endpoints, /admin/users,
 * /admin/jobs, /admin/errors. Endpoints already exist Java-side; this
 * is the missing UI affordance.
 */

interface Props {
  /** Path under /admin/api, e.g. "/admin/api/export/audit.csv". */
  href: string;
  /** Suggested download filename — server might also send one in
   *  Content-Disposition; we use this as the local fallback. */
  filename: string;
  /** Button label, default "Export CSV". */
  label?: string;
  /** Compact mode for inline placement next to a section header. */
  compact?: boolean;
}

export function ExportButton({ href, filename, label = 'Export CSV', compact = false }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href, { credentials: 'same-origin' });
      if (!res.ok) {
        toast.error(`Export failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      // Trigger browser save dialog without navigating.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Filename — prefer server's Content-Disposition if it sent one.
      const cd = res.headers.get('content-disposition') ?? '';
      const m  = cd.match(/filename="?([^";]+)"?/i);
      a.download = m?.[1] ?? filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${a.download}`);
    } catch (e) {
      toast.error(`Network error during export`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      title={`Download ${filename}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: 'var(--font-heading)',
        fontSize: compact ? '0.65rem' : '0.7rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        background: 'transparent',
        border: '1px solid var(--border)',
        padding: compact ? '0.25rem 0.55rem' : '0.3rem 0.7rem',
        borderRadius: 4,
        cursor: busy ? 'wait' : 'pointer',
        transition: 'color 150ms, border-color 150ms',
      }}
    >
      <span aria-hidden="true">{busy ? '⟳' : '⬇'}</span>
      {busy ? 'Exporting…' : label}
    </button>
  );
}
