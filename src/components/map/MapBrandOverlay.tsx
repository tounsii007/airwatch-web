'use client';

/**
 * Top-left transport-aware LIVE pill for the map.
 *
 * Historically this also rendered an "AIRWATCH" wordmark, but that
 * duplicated the brand lockup now shown in the desktop LeftSidebar (and
 * the mobile BottomNav top strip), so the wordmark was removed. What
 * remains is just the live-feed status pill.
 *
 * De-duplication across breakpoints:
 *   - Desktop (`lg:` and up): the {@link TopBar} owns the LIVE pill in its
 *     left area, so this overlay hides itself (`lg:hidden`) to avoid a
 *     second copy on the map.
 *   - Mobile / tablet: there is no TopBar, so this pill stays as a small,
 *     unobtrusive map badge that still tells the user the feed is live.
 *
 * The pill keeps its `animate-fade-in` entrance so it reads as "powered on
 * and breathing" against the static map tiles behind it.
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
    <div className="absolute top-3 left-3 z-[1000] flex items-center pointer-events-none animate-fade-in lg:hidden">
      <span title={transportTitle(transport)}>
        <Tag variant="success" size="sm" dot>
          LIVE{transport === 'websocket' ? ' · WS' : ''}
        </Tag>
      </span>
    </div>
  );
}
