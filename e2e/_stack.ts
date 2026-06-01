import { test } from '@playwright/test';

/**
 * Shared "is the AirWatch stack up?" probe for the E2E suite.
 *
 * Every spec in this folder drives a real, running AirWatch stack:
 *
 *   * the public Next.js app behind the nginx ingress (port 13000), and
 *   * the admin surface served by the airwatch-api Spring backend
 *     behind the admin nginx port (port 13099).
 *
 * Neither is reachable unless `docker compose up` has been run with the
 * sibling `airwatch` repo present. On the GitHub runner that stack does
 * not exist (we don't check out the API repo, and the compose step in
 * ci.yml is a no-op there), so every navigate would otherwise fail with
 * net::ERR_CONNECTION_REFUSED and turn the whole job red.
 *
 * `playwright.config.ts` and the CI workflow both already document the
 * intended contract — "tests should mark themselves `test.skip(!apiAvailable)`
 * when they need the backend" — but the helper was never implemented.
 * This is that helper: a one-shot reachability probe each spec calls from
 * a `beforeAll` hook so the suite SKIPS (green, no failures) when the
 * stack is down, and runs in full the moment it is reachable — locally,
 * or in any CI that brings the compose stack up.
 *
 * Usage (top of the outer describe):
 *
 *   test.describe('…', () => {
 *     test.beforeAll(() => skipIfStackDown(BASE_URL));
 *     // …tests…
 *   });
 */

/**
 * Resolve once per origin so we don't re-probe for every `beforeAll`
 * across files that share a base URL. The value is a promise so
 * concurrent workers coalesce onto a single in-flight request.
 */
const probes = new Map<string, Promise<boolean>>();

/** Probe a base URL with a short timeout. Any HTTP response — even a 4xx
 * redirect to /admin/login — means the stack is up. Only a transport-level
 * failure (connection refused, DNS, timeout) counts as "down". */
async function reachable(baseURL: string): Promise<boolean> {
  const origin = new URL(baseURL).origin;
  const cached = probes.get(origin);
  if (cached) return cached;

  const probe = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_000);
    try {
      const res = await fetch(origin, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      });
      // Any status (200, 3xx auth redirect, 404, even 5xx) proves the
      // socket accepted the request — the stack is listening.
      return res.status > 0;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  })();

  probes.set(origin, probe);
  return probe;
}

/**
 * Skip the current group when the stack at `baseURL` isn't reachable.
 * Call from a `beforeAll` hook; Playwright then skips every test in the
 * enclosing describe/file with a clear, actionable reason.
 */
export async function skipIfStackDown(baseURL: string): Promise<void> {
  const up = await reachable(baseURL);
  test.skip(
    !up,
    `AirWatch stack not reachable at ${new URL(baseURL).origin} — ` +
      `start it with \`docker compose up\` (sibling airwatch repo) to run the E2E suite.`,
  );
}
