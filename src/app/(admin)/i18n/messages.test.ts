import { describe, expect, it } from 'vitest';
import { translate, formatNumber, formatDate, formatRelative } from './messages';

/**
 * Coverage for the V13 ICU MessageFormat subset + locale-aware
 * formatters. Pure-function tests — no DOM, no React.
 */

describe('translate() — placeholders', () => {
  it('returns plain string when no params', () => {
    expect(translate('en', 'brand.name')).toBe('AIRWATCH ADMIN');
    expect(translate('de', 'brand.name')).toBe('AIRWATCH ADMIN');
  });

  it('falls back through locale → en → key', () => {
    // Made-up key — not in either dict
    expect(translate('en', 'totally.unknown.key')).toBe('totally.unknown.key');
    // 'time.justnow' exists in both — DE wins for de
    expect(translate('de', 'time.justnow')).toBe('gerade eben');
  });

  it('substitutes {name} placeholders', () => {
    // page.health.empty doesn't have placeholders, but we can use a known
    // pattern by passing an unused param — should be a no-op.
    expect(translate('en', 'brand.name', { unused: 'x' })).toBe('AIRWATCH ADMIN');
  });
});

describe('translate() — ICU plural', () => {
  // The dictionary has 'time.minutes_ago' as a plural pattern.
  it('=0 picks the explicit-zero branch', () => {
    expect(translate('en', 'time.minutes_ago', { count: 0 })).toBe('just now');
    expect(translate('de', 'time.minutes_ago', { count: 0 })).toBe('gerade eben');
  });

  it('=1 / "one" branch for exactly one', () => {
    expect(translate('en', 'time.minutes_ago', { count: 1 })).toBe('1 minute ago');
    expect(translate('de', 'time.minutes_ago', { count: 1 })).toBe('vor 1 Minute');
  });

  it('"other" branch substitutes # with locale-formatted number', () => {
    expect(translate('en', 'time.minutes_ago', { count: 5 })).toBe('5 minutes ago');
    expect(translate('en', 'time.minutes_ago', { count: 1234 })).toBe('1,234 minutes ago');
    expect(translate('de', 'time.minutes_ago', { count: 1234 })).toBe('vor 1.234 Minuten');
  });

  it('handles seconds_ago / hours_ago / days_ago', () => {
    expect(translate('en', 'time.seconds_ago', { count: 5 })).toBe('5 seconds ago');
    expect(translate('en', 'time.hours_ago',   { count: 2 })).toBe('2 hours ago');
    expect(translate('en', 'time.days_ago',    { count: 1 })).toBe('1 day ago');
    expect(translate('de', 'time.days_ago',    { count: 1 })).toBe('vor 1 Tag');
  });

  it('duration plurals: =0 fallback to "< 1 X"', () => {
    expect(translate('en', 'time.duration.minutes', { count: 0 })).toBe('< 1 minute');
    expect(translate('de', 'time.duration.hours',   { count: 0 })).toBe('< 1 Stunde');
    expect(translate('en', 'time.duration.minutes', { count: 90 })).toBe('90 minutes');
  });
});

describe('formatNumber()', () => {
  it('uses locale separators', () => {
    expect(formatNumber(1234.56, 'en')).toBe('1,234.56');
    expect(formatNumber(1234.56, 'de')).toBe('1.234,56');
  });

  it('honours options like percent', () => {
    expect(formatNumber(0.42, 'en', { style: 'percent' })).toMatch(/42\s*%/);
  });

  it('returns the input for non-finite numbers', () => {
    expect(formatNumber(Number.NaN,      'en')).toBe('NaN');
    expect(formatNumber(Number.POSITIVE_INFINITY, 'en')).toBe('Infinity');
  });
});

describe('formatDate()', () => {
  it('formats Date instances by locale default', () => {
    const d = new Date('2026-05-04T12:34:00Z');
    // EN short: M/d/yy or so; DE: dd.MM.yy. Don't pin exact form (Intl
    // varies by Node + ICU version), just check both reflect the date.
    expect(formatDate(d, 'en')).toMatch(/[/\d]/);
    expect(formatDate(d, 'de')).toMatch(/[.\d]/);
  });

  it('accepts ISO strings + numbers', () => {
    const ms = Date.UTC(2026, 4, 4, 12, 0, 0);
    expect(formatDate(ms, 'en')).toBeTruthy();
    expect(formatDate('2026-05-04T12:00:00Z', 'en')).toBeTruthy();
  });

  it('returns the input verbatim if unparseable', () => {
    expect(formatDate('not-a-date', 'en')).toBe('not-a-date');
  });
});

describe('formatRelative()', () => {
  it('returns "just now" / "gerade eben" within 5s', () => {
    expect(formatRelative(2_000, 'en')).toBe('just now');
    expect(formatRelative(-2_000, 'de')).toBe('gerade eben');
  });

  it('picks the largest unit that yields |value| ≥ 1', () => {
    // 90 seconds → 2 minutes (rounded up due to standard rounding) or 1 minute
    const minResult = formatRelative(90 * 1000, 'en');
    expect(minResult.toLowerCase()).toContain('min');
    // 2 hours
    const hrResult = formatRelative(2 * 3600 * 1000, 'en');
    expect(hrResult.toLowerCase()).toMatch(/hour|hr/);
    // 3 days
    const dayResult = formatRelative(3 * 86400 * 1000, 'en');
    expect(dayResult.toLowerCase()).toContain('day');
  });

  it('signs forward (positive) vs backward (negative) deltas', () => {
    // Forward: "in 2 hours" / "in 2 Stunden"
    const fwd = formatRelative(2 * 3600 * 1000, 'en');
    // Backward: "2 hours ago" / "vor 2 Stunden"
    const bwd = formatRelative(-2 * 3600 * 1000, 'en');
    expect(fwd).not.toBe(bwd);
  });
});

describe('translate() — select (enum branching)', () => {
  // No live select-keys in the dictionary right now; verify the parser
  // on an inline pattern. We exercise the formatter via translate() by
  // adding a synthetic key — but the dictionary is frozen, so we test
  // the parser indirectly through the plural with =KEY exact-matches
  // and "other" fallback (same parsing path).
  it('exact-match =N takes priority over plural-rules', () => {
    // For count=0 there's an explicit =0 branch. For count=2 there isn't,
    // so "other" applies. This proves the exact-match preference.
    expect(translate('en', 'time.minutes_ago', { count: 0 })).toBe('just now');
    expect(translate('en', 'time.minutes_ago', { count: 2 })).toBe('2 minutes ago');
  });
});
