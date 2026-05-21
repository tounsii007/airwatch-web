'use client';

/**
 * Signature radar loader used on heavy routes (map, globe, replay) while
 * the lazy chunk + tile layer mount. Three concentric rings, an outer
 * pulse-ring, a sweep cone, and a breathing centre dot. Pure CSS — the
 * keyframes are already in globals.css (`radar-sweep`, `ring-pulse`,
 * `pulse-glow`, `fade-up`, `brand-pulse`).
 *
 *   <LoadingRadar />                 // standalone
 *   <LoadingRadar label="LOADING" /> // custom caption
 *   <LoadingRadar size={96} />       // smaller, for in-panel use
 *
 * Why factor this out: the same chunk-loading screen previously lived
 * inline in /, /globe, /replay/3d, and each copy had drifted by a pixel
 * or a colour stop. One source of truth means design changes (e.g. a
 * different sweep tint) propagate everywhere.
 */

import type { ReactNode } from 'react';

interface LoadingRadarProps {
  /** Side length of the rings in pixels. Defaults to 128 (matches the
   *  original map-page loader). */
  size?: number;
  /** Caption shown below the radar. Pass an empty string or `null` to
   *  hide the text block entirely (e.g. when the radar lives inside a
   *  card that already has its own header). */
  label?: ReactNode;
  /** Sub-caption rendered below the brand text. */
  hint?: ReactNode;
  /** Container className — pass `h-full` etc. for full-bleed centring. */
  className?: string;
}

export function LoadingRadar({
  size = 128,
  label = 'AIRWATCH',
  hint = 'INITIALIZING FLIGHT SYSTEMS',
  className = '',
}: LoadingRadarProps) {
  const px = `${size}px`;
  const inset1 = `${Math.round(size * 0.125)}px`;
  const inset2 = `${Math.round(size * 0.25)}px`;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-8 animate-fade-in ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="relative animate-float"
        style={{ width: px, height: px }}
        aria-hidden
      >
        {/* Three concentric rings of decreasing strength. The
            inline `inset` values are derived from `size` so the loader
            scales cleanly across the requested sizes. */}
        <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/25" />
        <div
          className="absolute rounded-full border border-[var(--primary)]/20"
          style={{ inset: inset1 }}
        />
        <div
          className="absolute rounded-full border border-[var(--primary)]/15"
          style={{ inset: inset2 }}
        />

        {/* Outer pulse-ring — expands and fades for a lively "ping". */}
        <div
          className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/40"
          style={{ animation: 'ring-pulse 2.4s ease-out infinite' }}
        />

        {/* Sweep cone — conic gradient that rotates over the rings. */}
        <div
          className="absolute inset-0 rounded-full animate-radar origin-center"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, var(--primary-bright) 45deg, transparent 90deg)',
            opacity: 0.4,
          }}
        />

        {/* Centre dot — breathing glow. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full bg-[var(--primary-bright)] animate-pulse-glow"
            style={{
              width: `${Math.max(8, Math.round(size * 0.094))}px`,
              height: `${Math.max(8, Math.round(size * 0.094))}px`,
              boxShadow: '0 0 12px var(--primary-bright)',
            }}
          />
        </div>
      </div>

      {(label || hint) && (
        <div className="text-center animate-fade-up" style={{ animationDelay: '120ms' }}>
          {label && (
            <span className="gradient-text font-[var(--font-heading)] font-bold tracking-[0.25em] text-3xl block animate-brand-pulse">
              {label}
            </span>
          )}
          {hint && (
            <p className="text-[var(--text-muted)] font-[var(--font-body)] text-[10px] mt-3 tracking-[0.4em] uppercase">
              <span className="animate-pulse-glow inline-block">{hint}</span>
            </p>
          )}
        </div>
      )}

      <span className="sr-only">Loading</span>
    </div>
  );
}
