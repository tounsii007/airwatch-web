'use client';

import { Plane } from 'lucide-react';
import { LogoImage } from '@/components/common/LogoImage';
import { getAirlineLogoUrl } from '@/lib/data/airlines';

type Size = 'sm' | 'lg';

interface Props {
  airlineIata: string | undefined;
  size: Size;
}

/**
 * Container uses `overflow-visible` and natural-ratio image sizing: the
 * `<img>` is placed at the container's content-box, respects `max-w-full`
 * and `max-h-full`, so wide wordmarks like "Lufthansa" or "Nouvelair" can
 * never be clipped by a too-narrow rounded rectangle.
 */
const WRAP = {
  sm: 'relative w-14 h-7 bg-white rounded shrink-0 shadow-sm overflow-visible flex items-center justify-center px-1 py-0.5',
  lg: 'relative w-24 h-10 bg-white rounded-md shrink-0 shadow-md overflow-visible flex items-center justify-center px-1.5 py-1',
} as const;

const FALLBACK = {
  sm: 'w-9 h-9 rounded-md bg-[var(--surface-light)] flex items-center justify-center shrink-0 border border-[var(--glass-border)]',
  lg: 'w-11 h-11 rounded-lg bg-[var(--surface-light)] flex items-center justify-center shrink-0 border border-[var(--glass-border)]',
} as const;

const FALLBACK_ICON = { sm: 14, lg: 20 } as const;

/** pics.avs.io serves 200×80 PNGs under the `sm` alias — already 2× our target. */
const LOGO_URL_SIZE = 'sm' as const;
const LOGO_INTRINSIC = { width: 200, height: 80 } as const;

/** Airline logo with plain-plane fallback when no IATA is known. */
export function AirlineLogo({ airlineIata, size }: Props) {
  if (!airlineIata) {
    return (
      <div className={FALLBACK[size]}>
        <Plane size={FALLBACK_ICON[size]} className="text-[var(--primary)]" />
      </div>
    );
  }
  return (
    <div className={WRAP[size]}>
      <LogoImage
        src={getAirlineLogoUrl(airlineIata, LOGO_URL_SIZE)}
        alt=""
        width={LOGO_INTRINSIC.width}
        height={LOGO_INTRINSIC.height}
        className="max-w-full max-h-full w-auto h-auto object-contain"
      />
    </div>
  );
}
