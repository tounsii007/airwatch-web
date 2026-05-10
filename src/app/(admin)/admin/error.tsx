'use client';

/**
 * Admin shell error boundary (Next.js App Router convention).
 *
 * Catches render-time errors in any admin route. Operators see a
 * focused fallback that:
 *   * Names the route they were on (so they can include it in a bug
 *     report without context-switching).
 *   * Shows the {@code digest} ref so the trace can be cross-
 *     referenced with the api side {@code admin_frontend_error} table.
 *   * Posts a richer report to {@code /admin/api/frontend-errors}
 *     than the public boundary — admin pages already authenticate, so
 *     attaching the username + session_id has no privacy cost.
 *
 * Distinct from the public {@code (public)/error.tsx} which posts to
 * {@code /api/client-error} (anonymous sink). The admin sink lives on
 * a different table that the AlertsPanel polls — admin errors should
 * page on-call, public errors shouldn't.
 */
import Link from 'next/link';
import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    void fetch('/admin/api/frontend-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 8000),
        url: typeof window !== 'undefined' ? window.location.href : '',
        path,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ts: Date.now(),
        // Tag so the receiver can route admin errors to the alerts
        // pipeline (the public sink has no notion of severity).
        kind: 'admin-shell-render',
      }),
      keepalive: true,
    }).catch(() => {
      // Don't let the reporter itself throw — that would loop into
      // the same boundary on the next render.
    });
  }, [error]);

  return (
    <section
      className="admin-card"
      role="alert"
      aria-live="assertive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
        borderLeft: '3px solid var(--error)',
      }}
    >
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '1.25rem',
        letterSpacing: '0.15em',
        color: 'var(--error)',
        margin: 0,
        textTransform: 'uppercase',
      }}>
        Admin shell render error
      </h1>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: '0.875rem',
        maxWidth: '36rem',
        lineHeight: 1.5,
      }}>
        This admin page failed to render. The error has been posted to
        the frontend-error sink and will appear on the Errors page.
      </p>
      {error.digest && (
        <code style={{
          fontFamily: 'monospace',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          background: 'var(--sunken)',
          padding: '4px 8px',
          borderRadius: 3,
          letterSpacing: '0.05em',
        }}>
          digest: {error.digest}
        </code>
      )}
      <details style={{ width: '100%', maxWidth: '40rem', marginTop: '0.5rem' }}>
        <summary style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.625rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          cursor: 'pointer',
        }}>
          Stack trace (raw)
        </summary>
        <pre style={{
          marginTop: 8,
          padding: '0.6rem 0.8rem',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          fontSize: '0.7rem',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          textAlign: 'left',
        }}>
          {error.stack ?? error.message}
        </pre>
      </details>
      <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '0.5rem 1.2rem',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--primary-bright)',
            background: 'transparent',
            border: '1px solid var(--primary-bright)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
        <Link
          href="/admin/dashboard"
          style={{
            padding: '0.5rem 1.2rem',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
