'use client';

/**
 * Last-resort error boundary. Catches errors in the root layout itself
 * (where `app/error.tsx` doesn't run because it's INSIDE the layout
 * that just crashed). Renders its own minimal <html> tree.
 *
 * Don't depend on layout styles, theme provider, fonts here — those
 * may be exactly what failed. Inline styles only.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 4000),
        scope: 'global',
        url: typeof window !== 'undefined' ? window.location.href : '',
        ts: Date.now(),
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#0A0A0A',
          color: '#E2E8F0',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', color: '#EF4444', letterSpacing: '0.1em' }}>
          AIRWATCH — FATAL ERROR
        </h1>
        <p style={{ fontSize: '0.875rem', maxWidth: '32rem', opacity: 0.8 }}>
          The root application layout failed to render. This is logged
          server-side. Please reload the page.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '0.5rem 1.5rem',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#5A8FBA',
            cursor: 'pointer',
            letterSpacing: '0.1em',
            fontSize: '0.875rem',
          }}
        >
          RELOAD
        </button>
      </body>
    </html>
  );
}
