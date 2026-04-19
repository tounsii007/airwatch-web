import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  recordRateLimitHit,
  getRateLimitState,
  resetRateLimit,
  getBackoffDurations,
} from './rateLimiter';

beforeEach(() => {
  resetRateLimit();
  vi.useRealTimers();
});

describe('rateLimiter — initial state', () => {
  it('starts with allowed=true', () => {
    expect(checkRateLimit().allowed).toBe(true);
    expect(checkRateLimit().retryAfterMs).toBe(0);
  });

  it('starts with isPaused=false', () => {
    expect(getRateLimitState().isPaused).toBe(false);
    expect(getRateLimitState().backoffLevel).toBe(0);
  });
});

describe('rateLimiter — backoff progression', () => {
  it('first hit pauses for 1 minute', () => {
    vi.useFakeTimers();
    recordRateLimitHit('month_limit_exceeded');
    const state = getRateLimitState();
    expect(state.isPaused).toBe(true);
    expect(state.backoffLevel).toBe(1);

    const check = checkRateLimit();
    expect(check.allowed).toBe(false);
    expect(check.retryAfterMs).toBeLessThanOrEqual(60_000);
    expect(check.retryAfterMs).toBeGreaterThan(59_000);
  });

  it('second hit pauses for 5 minutes', () => {
    vi.useFakeTimers();
    recordRateLimitHit();
    // Simulate time passing past first pause
    vi.advanceTimersByTime(61_000);
    recordRateLimitHit();
    const state = getRateLimitState();
    expect(state.isPaused).toBe(true);
    expect(state.backoffLevel).toBe(2);

    const check = checkRateLimit();
    expect(check.retryAfterMs).toBeLessThanOrEqual(300_000);
    expect(check.retryAfterMs).toBeGreaterThan(299_000);
  });

  it('third hit caps at 30 minutes', () => {
    vi.useFakeTimers();
    recordRateLimitHit();
    vi.advanceTimersByTime(61_000);
    recordRateLimitHit();
    vi.advanceTimersByTime(301_000);
    recordRateLimitHit();
    const state = getRateLimitState();
    expect(state.backoffLevel).toBe(2); // capped at index 2

    const check = checkRateLimit();
    expect(check.retryAfterMs).toBeLessThanOrEqual(1_800_000);
    expect(check.retryAfterMs).toBeGreaterThan(1_799_000);
  });

  it('does not exceed max backoff level', () => {
    vi.useFakeTimers();
    for (let i = 0; i < 10; i++) {
      recordRateLimitHit();
      vi.advanceTimersByTime(1_800_001);
    }
    expect(getRateLimitState().backoffLevel).toBe(2);
  });
});

describe('rateLimiter — auto-resume', () => {
  it('resumes after pause expires', () => {
    vi.useFakeTimers();
    recordRateLimitHit();
    expect(checkRateLimit().allowed).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit().allowed).toBe(true);
    expect(getRateLimitState().isPaused).toBe(false);
  });

  it('resumes exactly at pause boundary', () => {
    vi.useFakeTimers();
    recordRateLimitHit();

    vi.advanceTimersByTime(59_999);
    expect(checkRateLimit().allowed).toBe(false);

    vi.advanceTimersByTime(2);
    expect(checkRateLimit().allowed).toBe(true);
  });
});

describe('rateLimiter — reset', () => {
  it('manual reset clears all state', () => {
    recordRateLimitHit();
    recordRateLimitHit();
    expect(getRateLimitState().isPaused).toBe(true);

    resetRateLimit();
    expect(getRateLimitState().isPaused).toBe(false);
    expect(getRateLimitState().backoffLevel).toBe(0);
    expect(checkRateLimit().allowed).toBe(true);
  });
});

describe('rateLimiter — error codes', () => {
  it('stores the error code', () => {
    recordRateLimitHit('month_limit_exceeded');
    expect(getRateLimitState().lastError).toBe('month_limit_exceeded');
  });

  it('defaults to rate_limited if no code', () => {
    recordRateLimitHit();
    expect(getRateLimitState().lastError).toBe('rate_limited');
  });
});

describe('rateLimiter — backoff durations', () => {
  it('has exactly 3 levels', () => {
    expect(getBackoffDurations()).toHaveLength(3);
  });

  it('durations are 1min, 5min, 30min', () => {
    const [a, b, c] = getBackoffDurations();
    expect(a).toBe(60_000);
    expect(b).toBe(300_000);
    expect(c).toBe(1_800_000);
  });
});
