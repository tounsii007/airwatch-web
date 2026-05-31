import { describe, expect, it } from 'vitest';
import { formatElapsed, formatWallClock } from './formatClock';

describe('formatElapsed', () => {
  it('clamps negative durations to zero', () => {
    expect(formatElapsed(-5000)).toBe('0:00');
    expect(formatElapsed(-1)).toBe('0:00');
  });

  it('renders m:ss under an hour with a zero-padded seconds field', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(5_000)).toBe('0:05');
    expect(formatElapsed(65_000)).toBe('1:05');
    expect(formatElapsed(600_000)).toBe('10:00');
    expect(formatElapsed(605_000)).toBe('10:05');
  });

  it('floors sub-second remainders rather than rounding', () => {
    // 5.999 s must read 0:05, not 0:06.
    expect(formatElapsed(5_999)).toBe('0:05');
  });

  it('switches to h:mm:ss once an hour is reached and zero-pads both fields', () => {
    expect(formatElapsed(3_600_000)).toBe('1:00:00');
    expect(formatElapsed(3_661_000)).toBe('1:01:01');
    expect(formatElapsed(7_325_000)).toBe('2:02:05');
  });

  it('keeps minutes within 0-59 after crossing the hour boundary', () => {
    // 1 h 5 m → the minutes field must not read 65.
    expect(formatElapsed(3_900_000)).toBe('1:05:00');
  });
});

describe('formatWallClock', () => {
  it('is deterministic for a fixed epoch', () => {
    const epoch = 1_700_000_000_000;
    expect(formatWallClock(epoch)).toBe(formatWallClock(epoch));
  });

  it('includes seconds, so timestamps one second apart differ', () => {
    const epoch = 1_700_000_000_000; // …:20 within its minute
    expect(formatWallClock(epoch)).not.toBe(formatWallClock(epoch + 1_000));
  });

  it('renders a non-empty time string with digit/colon structure', () => {
    // Locale/timezone-agnostic: just assert an h:mm-style shape is present.
    expect(formatWallClock(1_700_000_000_000)).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});
