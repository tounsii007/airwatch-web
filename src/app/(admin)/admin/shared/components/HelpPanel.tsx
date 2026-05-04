/**
 * Inline help / runbook panel.
 *
 * <p>Collapsible panel ("?" affordance in a card header) that renders a
 * page-specific runbook in plain markdown. The point is to put the
 * "what does this page mean / what do I do when X happens" knowledge
 * one click away from the data, instead of in a wiki the operator
 * forgets to check.
 *
 * <h3>Why a tiny inline parser instead of react-markdown</h3>
 * react-markdown + remark-gfm pulls ~120kB of JS. The runbooks need
 * exactly: headings (#, ##), bold (**text**), inline code (`code`),
 * unordered lists (-), and paragraphs. ~80 lines of custom parsing
 * gives us those without bloating the bundle. Anything more complex
 * belongs in a real wiki, not a help panel.
 *
 * <h3>Persistence</h3>
 * Open/closed state is stored in localStorage per pageId, so an
 * operator who keeps "?" expanded on the audit page doesn't have to
 * re-open it on every page load.
 */
'use client';

import { useEffect, useState } from 'react';
import { renderMarkdown } from '@/app/(admin)/admin/shared/components/Markdown';

interface Props {
  /**
   * Stable identifier per page — used as the localStorage key for the
   * open/closed state. Keep it short and human-readable, e.g. "audit",
   * "ports", "quota".
   */
  pageId: string;
  /** Heading shown next to the "?" button. Defaults to "Runbook". */
  title?: string;
  /**
   * Runbook content in a tiny markdown subset. Supports:
   *   * `# Heading` / `## Subheading`
   *   * `**bold**`
   *   * `` `code` ``
   *   * `- bullet`
   *   * blank-line-separated paragraphs
   */
  markdown: string;
  /** Default-open on first visit. Defaults to false (collapsed). */
  defaultOpen?: boolean;
}

const STORAGE_KEY = 'airwatch.admin.help.open';

export function HelpPanel({ pageId, title = 'Runbook', markdown, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  // After mount, restore the per-page preference. Before mount we render
  // the SSR default so hydration is stable.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const map = raw ? JSON.parse(raw) as Record<string, boolean> : {};
      if (typeof map[pageId] === 'boolean') setOpen(map[pageId]);
    } catch {
      /* ignore — storage may be disabled */
    }
    setHydrated(true);
  }, [pageId]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const map = raw ? JSON.parse(raw) as Record<string, boolean> : {};
      map[pageId] = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }

  return (
    <div style={{
      marginBottom: '0.75rem',
      border: '1px solid var(--border)',
      borderRadius: 6,
      background: 'var(--sunken)',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`help-${pageId}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: '100%',
          padding: '0.5rem 0.85rem',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-heading)',
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          cursor: 'pointer',
          textAlign: 'left' as const,
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--info) 15%, transparent)',
          color: 'var(--info)',
          fontSize: '0.7rem',
          fontWeight: 700,
        }}>?</span>
        <span style={{ flex: 1 }}>{title}</span>
        <span aria-hidden="true" style={{
          display: 'inline-block',
          transition: 'transform 200ms',
          transform: hydrated && open ? 'rotate(90deg)' : 'rotate(0)',
          color: 'var(--text-muted)',
        }}>▸</span>
      </button>
      {hydrated && open && (
        <div
          id={`help-${pageId}`}
          style={{
            padding: '0.5rem 1rem 1rem 2.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.8125rem',
            lineHeight: 1.55,
            borderTop: '1px solid var(--border)',
          }}
        >
          {renderMarkdown(markdown)}
        </div>
      )}
    </div>
  );
}

// Markdown rendering moved to the shared Markdown component so the
// incident postmortem view uses the exact same parser.
