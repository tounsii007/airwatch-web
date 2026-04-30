'use client';

/**
 * Per-route error boundary (Next.js App Router convention).
 *
 * Catches errors thrown during render of any page under /. The user sees
 * a styled fallback instead of a blank screen. Stack traces stay client-
 * side; we ship only a sanitised summary to the server.
 *
 * `app/global-error.tsx` is the layer above this — it catches errors in
 * the root layout itself (where this boundary doesn't exist yet because
 * the layout failed to render).
 */
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort report to the server-side log sink. `keepalive` lets
    // the request survive a navigation away from this errored page so
    // the report still reaches Loki even if the user immediately
    // refreshes.
    void fetch('/api/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        stack: error.stack?.slice(0, 4000), // cap so we don't spam Loki
        url: typeof window !== 'undefined' ? window.location.href : '',
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ts: Date.now(),
      }),
      keepalive: true,
    }).catch(() => {
      // Don't let the error reporter itself throw — that would loop.
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <h1 className="text-2xl font-[var(--font-heading)] text-[var(--error)] tracking-wider">
        SOMETHING WENT WRONG
      </h1>
      <p className="text-[var(--text-secondary)] text-sm max-w-md font-[var(--font-body)]">
        AirWatch hit an unexpected error rendering this page. The team&apos;s
        log stack already received a report — you can retry below.
      </p>
      {error.digest && (
        <code className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider opacity-60">
          ref: {error.digest}
        </code>
      )}
      <button
        type="button"
        onClick={reset}
        className="glass-panel px-6 py-2 mt-4 hover:bg-white/10 transition-colors text-sm font-[var(--font-heading)] tracking-wider text-[var(--primary)]"
      >
        TRY AGAIN
      </button>
    </div>
  );
}
