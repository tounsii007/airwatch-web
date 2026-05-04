'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Manual data-refresh control for the admin pages.
 *
 * <h3>Why a button instead of pure auto-polling</h3>
 * The dashboard already has client components that re-poll on their
 * own (LiveFeed, LoadCurves, etc.) — those handle the "what's
 * happening RIGHT NOW" use case. Pages without internal polling
 * (KPI strips, audit log, port table) are server-rendered once when
 * the route is hit. An operator who wants to see if the numbers
 * changed in the last 30 s shouldn't have to wait for the SSR cache
 * window to expire — they hit Refresh and the server component
 * re-runs.
 *
 * <h3>Mechanics</h3>
 *   * `router.refresh()` re-runs every server component for the
 *     current route. fetchJson hits its endpoints with no-store
 *     caching, so the data is genuinely fresh from the api.
 *   * `useTransition` keeps the click responsive — the button
 *     updates its visual state immediately while the refresh
 *     runs in the background.
 *   * Three visual states:
 *       idle    → 🔄 Refresh
 *       loading → … Refreshing (rotating icon)
 *       just-refreshed → ✓ Updated (clears after 1.5 s)
 *     Operators get a clear "I clicked, it worked" signal without
 *     waiting for the page to repaint.
 */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [justDone, setJustDone] = useState(false);

  function onClick() {
    setJustDone(false);
    start(() => {
      router.refresh();
      // useTransition resolves when the navigation completes — but
      // it does NOT take a callback; we approximate "done" with a
      // microtask after start() returns. setTimeout(0) lets the
      // refresh start, then a follow-up timer flips the visual cue
      // back to idle 1.5 s later.
      setTimeout(() => setJustDone(true), 100);
      setTimeout(() => setJustDone(false), 1600);
    });
  }

  const label = pending  ? 'Refreshing…'
              : justDone ? 'Updated'
              : 'Refresh';
  const icon  = pending  ? '⟳'
              : justDone ? '✓'
              : '↻';
  const tone  = justDone ? 'var(--success)'
              : 'var(--text-secondary)';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="Re-fetch all server-rendered data on this page"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: 'var(--font-heading)',
        fontSize: '0.7rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: tone,
        background: 'transparent',
        border: '1px solid color-mix(in srgb, var(--border) 100%, transparent)',
        padding: '0.3rem 0.7rem',
        borderRadius: 4,
        cursor: pending ? 'wait' : 'pointer',
        transition: 'color 200ms, border-color 200ms',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          fontSize: '0.85rem',
          // Spin only while a refresh is in flight — using inline keyframes
          // avoids dragging in another CSS file just for one animation.
          animation: pending ? 'admin-refresh-spin 0.9s linear infinite' : 'none',
        }}
      >
        {icon}
      </span>
      {label}
      {/*
        scoped keyframes — defined here instead of admin.css so the
        component stays self-contained. Multiple instances on the page
        share the same @keyframes name, which is fine.
      */}
      <style>{`
        @keyframes admin-refresh-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
