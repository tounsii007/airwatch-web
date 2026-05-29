'use client';

import { useEffect } from 'react';
import { setCsrfToken } from '@/lib/csrfToken';

/**
 * Activity-aware client-side keep-alive ping for the admin session.
 *
 * <h3>Why activity-aware (and not "just keep pinging")</h3>
 * Spring Session is configured with {@code spring.session.timeout = 5m}.
 * The contract is: 5 minutes of true inactivity → session expires →
 * operator has to re-auth. A naive heartbeat that pings every N min
 * regardless of user behaviour would silently break that contract: an
 * abandoned tab on someone's locked screen would stay logged in
 * forever, defeating the point of the short timeout.
 *
 * <h3>How it stays out of the way</h3>
 * 1. We track the timestamp of the last user interaction (mouse move,
 *    click, key press, scroll). The {@code passive} listeners are
 *    free; the dashboard isn't doing 60-fps wheel-event processing.
 * 2. Every {@link CHECK_INTERVAL_MS} we look at "minutes since last
 *    activity". If that's under {@link ACTIVITY_WINDOW_MS} (= 4 min)
 *    we ping {@code /admin/api/csrf} to refresh the session. If the
 *    user has been idle longer, we DO NOT ping — letting the server
 *    expire the session as configured.
 * 3. The first ping always fires on mount so the CSRF token closure
 *    slot is populated before any user action.
 *
 * <h3>What it does on response</h3>
 *   * 200 → stash the fresh CSRF token in the module-scoped store
 *           ({@code lib/csrfToken}) for JS-driven action buttons.
 *           The token is NEVER attached to {@code window} — see
 *           {@code lib/csrfToken.ts} header for the threat model.
 *   * 401 → session is gone (server expired, kicked from another tab,
 *           rebuild flushed Redis). Hard-redirect to /admin/login.
 *   * Anything else / network error → silent retry at next tick.
 *
 * <h3>Network footprint</h3>
 * Active tab pinging at 4-min intervals → ~15 req/hour. Idle tab → 0.
 */

const CHECK_INTERVAL_MS    = 60 * 1000;       // wake-up cadence
const ACTIVITY_WINDOW_MS   = 4 * 60 * 1000;   // ping if user touched the page in the last 4 min

const ACTIVITY_EVENTS: readonly (keyof DocumentEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
];

export function SessionHeartbeat() {
  useEffect(() => {
    let cancelled = false;
    let lastActivity = Date.now();

    function markActivity() { lastActivity = Date.now(); }
    for (const ev of ACTIVITY_EVENTS) {
      document.addEventListener(ev, markActivity, { passive: true, capture: true });
    }

    async function ping() {
      if (cancelled) return;
      try {
        const res = await fetch('/admin/api/csrf', {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        if (res.status === 401) {
          window.location.assign('/admin/login');
          return;
        }
        if (res.ok) {
          const body = (await res.json()) as { token?: string; available?: boolean };
          if (body.available && body.token) {
            setCsrfToken(body.token);
          }
        }
      } catch {
        // Network blip — try again at the next interval. We deliberately
        // don't redirect on transient errors so a flaky wifi doesn't
        // bounce the operator out mid-flight.
      }
    }

    // Always ping once on mount so the CSRF token global slot is
    // populated and the first user action (e.g. clicking Run on the
    // jobs page) has a fresh token to send.
    ping();

    const id = window.setInterval(() => {
      const idleFor = Date.now() - lastActivity;
      if (idleFor < ACTIVITY_WINDOW_MS) {
        // User has touched the page recently → keep the session alive.
        ping();
      } else {
        // Truly idle. Don't ping — let the server-side timeout do its
        // job. The operator's next interaction will trigger a request
        // that gets 401 and the layout's auth gate / our 401 handler
        // bounces them to login.
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      for (const ev of ACTIVITY_EVENTS) {
        document.removeEventListener(ev, markActivity, { capture: true });
      }
    };
  }, []);

  return null;
}
