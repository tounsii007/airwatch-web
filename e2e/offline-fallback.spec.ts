import { expect, test } from '@playwright/test';
import { skipIfStackDown } from './_stack';

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

/**
 * Offline fallback smoke test.
 *
 * Verifies that:
 *   * /offline.html is served by the static asset pipeline (200, HTML)
 *   * The fallback contains the Retry button + the user-facing copy
 *   * The page auto-reloads when the browser regains connectivity
 *     (we simulate the "online" event since Playwright can't toggle
 *     real network state)
 *
 * Does NOT register the SW or simulate a real offline scenario — that's
 * exercised by the admin/admin-visual visual-regression suite which runs
 * the full app shell. Here we just lock in the static fallback contract.
 */
test.describe('Offline fallback', () => {
  // /offline.html is served by the running app shell — skip when it's down.
  test.beforeAll(() => skipIfStackDown(BASE));

  test('static /offline.html serves with 200 + HTML content-type', async ({ request }) => {
    const res = await request.get(`${BASE}/offline.html`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('html');
  });

  test('renders the You\'re offline banner + Retry button', async ({ page }) => {
    await page.goto(`${BASE}/offline.html`);
    await expect(page.getByRole('heading', { name: /offline/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('auto-reload listener wires to the online event', async ({ page }) => {
    await page.goto(`${BASE}/offline.html`);
    // The inline script registers `addEventListener('online', ...)`. We
    // can't trigger a real reload without the SW context, but we can
    // assert the listener is in place by dispatching the event and
    // expecting the page navigation to start.
    const reloadPromise = page.waitForRequest(`${BASE}/offline.html`, { timeout: 3000 }).catch(() => null);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    const navigated = await reloadPromise;
    expect(navigated).not.toBeNull();
  });
});
