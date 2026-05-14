// @vitest-environment node
/**
 * Unit tests for the alert formatter helpers. Run in a node env (no DOM
 * needed) because these are pure functions over strings + numbers.
 */
import { describe, expect, it } from 'vitest';
import { timeAgo, resolveAirlineName, formatAltitude, mapDeepLink } from '@/app/(public)/geofences/alertFormat';

describe('timeAgo()', () => {
  const NOW = new Date('2026-05-14T10:00:00Z').getTime();

  it('returns "just now" for under 5 seconds', () => {
    expect(timeAgo(NOW - 0, NOW)).toBe('just now');
    expect(timeAgo(NOW - 1_000, NOW)).toBe('just now');
    expect(timeAgo(NOW - 4_999, NOW)).toBe('just now');
  });

  it('returns seconds under one minute', () => {
    expect(timeAgo(NOW - 30_000, NOW)).toBe('30s');
    expect(timeAgo(NOW - 59_000, NOW)).toBe('59s');
  });

  it('returns minutes under one hour', () => {
    expect(timeAgo(NOW - 60_000, NOW)).toBe('1m');
    expect(timeAgo(NOW - 5 * 60_000, NOW)).toBe('5m');
    expect(timeAgo(NOW - 59 * 60_000, NOW)).toBe('59m');
  });

  it('returns hours under one day', () => {
    expect(timeAgo(NOW - 60 * 60_000, NOW)).toBe('1h');
    expect(timeAgo(NOW - 23 * 60 * 60_000, NOW)).toBe('23h');
  });

  it('returns days from one day onward', () => {
    expect(timeAgo(NOW - 24 * 60 * 60_000, NOW)).toBe('1d');
    expect(timeAgo(NOW - 7 * 24 * 60 * 60_000, NOW)).toBe('7d');
  });

  it('accepts both ISO strings and numeric milliseconds', () => {
    expect(timeAgo(new Date(NOW - 60_000).toISOString(), NOW)).toBe('1m');
    expect(timeAgo(NOW - 60_000, NOW)).toBe('1m');
  });

  it('treats future timestamps as "just now" (clock-skew tolerance)', () => {
    expect(timeAgo(NOW + 60_000, NOW)).toBe('just now');
  });

  it('returns em-dash for un-parseable input', () => {
    expect(timeAgo('not-a-date', NOW)).toBe('—');
  });
});

describe('resolveAirlineName()', () => {
  it('resolves a known ICAO code to the airline name', () => {
    expect(resolveAirlineName('AAL')).toBe('American Airlines');
    expect(resolveAirlineName('AFR')).toBe('Air France');
    expect(resolveAirlineName('ACA')).toBe('Air Canada');
  });

  it('resolves a callsign by its first 3 chars', () => {
    expect(resolveAirlineName('AAL123')).toBe('American Airlines');
    expect(resolveAirlineName('AFR9001')).toBe('Air France');
  });

  it('is case-insensitive', () => {
    expect(resolveAirlineName('aal')).toBe('American Airlines');
    expect(resolveAirlineName('AaL123')).toBe('American Airlines');
  });

  it('returns undefined for unknown codes', () => {
    expect(resolveAirlineName('ZZZ')).toBeUndefined();
    expect(resolveAirlineName('XYZ123')).toBeUndefined();
  });

  it('returns undefined for null / undefined / empty', () => {
    expect(resolveAirlineName(null)).toBeUndefined();
    expect(resolveAirlineName(undefined)).toBeUndefined();
    expect(resolveAirlineName('')).toBeUndefined();
    expect(resolveAirlineName('  ')).toBeUndefined();
  });
});

describe('formatAltitude()', () => {
  // Test boundaries against the 18000 ft threshold.
  // 18000 ft = 5486.4 m ; 17999 ft → meters notation, 18000 ft → FL notation.
  it('uses metres + ft below the 18000 ft transition altitude', () => {
    // toLocaleString() respects the test-env locale — accept either
    // separator so the test is portable across CI hosts (de-DE uses
    // ".", en-US uses ",", etc.).
    expect(formatAltitude(1000)).toMatch(/^1000 m \(3[,.]281 ft\)$/);
    expect(formatAltitude(5000)).toMatch(/^5000 m \(16[,.]404 ft\)$/);
  });

  it('uses FL notation at and above 18000 ft', () => {
    // 11280 m → 37008 ft → FL370
    expect(formatAltitude(11280)).toMatch(/^FL370 \(11280 m\)$/);
    // 5486.4 m → exactly 18000 ft → FL180
    expect(formatAltitude(5486.4)).toMatch(/^FL180 \(5486 m\)$/);
  });

  it('returns em-dash for null / undefined / NaN', () => {
    expect(formatAltitude(null)).toBe('—');
    expect(formatAltitude(undefined)).toBe('—');
    expect(formatAltitude(NaN)).toBe('—');
  });
});

describe('mapDeepLink()', () => {
  it('builds /?icao24=ABC123', () => {
    expect(mapDeepLink('abc123')).toBe('/?icao24=abc123');
  });

  it('URI-encodes special characters in the icao24 (defensive)', () => {
    // Real ICAO codes never contain these, but the helper should be safe.
    expect(mapDeepLink('a&b=c')).toBe('/?icao24=a%26b%3Dc');
  });
});
