import { describe, expect, it } from 'vitest';
import { formatNumber, formatRelativeDate, formatShortDate } from '@/app/(public)/stats/format';

describe('formatNumber', () => {
  it('uses comma thousands separators for en', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
  });

  it('uses period thousands separators for de', () => {
    expect(formatNumber(1234567, 'de')).toBe('1.234.567');
  });

  it('honours fractionDigits', () => {
    expect(formatNumber(8.6, 'en', 1)).toBe('8.6');
    expect(formatNumber(8.6, 'de', 1)).toBe('8,6');
  });
});

describe('formatShortDate', () => {
  it('renders the day, month, year for en (slash separator)', () => {
    const t = new Date(2026, 4, 14, 10).getTime();
    // en-US short-date layout puts the day after the month.
    expect(formatShortDate(t, 'en')).toMatch(/^05\/14\/2026$/);
  });

  it('renders 14.05.2026 for de', () => {
    const t = new Date(2026, 4, 14, 10).getTime();
    expect(formatShortDate(t, 'de')).toBe('14.05.2026');
  });
});

describe('formatRelativeDate', () => {
  const now = new Date(2026, 4, 14, 12, 0).getTime();

  it('returns "Today" for same-day timestamps', () => {
    const t = new Date(2026, 4, 14, 8).getTime();
    expect(formatRelativeDate(t, 'en', now)).toBe('Today');
    expect(formatRelativeDate(t, 'de', now)).toBe('Heute');
  });

  it('returns "Yesterday" for the previous calendar day', () => {
    const t = new Date(2026, 4, 13, 22).getTime();
    expect(formatRelativeDate(t, 'en', now)).toBe('Yesterday');
    expect(formatRelativeDate(t, 'de', now)).toBe('Gestern');
  });

  it('renders "{n}d ago" within the past week', () => {
    const t = new Date(2026, 4, 11, 9).getTime();
    expect(formatRelativeDate(t, 'en', now)).toBe('3d ago');
  });

  it('falls back to a short date past 7 days', () => {
    const t = new Date(2026, 4, 1).getTime();
    expect(formatRelativeDate(t, 'de', now)).toBe('01.05.2026');
  });
});
