'use client';

import { normalizeDeg, shortestAngleDiff } from '@/app/ar/arMath';

interface Props {
  heading: number;
  /** Horizontal field of view in degrees — determines tick spacing. */
  fovHorizontalDeg: number;
}

interface Tick {
  degrees: number;
  label: string;
}

const CARDINALS: Tick[] = [
  { degrees: 0,   label: 'N' },
  { degrees: 45,  label: 'NE' },
  { degrees: 90,  label: 'E' },
  { degrees: 135, label: 'SE' },
  { degrees: 180, label: 'S' },
  { degrees: 225, label: 'SW' },
  { degrees: 270, label: 'W' },
  { degrees: 315, label: 'NW' },
];

function CurrentHeadingReadout({ heading }: { heading: number }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 glass-panel px-2 py-0.5 rounded text-[10px] font-[var(--font-heading)] font-bold text-[var(--primary)] tabular-nums tracking-wider">
      {Math.round(normalizeDeg(heading)).toString().padStart(3, '0')}°
    </div>
  );
}

function TickMark({ tick, heading, fov }: { tick: Tick; heading: number; fov: number }) {
  const delta = shortestAngleDiff(heading, tick.degrees);
  const half = fov / 2;
  if (Math.abs(delta) > half) return null;
  const leftPct = 50 + (delta / half) * 50;
  return (
    <div
      className="absolute top-0 -translate-x-1/2 flex flex-col items-center text-[var(--text-muted)]"
      style={{ left: `${leftPct}%` }}
    >
      <div className="w-px h-3 bg-[var(--primary)]/60" />
      <span className="text-[9px] font-[var(--font-heading)] font-bold tracking-widest mt-0.5">{tick.label}</span>
    </div>
  );
}

/** Top-of-screen compass strip showing the cardinals within the camera FOV. */
export function CompassHud({ heading, fovHorizontalDeg }: Props) {
  return (
    <div className="absolute top-4 left-4 right-4 h-6 pointer-events-none">
      <div className="relative w-full h-full">
        {CARDINALS.map((tick) => (
          <TickMark key={tick.label} tick={tick} heading={heading} fov={fovHorizontalDeg} />
        ))}
        <CurrentHeadingReadout heading={heading} />
      </div>
    </div>
  );
}
