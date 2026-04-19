/**
 * Rate Limiter — exponential backoff for API calls.
 *
 * After a rate limit hit (month_limit_exceeded, hour_limit_exceeded, etc.),
 * pauses ALL API calls with exponential backoff: 1min → 5min → 30min.
 * Resets on page reload. Provides a subscription mechanism for React.
 */

const BACKOFF_DURATIONS_MS = [60_000, 300_000, 1_800_000] as const; // 1min, 5min, 30min

interface RateLimitState {
  isPaused: boolean;
  pauseUntil: number; // timestamp
  backoffLevel: number; // 0, 1, 2
  lastError: string | null;
}

let state: RateLimitState = {
  isPaused: false,
  pauseUntil: 0,
  backoffLevel: 0,
  lastError: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Check if API calls are currently allowed */
export function checkRateLimit(): { allowed: boolean; retryAfterMs: number } {
  if (!state.isPaused) return { allowed: true, retryAfterMs: 0 };
  const now = Date.now();
  if (now >= state.pauseUntil) {
    // Pause expired — resume
    state.isPaused = false;
    notify();
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: false, retryAfterMs: state.pauseUntil - now };
}

/** Record a rate limit hit — escalates backoff */
export function recordRateLimitHit(errorCode?: string) {
  const level = Math.min(state.backoffLevel, BACKOFF_DURATIONS_MS.length - 1);
  const duration = BACKOFF_DURATIONS_MS[level];
  state.isPaused = true;
  state.pauseUntil = Date.now() + duration;
  state.backoffLevel = Math.min(state.backoffLevel + 1, BACKOFF_DURATIONS_MS.length - 1);
  state.lastError = errorCode ?? 'rate_limited';
  console.warn(`[RateLimiter] Paused for ${duration / 1000}s (backoff level ${level})`);
  notify();
}

/** Get the current rate limit state (for UI) */
export function getRateLimitState(): Readonly<RateLimitState> {
  // Auto-resume if pause expired
  if (state.isPaused && Date.now() >= state.pauseUntil) {
    state.isPaused = false;
  }
  return { ...state };
}

/** Subscribe to state changes */
export function subscribeRateLimit(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Manual reset */
export function resetRateLimit() {
  state = { isPaused: false, pauseUntil: 0, backoffLevel: 0, lastError: null };
  notify();
}

/** Get backoff durations (for testing) */
export function getBackoffDurations() {
  return BACKOFF_DURATIONS_MS;
}
