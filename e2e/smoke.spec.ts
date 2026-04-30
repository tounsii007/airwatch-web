import { expect, test } from '@playwright/test';

/**
 * Smoke-suite — covers the bug categories that bit us during the
 * security/architecture pass. Each test asserts a single regression
 * we'd want to catch in CI before it reaches a user:
 *
 *   * Map renders (catches Layer-Stack / invalidateSize bugs)
 *   * No external origins in Network tab (catches CSP / proxy regressions)
 *   * WebSocket upgrades (catches API routing bugs)
 *   * Style picker doesn't crash (catches dynamic-import bugs)
 *   * 404 page renders custom branding (catches build-output bugs)
 *   * CSP nonce in place (catches the "back to unsafe-inline" mistake)
 *   * Proxied tile path returns bytes (catches nginx config drift)
 */

test.describe('AirWatch — Smoke', () => {
  test('home renders and shows the AIRWATCH brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=/AIRWATCH/i').first()).toBeVisible();
  });

  test('no external origins are loaded — every request is same-origin', async ({ page, baseURL }) => {
    const externalRequests: string[] = [];
    const expectedHost = baseURL ? new URL(baseURL).host : '';

    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('data:') || url.startsWith('blob:')) return;
      try {
        const reqHost = new URL(url).host;
        if (reqHost !== expectedHost) externalRequests.push(url);
      } catch { /* malformed url — ignore */ }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    expect(
      externalRequests,
      `external requests slipped through CSP/proxy: ${externalRequests.join(', ')}`,
    ).toEqual([]);
  });

  test('WebSocket upgrade succeeds via same-origin /ws/flights', async ({ page }) => {
    const wsPromise = page.waitForEvent('websocket', { timeout: 10_000 });
    await page.goto('/');
    const ws = await wsPromise;
    expect(ws.url()).toMatch(/\/ws\/flights/);
  });

  test('style picker opens a popover and does not crash on selection', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: /Map style:/ });
    await trigger.click();
    await expect(page.getByRole('listbox')).toBeVisible();
    // Pick a style other than the active one.
    await page.getByRole('option', { name: /SAT/i }).click();
    await expect(page.getByRole('listbox')).not.toBeVisible();
  });

  test('404 page renders branded fallback for unknown routes', async ({ page }) => {
    const res = await page.goto('/this-route-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.locator('text=/OFF RADAR/i')).toBeVisible();
    await expect(page.getByRole('link', { name: /BACK TO MAP/i })).toBeVisible();
  });

  test('CSP nonce is emitted and unsafe-inline is gone', async ({ page }) => {
    const res = await page.goto('/');
    const csp = res?.headers()['content-security-policy'];
    expect(csp, 'CSP header must be present').toBeTruthy();
    expect(csp).toMatch(/script-src[^;]+'nonce-/);
    const scriptSrc = csp!.match(/script-src ([^;]+)/)?.[1] ?? '';
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  test('proxied tile path returns image bytes', async ({ request }) => {
    const r = await request.get('/tiles/carto/dark_nolabels/3/4/2.png');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('image/png');
    expect(r.headers()['x-cache-status']).toMatch(/HIT|MISS|EXPIRED|STALE|UPDATING/);
  });

  test('html cache-control forces revalidation', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.headers()['cache-control']).toContain('no-cache');
  });
});
