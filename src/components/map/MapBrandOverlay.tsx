'use client';

/**
 * Top-left brand wordmark + transport-aware LIVE pill. Kept as a self-
 * contained overlay so the surrounding map component doesn't need to
 * know about the transport state machine just to render a label.
 *
 * The wordmark uses two stacked animations:
 *   * `gradient-text` — the standing brand gradient sheen.
 *   * `animate-neon-flicker` — a slow per-frame opacity wobble that
 *     reads as "powered on and breathing" against the static map tiles
 *     behind it (added in iteration 17).
 */
import { Tag } from '@/components/ui/Tag';

type Transport = 'websocket' | 'polling' | null | undefined | string;

function transportTitle(transport: Transport): string {
  if (transport === 'websocket') return 'WebSocket push';
  if (transport === 'polling') return 'HTTP polling';
  return '';
}

export function MapBrandOverlay({ transport }: { transport: Transport }) {
  return (
    <div className="absolute top-3 left-3 z-[1000] flex items-center gap-3 pointer-events-none animate-fade-in">
      <span className="gradient-text font-[var(--font-heading)] font-bold tracking-[0.2em] text-lg animate-neon-flicker">
        AIRWATCH
      </span>
      <span
        className="animate-fade-in"
        style={{ animationDelay: '120ms' }}
        title={transportTitle(transport)}
      >
        <Tag variant="success" size="sm" dot>
          LIVE{transport === 'websocket' ? ' · WS' : ''}
        </Tag>
      </span>
    </div>
  );
}
