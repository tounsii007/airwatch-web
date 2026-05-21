'use client';

/**
 * Signature live activity strip. A single CSS-driven marquee that
 * surfaces a slice of the currently-tracked aircraft — callsign, route
 * (if known), and an altitude-tinted dot — and keeps it scrolling
 * horizontally across the viewport. Gives every page a quiet
 * "the world is moving" pulse without owning much real estate.
 *
 * Why this matters: most pages in AirWatch are static lists or a map.
 * The ticker is the only piece of universal chrome that visibly
 * advances on its own and reinforces that the data is live. It deserves
 * to be a first-class atom rather than ad-hoc markup on every page.
 *
 * Implementation:
 *   * One row of items, rendered TWICE in source order. We translate
 *     the row -50% via the `animate-marquee` keyframe so the second
 *     copy seamlessly takes over without a visible reset.
 *   * Pauses on hover and when `prefers-reduced-motion: reduce` is on
 *     (`@media` is set globally in globals.css, the marquee is one of
 *     the animations it suppresses).
 *   * Picks `maxItems` aircraft from the store in a deterministic order
 *     (highest altitude first) so the ticker has stable content across
 *     re-renders rather than thrashing on every WS frame.
 *
 *   <LiveTicker maxItems={20} />
 */

import { useMemo } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { getAltitudeColor } from '@/lib/utils';
import type { AircraftState } from '@/lib/types';

interface LiveTickerProps {
  /** How many aircraft to surface — defaults to 24. */
  maxItems?: number;
  /** Optional className applied to the outer container. */
  className?: string;
  /** Show the "LIVE" badge on the left. Default true. */
  showBadge?: boolean;
  /** When true, render a thinner two-line variant. Default false. */
  compact?: boolean;
}

function formatLabel(a: AircraftState): string {
  const callsign = (a.callsign ?? a.icao24).trim();
  const route =
    a.depIata && a.arrIata
      ? ` ${a.depIata} → ${a.arrIata}`
      : a.depIata
      ? ` from ${a.depIata}`
      : a.arrIata
      ? ` to ${a.arrIata}`
      : '';
  return `${callsign}${route}`;
}

/** Pick the top-N aircraft for the ticker. Stable order: highest
 *  altitude first (proxy for "interesting jets in cruise"), with a
 *  callsign-based tiebreaker so the order doesn't flicker when two
 *  rows share an altitude value. */
function pickTickerSet(map: Map<string, AircraftState>, n: number): AircraftState[] {
  const all: AircraftState[] = [];
  map.forEach((a) => {
    if (a.callsign && !a.onGround) all.push(a);
  });
  all.sort((x, y) => {
    const ax = x.baroAltitude ?? 0;
    const ay = y.baroAltitude ?? 0;
    if (ay !== ax) return ay - ax;
    return (x.callsign ?? x.icao24).localeCompare(y.callsign ?? y.icao24);
  });
  return all.slice(0, n);
}

export function LiveTicker({
  maxItems = 24,
  className = '',
  showBadge = true,
  compact = false,
}: LiveTickerProps) {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const language = useSettingsStore((s) => s.language);

  const items = useMemo(() => pickTickerSet(aircraftMap, maxItems), [aircraftMap, maxItems]);

  if (items.length === 0) return null;

  const padY = compact ? 'py-1' : 'py-1.5';
  const text = compact ? 'text-[10px]' : 'text-[11px]';

  return (
    <div
      className={`relative overflow-hidden glass-panel rounded-xl ${padY} ${className}`}
      role="marquee"
      aria-label={t('aria_live_flights_ticker', language)}
    >
      {showBadge && (
        <span
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 badge badge-success badge-dot"
          aria-hidden
        >
          LIVE
        </span>
      )}

      {/* Soft edge fades so items dissolve into the panel sides instead
          of clipping abruptly. The mask uses transparent endpoints; the
          background of the marquee row is the glass-panel itself. */}
      <div
        className="overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',
          paddingLeft: showBadge ? '64px' : '8px',
        }}
      >
        <div
          className="flex w-max animate-marquee hover:[animation-play-state:paused]"
          style={{ willChange: 'transform' }}
        >
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              className={`flex items-center gap-6 pr-12 font-[var(--font-heading)] tabular ${text}`}
              // Only the first copy carries the live items in the
              // a11y tree; the duplicate is decorative.
              aria-hidden={copy === 1 || undefined}
            >
              {items.map((a) => {
                const colour = getAltitudeColor(a.baroAltitude, a.onGround);
                const label = formatLabel(a);
                return (
                  <li
                    key={`${copy}-${a.icao24}`}
                    className="flex items-center gap-1.5 whitespace-nowrap text-[var(--text-secondary)]"
                  >
                    <span
                      aria-hidden
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{
                        background: colour,
                        boxShadow: `0 0 6px ${colour}`,
                      }}
                    />
                    {label}
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      </div>
    </div>
  );
}
