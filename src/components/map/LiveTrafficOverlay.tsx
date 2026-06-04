'use client';

import { useEffect, useRef, useState } from 'react';
import { Plane } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { CountUp } from '@/components/ui/CountUp';

const MAX_POINTS = 40;

/**
 * Tiny self-contained sparkline (no axes) drawn as an SVG polyline. Inline so
 * the overlay carries zero extra dependencies and scales fluidly to its box.
 */
function MiniSpark({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 24;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${(h - ((v - min) / range) * h).toFixed(2)}`)
    .join(' ');
  const lastX = w;
  const lastY = h - ((data[data.length - 1] - min) / range) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="traffic-spark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--secondary)" stopOpacity="1" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke="url(#traffic-spark)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY.toFixed(2)} r="1.6" fill="var(--secondary)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Bottom-left live air-traffic overlay for the radar map — a premium glass KPI
 * card showing the count of currently tracked aircraft with a rolling sparkline
 * trend. Reads the live `aircraftMap` straight from the flight store, so it
 * ticks up/down as the WebSocket feed pushes new frames. Stays hidden until the
 * feed has at least one aircraft so the empty state never shows a bare "0".
 */
export function LiveTrafficOverlay() {
  const count = useFlightStore((s) => s.aircraftMap.size);
  const [history, setHistory] = useState<number[]>([]);
  const last = useRef(-1);

  useEffect(() => {
    if (count === last.current) return;
    last.current = count;
    setHistory((h) => [...h, count].slice(-MAX_POINTS));
  }, [count]);

  if (count === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] hidden sm:block lg:bottom-52">
      <div className="glass-panel-elevated hover-lift pointer-events-auto w-56 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-pulse-glow rounded-full bg-[var(--secondary)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--secondary)]" />
          </span>
          <span className="t-label uppercase tracking-wider text-[var(--text-muted)]">
            Live Air Traffic
          </span>
        </div>

        <div className="mt-1.5 flex items-end justify-between gap-3">
          <span className="t-data text-glow-primary text-3xl font-semibold leading-none text-[var(--primary-bright)]">
            <CountUp value={count} />
          </span>
          <Plane size={16} className="mb-1 shrink-0 text-[var(--primary)] opacity-70" aria-hidden />
        </div>

        <div className="mt-2 h-6">
          <MiniSpark data={history} />
        </div>

        <p className="mt-1 t-meta text-[var(--text-muted)]">aircraft tracked now</p>
      </div>
    </div>
  );
}
