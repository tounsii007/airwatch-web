'use client';

import { useEffect, useState } from 'react';

const PLACEHOLDER = '--:--:--';
const DEG_PER_HOUR = 15;
const HOUR_MS = 3600_000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatHms(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Airport-local time from a known UTC offset (seconds). */
function fromUtcOffset(now: Date, utcOffsetSec: number): string {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return formatHms(new Date(utcMs + utcOffsetSec * 1000));
}

/** Rough fallback: estimate airport-local time from longitude (15° per hour). */
function fromLongitude(now: Date, lon: number): string {
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const estOffsetMs = Math.round(lon / DEG_PER_HOUR) * HOUR_MS;
  return formatHms(new Date(utcMs + estOffsetMs));
}

/** Ticking clock showing local time at the airport. Prefers exact UTC offset. */
export function useAirportClock(lon: number | undefined, utcOffsetSec: number | null): string {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      if (utcOffsetSec != null) setClock(fromUtcOffset(now, utcOffsetSec));
      else if (lon != null) setClock(fromLongitude(now, lon));
      else setClock(PLACEHOLDER);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lon, utcOffsetSec]);

  return clock;
}
