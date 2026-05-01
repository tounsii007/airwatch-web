'use client';

/**
 * Live-updating activity feed. Polls the rejection-events endpoint every
 * REFRESH_MS and animates new items into the list at the top with a
 * smooth fade-up. Old items slide down and eventually scroll off.
 *
 * Why a client component (the rest of the dashboard is server-rendered):
 *   This is the one tile where freshness matters. The KPI cards and the
 *   port grid don't need to update every 5 s — they're statistical
 *   snapshots. The rejection feed is forensic: an operator wants to see
 *   "what's happening RIGHT NOW", not "what was happening 30 s ago".
 *
 * The animation uses CSS keyframes only — no JS-driven layout work, so
 * even a 60 fps refresh under sustained attack stays smooth.
 */
import { useEffect, useState } from 'react';

interface RejectEvent {
  id: number;
  occurred_at: string;
  ip: string;
  country_code: string | null;
  method: string;
  path: string;
  reason: string;
  user_agent: string | null;
}

const REFRESH_MS = 5000;
const MAX_ITEMS = 30;

export function LiveFeed({ initial }: { initial: readonly RejectEvent[] }) {
  const [items, setItems] = useState<RejectEvent[]>([...initial].slice(0, MAX_ITEMS));

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch('/admin/api/monitoring/unauthorized-events?limit=30', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const next = (await res.json()) as RejectEvent[];
        if (cancelled) return;
        setItems(next.slice(0, MAX_ITEMS));
      } catch {
        // Network blip is fine — next tick will retry.
      }
    };
    const interval = setInterval(tick, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '2rem 0',
          color: 'var(--text-muted)',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>
          All quiet
        </div>
        <div style={{ opacity: 0.6 }}>No rejected requests in the recent window.</div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        maxHeight: 360,
        overflow: 'auto',
        paddingRight: 4,
      }}
    >
      {items.map((e, idx) => (
        <FeedRow key={e.id} event={e} isNewest={idx === 0} />
      ))}
    </div>
  );
}

function FeedRow({ event, isNewest }: { event: RejectEvent; isNewest: boolean }) {
  const reasonColor =
    event.reason.includes('rate')   ? 'var(--warning)' :
    event.reason.includes('hmac')   ? 'var(--error)' :
    event.reason.includes('forbid') ? 'var(--error)' :
                                      'var(--info)';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 110px 1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 4,
        background: isNewest ? 'color-mix(in srgb, var(--error) 5%, transparent)' : 'transparent',
        animation: isNewest ? 'live-row-in 400ms cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
        fontSize: '0.75rem',
        fontFamily: 'var(--font-heading)',
        borderLeft: `2px solid ${reasonColor}`,
      }}
    >
      <span
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.6875rem',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {new Date(event.occurred_at).toLocaleTimeString()}
      </span>
      <span
        style={{
          color: 'var(--primary-bright)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={event.ip}
      >
        {event.ip}
      </span>
      <span
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={`${event.method} ${event.path}`}
      >
        <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{event.method}</span>
        {event.path}
      </span>
      <span
        style={{
          fontSize: '0.625rem',
          color: reasonColor,
          background: `color-mix(in srgb, ${reasonColor} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${reasonColor} 22%, transparent)`,
          padding: '1px 5px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
        }}
      >
        {event.reason}
      </span>
      <style>{`
        @keyframes live-row-in {
          from { transform: translateY(-4px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
