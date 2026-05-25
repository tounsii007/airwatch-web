'use client';

/**
 * Avatar — round / squircle visual identity slot. Resolves to (in order):
 *   1. An <img src> when `src` is provided AND loads successfully.
 *   2. The first one or two letters of `name` when `src` is missing.
 *   3. A neutral icon placeholder when neither is supplied.
 *
 * Errors on the <img> (typo'd URL, blocked CDN, offline) fall back to
 * the initials so a missing logo doesn't leave an empty hole in the
 * layout. The size + colour scheme matches the FlagImage / LogoImage
 * pattern already used across airline / airport cards.
 *
 *   <Avatar src={airline.logoUrl} name={airline.name} />
 *   <Avatar name="Deutsche Lufthansa" size={48} />
 *   <Avatar name="DLH" status="success" />
 */

import { useMemo, useState } from 'react';
import { User } from 'lucide-react';

type Shape = 'circle' | 'squircle';
type Status = 'default' | 'success' | 'warning' | 'error' | 'info';

const STATUS_VAR: Record<Status, string> = {
  default: '--primary-bright',
  success: '--success',
  warning: '--warning',
  error:   '--error',
  info:    '--info',
};

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  /** Side length in pixels. Default 32. */
  size?: number;
  shape?: Shape;
  /** Tints the placeholder background — uses the design-system status
   *  colour set. Has no effect when an image loads. */
  status?: Status;
  /** Optional small status dot in the bottom-right corner. */
  showDot?: boolean;
  /** Override the dot colour independently of the placeholder tint. */
  dotStatus?: Status;
  /** Aria-label override. Defaults to `name`. */
  alt?: string;
  className?: string;
  /** When true, the placeholder uses the heading font for callsign /
   *  ICAO-style initials. Default true. */
  monoInitials?: boolean;
}

function deriveInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // For all-caps short strings (callsigns like "DLH" or "BAW"), keep
  // the full string up to 3 chars. Otherwise grab the first letter of
  // the first two words.
  if (/^[A-Z0-9]{1,4}$/.test(trimmed)) return trimmed.slice(0, 3);
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + (words[1][0] ?? '')).toUpperCase();
}

export function Avatar({
  src,
  name,
  size = 32,
  shape = 'circle',
  status = 'default',
  showDot = false,
  dotStatus,
  alt,
  className = '',
  monoInitials = true,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = useMemo(() => deriveInitials(name ?? ''), [name]);

  const px = `${size}px`;
  const radius = shape === 'circle' ? '999px' : `${Math.round(size * 0.28)}px`;

  const cssVar = STATUS_VAR[status];
  const bg = `color-mix(in srgb, var(${cssVar}) 14%, transparent)`;
  const ring = `color-mix(in srgb, var(${cssVar}) 30%, transparent)`;
  const fg = `var(${cssVar})`;

  const ariaLabel = alt ?? name ?? undefined;
  const showImg = !!src && !imgFailed;
  const showText = !showImg && !!name && initials !== '?';

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        background: bg,
        boxShadow: `inset 0 0 0 1px ${ring}`,
        color: fg,
      }}
    >
      {showImg ? (
        // The wrapper <span> already carries `role="img"` + the aria
        // label, so the inner <img> is purely presentational. Empty alt
        // collapses it out of the accessibility tree, leaving exactly
        // one img node for assistive tech to read.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          width={size}
          height={size}
          role="presentation"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : showText ? (
        <span
          className={`tabular font-bold ${monoInitials ? 'font-[var(--font-heading)]' : 'font-[var(--font-body)]'}`}
          style={{ fontSize: `${Math.max(10, Math.round(size * 0.38))}px`, letterSpacing: '0.02em' }}
        >
          {initials}
        </span>
      ) : (
        <User size={Math.round(size * 0.5)} aria-hidden />
      )}

      {showDot && (
        <span
          aria-hidden
          className="absolute bottom-0 right-0 rounded-full border-2 border-[var(--bg)]"
          style={{
            width: `${Math.max(6, Math.round(size * 0.22))}px`,
            height: `${Math.max(6, Math.round(size * 0.22))}px`,
            background: `var(${STATUS_VAR[dotStatus ?? 'success']})`,
            boxShadow: `0 0 6px var(${STATUS_VAR[dotStatus ?? 'success']})`,
          }}
        />
      )}
    </span>
  );
}
