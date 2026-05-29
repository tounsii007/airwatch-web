'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/app/(admin)/Toast';
import { getCsrfToken } from '@/lib/csrfToken';

/**
 * Manual "Run now" trigger for a single ScheduledJob.
 *
 * <h3>States</h3>
 *   * idle      → "Run now" — initial, hover-able, clickable
 *   * running   → spinner + "Running…" — POST in flight
 *   * success   → ✓ (green) — POST returned ok; auto-clears after 2.5 s
 *   * error     → ✗ (red)   — POST returned non-2xx / network failure;
 *                              the button stays in error state until the
 *                              user clicks again, so transient failures
 *                              don't get hidden by the auto-clear.
 *
 * <h3>Why client-side fetch instead of a <form> POST</h3>
 * The form-POST flow (used elsewhere) submits the form, the server
 * sendRedirects, the browser navigates — net result: full page reload
 * with no mid-execution feedback. Operators clicking "Run AirLabs poll"
 * for a 30-second job would see nothing for 30 s then a fresh page.
 *
 * Client-side fetch lets us:
 *   1. Flip the button to "Running…" the instant the user clicks.
 *   2. Display ✓/✗ in place when the call returns.
 *   3. Trigger a server-component re-render via router.refresh() so the
 *      surrounding job card picks up the new lastFinish / runCount /
 *      lastError without a manual page reload.
 *
 * <h3>CSRF</h3>
 * /admin/jobs/{id}/run requires CSRF. We pull the live token from the
 * SessionHeartbeat-populated module store ({@code lib/csrfToken}) at
 * click time so a long-open page that sat through a token rotation
 * still uses the current value. The token is intentionally kept off
 * {@code window} so opportunistic readers (extensions, embedded
 * scripts) can't lift it.
 */

interface Props {
  jobId: string;
  /**
   * Initial CSRF token rendered into the page server-side. The
   * heartbeat keeps the module-scoped {@code lib/csrfToken} store in
   * sync so we prefer the live value when present, but the SSR token
   * covers the first-paint window before the heartbeat has fired.
   */
  csrfToken: string;
}

export function JobRunButton({ jobId, csrfToken }: Props) {
  const router = useRouter();
  const toast  = useToast();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle');

  async function trigger() {
    setState('idle');
    const liveToken = getCsrfToken() || csrfToken;
    try {
      const body = new URLSearchParams({ _csrf: liveToken });
      const res = await fetch(`/admin/jobs/${encodeURIComponent(jobId)}/run`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        // The api sendRedirects to /admin/jobs on success — we follow
        // it transparently. fetch() defaults to redirect:'follow' so
        // res.ok will reflect the final response.
      });
      if (res.ok || res.status === 200) {
        setState('success');
        toast.success(`Job "${jobId}" triggered.`);
        // Pull the updated job state into the surrounding card.
        startTransition(() => router.refresh());
        // Clear the success badge after a beat so the operator can
        // run the same job again without confusion.
        setTimeout(() => setState('idle'), 2500);
      } else {
        setState('error');
        toast.error(`Job "${jobId}" failed: HTTP ${res.status}`);
      }
    } catch (ex) {
      setState('error');
      toast.error(`Job "${jobId}" failed: ${ex instanceof Error ? ex.message : 'network error'}`);
    }
  }

  // Currently in flight (the network request itself OR the post-success
  // router.refresh() that re-reads the job state from the api).
  const inFlight = pending && state !== 'error';

  const label = inFlight       ? 'Running…'
              : state === 'success' ? 'Done'
              : state === 'error'   ? 'Failed'
              : 'Run now';

  const icon  = inFlight       ? '⟳'
              : state === 'success' ? '✓'
              : state === 'error'   ? '✗'
              : '▶';

  const color = state === 'success' ? 'var(--success)'
              : state === 'error'   ? 'var(--error)'
              : 'var(--primary-bright)';

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={inFlight}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: 'var(--font-heading)',
        fontSize: '0.6875rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        padding: '0.4rem 0.85rem',
        borderRadius: 4,
        cursor: inFlight ? 'wait' : 'pointer',
        transition: 'color 200ms, background 200ms, border-color 200ms',
      }}
      title={state === 'error' ? 'Last attempt failed — click to retry' : 'Trigger this job manually'}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          fontSize: '0.85rem',
          animation: inFlight ? 'admin-job-spin 0.9s linear infinite' : 'none',
        }}
      >
        {icon}
      </span>
      {label}
      <style>{`
        @keyframes admin-job-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
