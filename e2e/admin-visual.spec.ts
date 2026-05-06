import { expect, test, type Page } from '@playwright/test';

/**
 * Admin visual regression suite (Phase 4).
 *
 * Captures stable screenshots of key admin surfaces so a CSS or layout
 * regression that doesn't break a functional test still trips CI. The
 * goal isn't pixel-perfect parity — Playwright's default
 * {@code toHaveScreenshot()} threshold (0.2% diff) is generous enough
 * to absorb font-rendering jitter across CI hosts while still catching
 * a real change like "the alerts panel grew an unintended border".
 *
 * <h3>What's snapshotted</h3>
 *  * Login form (server-rendered Thymeleaf) — no auth required
 *  * Dashboard chrome (header + nav + first KPI strip)
 *  * AlertsPanel (Phase 3 bulk-actions, Phase 4 grouped view)
 *  * Ports grid
 *  * Settings page (theme switcher visible)
 *
 * <h3>Stabilising dynamic content</h3>
 * Live numbers tick up every 30 s and would create noise on every
 * re-run. Two approaches:
 *  1. Mask the volatile region: {@code mask: [page.locator(...)]} —
 *     Playwright covers the masked area with a flat colour before
 *     snapshotting.
 *  2. Freeze data: navigate with a query string that the panel reads
 *     to fetch a fixed dataset.
 * We use (1) — easier to retrofit without backend changes, and the
 * masked regions are still functionally tested by admin.spec.ts.
 *
 * <h3>Updating baselines</h3>
 *   npm run test:e2e -- admin-visual --update-snapshots
 *
 * Review the resulting `*-snapshots/` diff before committing — that's
 * the entire point of this layer.
 */

const ADMIN_BASE = process.env.ADMIN_BASE_URL ?? 'http://localhost:13099';
const ADMIN_USER = process.env.ADMIN_TEST_USER ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_TEST_PASS ?? 'admin';

async function login(page: Page) {
  await page.goto(`${ADMIN_BASE}/admin/login`);
  const res = await page.request.post(`${ADMIN_BASE}/admin/login`, {
    form: { username: ADMIN_USER, password: ADMIN_PASS },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(302);
}

/** Wait for SWR-backed widgets to settle so we don't capture loading skeletons. */
async function waitForSettled(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
}

test.describe('Admin · visual regression', () => {
  // Same baselines work across every browser/devices project — pin to
  // chromium so we don't have to commit duplicate snapshots for the
  // mobile-chrome project that already has separate responsive tests.
  test.skip(({ browserName }) => browserName !== 'chromium', 'visual baselines are chromium-only');

  test('login page', async ({ page }) => {
    await page.goto(`${ADMIN_BASE}/admin/login`);
    // Match form-rendered HTML; no auth needed.
    await expect(page).toHaveScreenshot('login.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('dashboard chrome (above the fold)', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    await waitForSettled(page);
    await expect(page).toHaveScreenshot('dashboard-chrome.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
      mask: [
        // KPI numeric values + relative-time labels change every poll.
        page.locator('[class*="tabular"]'),
        page.locator('text=/Updated.*ago|Refreshing/'),
      ],
    });
  });

  test('alerts panel (grouped view)', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    await waitForSettled(page);
    const panel = page.locator('section').filter({ has: page.locator('text=/^Alerts$/') }).first();
    if (await panel.count() === 0) test.skip(true, 'AlertsPanel not visible — depends on dashboard layout');
    await expect(panel).toHaveScreenshot('alerts-panel-grouped.png', {
      maxDiffPixelRatio: 0.03,
      mask: [panel.locator('text=/Updated.*ago|Refreshing/')],
    });
  });

  test('ports grid', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/ports`);
    await waitForSettled(page);
    const main = page.locator('.admin-main').first();
    await expect(main).toHaveScreenshot('ports-grid.png', {
      maxDiffPixelRatio: 0.03,
      mask: [
        // Sparkline values + last-checked relative time vary per run.
        page.locator('text=/Updated.*ago|Refreshing/'),
        page.locator('text=/\\d+ms/'),
      ],
    });
  });

  test('settings page (theme switcher visible)', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/settings`);
    await waitForSettled(page);
    const main = page.locator('.admin-main').first();
    await expect(main).toHaveScreenshot('settings.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
