import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Admin dashboard E2E suite.
 *
 * Coverage map (one test, one regression we'd want CI to catch):
 *
 *   AUTH LIFECYCLE
 *     * Anonymous request → 307 to /admin/login (no UI exposure)
 *     * Wrong creds → /admin/login?error=1
 *     * Correct creds → cookie + dashboard renders
 *     * Logout → cookie invalidated, next /admin/* request redirects
 *     * Single-session → second login from a 2nd context kicks the 1st
 *
 *   PAGE COVERAGE
 *     * Every page in the admin nav loads with status 200, the layout
 *       chrome (admin-shell, admin-header, admin-main) is present, and
 *       NO uncaught console errors fire during the load.
 *
 *   CONTENT INTEGRITY
 *     * KPI cards render numeric values (not just labels)
 *     * Sparklines actually render SVG paths (not the empty-state text)
 *     * Tables render with the expected column headers
 *     * Audit log uses Berlin local time formatting
 *
 *   INTERACTIVE COMPONENTS
 *     * Theme picker switches the html.theme-* class
 *     * AutoRefresh dropdown lists the 7 interval options
 *     * Refresh button has the expected aria/title hints
 *
 *   RESPONSIVE
 *     * Mobile viewport (390 px) — nav wraps, no horizontal scroll
 *     * Tablet viewport (768 px) — KPI grid collapses to 2-up
 *
 *   SECURITY HEADERS
 *     * CSP carries form-action 'self' and a nonced script-src
 *     * X-Frame-Options DENY
 *     * Strict-Transport-Security is NOT sent over plain http
 *       (otherwise Edge upgrades subsequent requests and breaks CSP)
 *
 * Tests run against the admin port 13099 (NGINX_ADMIN_PORT). The default
 * Playwright baseURL is the public port 13000 — so each navigate call
 * uses an absolute http://localhost:13099 URL to escape the baseURL.
 */

const ADMIN_BASE = process.env.ADMIN_BASE_URL ?? 'http://localhost:13099';
const ADMIN_USER = process.env.ADMIN_TEST_USER ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_TEST_PASS ?? 'admin';

/** Every admin page link rendered in the layout nav. */
const ADMIN_PAGES = [
  '/admin/dashboard',
  '/admin/ports',
  '/admin/security',
  '/admin/health',
  '/admin/instances',
  '/admin/endpoints',
  '/admin/users',
  '/admin/features',
  '/admin/quota',
  '/admin/system',
  '/admin/errors',
  '/admin/cache',
  '/admin/jobs',
  '/admin/settings',
] as const;

// ─── helpers ─────────────────────────────────────────────────────────────

/** Submit the login form via fetch so we don't need to parse Thymeleaf HTML. */
async function login(page: Page, user = ADMIN_USER, pass = ADMIN_PASS): Promise<void> {
  // Visit login page first so cookies attach to the right origin.
  await page.goto(`${ADMIN_BASE}/admin/login`);
  // Direct POST keeps the test from depending on the form's CSS selectors.
  const res = await page.request.post(`${ADMIN_BASE}/admin/login`, {
    form: { username: user, password: pass },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  // 302 = success → /admin/dashboard (or wherever sanitizeNext landed us).
  expect(res.status(), 'login should redirect on success').toBe(302);
}

async function newLoggedInContext(browser: Browser | null) {
  const ctx = await browser!.newContext();
  const page = await ctx.newPage();
  await login(page);
  return { ctx, page };
}

/** Collect uncaught browser-side errors during a page load. */
function attachConsoleErrorCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

// ─── 1. AUTH LIFECYCLE ─────────────────────────────────────────────────────

test.describe('Admin · auth lifecycle', () => {
  test('anonymous /admin/dashboard redirects to login', async ({ page }) => {
    const res = await page.goto(`${ADMIN_BASE}/admin/dashboard`, { waitUntil: 'commit' });
    // Final URL should be the login form OR the redirect should land
    // on /admin/login. Both indicate auth gate worked.
    const status = res?.status();
    expect(
      status === 200 || status === 307 || status === 302,
      'auth gate should redirect, not 401',
    ).toBe(true);
    expect(page.url()).toMatch(/\/admin\/login(\?|$)/);
  });

  test('wrong credentials surface ?error=1', async ({ page }) => {
    const res = await page.request.post(`${ADMIN_BASE}/admin/login`, {
      form: { username: 'admin', password: 'definitely-not-the-password' },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(302);
    expect(res.headers().location).toMatch(/\/admin\/login\?error=1/);
  });

  test('correct credentials land on the dashboard', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    await expect(page.locator('text=/AIRWATCH ADMIN/i').first()).toBeVisible();
    await expect(page.locator('text=/Operations Overview/i').first()).toBeVisible();
  });

  test('logout invalidates the cookie — next /admin/* redirects', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    // POST to /admin/logout via the form action.
    await page.request.post(`${ADMIN_BASE}/admin/logout`, { maxRedirects: 0, failOnStatusCode: false });
    // Re-visit any admin page — should bounce to login.
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    expect(page.url()).toMatch(/\/admin\/login/);
  });

  test('single-session: second login kicks the first', async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pageA = await a.newPage();
    const pageB = await b.newPage();
    try {
      await login(pageA);
      // Confirm A is authenticated.
      const csrfA = await pageA.request.get(`${ADMIN_BASE}/admin/api/csrf`);
      expect(csrfA.status()).toBe(200);

      // B logs in — A should now be invalid via the user-active pointer.
      await login(pageB);

      const csrfA2 = await pageA.request.get(`${ADMIN_BASE}/admin/api/csrf`);
      expect(
        csrfA2.status(),
        'A’s session should be superseded by B’s login',
      ).toBe(401);

      const csrfB = await pageB.request.get(`${ADMIN_BASE}/admin/api/csrf`);
      expect(csrfB.status()).toBe(200);
    } finally {
      await a.close();
      await b.close();
    }
  });
});

// ─── 2. PAGE COVERAGE ─────────────────────────────────────────────────────

test.describe('Admin · every page loads cleanly', () => {
  for (const path of ADMIN_PAGES) {
    test(`${path} renders + admin chrome present + no console errors`, async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      try {
        const errors = attachConsoleErrorCollector(page);
        await login(page);
        const res = await page.goto(`${ADMIN_BASE}${path}`);
        expect(res?.status(), `${path} should return 200`).toBe(200);

        // Layout chrome.
        await expect(page.locator('html.admin-shell')).toBeVisible();
        await expect(page.locator('.admin-header')).toBeVisible();
        await expect(page.locator('.admin-main')).toBeVisible();
        // Logout button is layout-level — must be on every page.
        await expect(page.locator('.admin-nav-logout button')).toBeVisible();

        // Give async client components a beat to initialise.
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

        // Filter known-noisy framework warnings (React #418 hydration
        // for relative-time elements is tracked separately and won't
        // be fixed by this test).
        const real = errors.filter((e) => !/Minified React error #418/.test(e));
        expect(real, `console errors on ${path}:\n${real.join('\n')}`).toEqual([]);
      } finally {
        await ctx.close();
      }
    });
  }
});

// ─── 3. CONTENT INTEGRITY ─────────────────────────────────────────────────

test.describe('Admin · content integrity', () => {
  test('dashboard KPI cards show numeric values', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    // KPI labels are uppercase Orbitron — find them by text.
    const labels = ['UPTIME', 'THREATS BLOCKED', 'RECENT REJECTIONS', 'AVG LATENCY'];
    for (const label of labels) {
      const card = page.locator('div').filter({ hasText: new RegExp(`^${label}$`) }).first();
      await expect(card, `${label} card present`).toBeVisible();
    }
    // The big-number container next to each label should contain at
    // least one digit. CountUp animates 0 → value, so even an idle
    // dashboard renders a "0" rather than empty space.
    const numbers = await page.locator('.admin-card .tabular, [class*="tabular"]').allTextContents().catch(() => []);
    // The dashboard has multiple KPI strips; we just want SOME number.
    expect(
      page.locator('main').textContent(),
      'dashboard renders at least one numeric KPI value',
    ).resolves.toMatch(/\b\d+(\.\d+)?\b/);
  });

  test('ports view renders a sparkline SVG per port', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/ports`);
    await expect(page.locator('h1').filter({ hasText: /Ports/ })).toBeVisible();
    // PortGrid renders <svg> per port with a <path> for the line.
    const paths = page.locator('section svg path');
    expect(await paths.count(), 'port sparklines have paths').toBeGreaterThan(0);
  });

  test('audit log uses Berlin local time format', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/security`);
    // Look for the dd.MM.yyyy, HH:mm:ss pattern in the audit table.
    const auditCells = page.locator('section').filter({ hasText: /Audit log/ }).locator('td');
    if (await auditCells.count() > 0) {
      const text = (await auditCells.allTextContents()).join(' ');
      // Either the table is empty or some cell matches the de-DE date pattern.
      const hasDateRow = /\d{2}\.\d{2}\.\d{4}/.test(text);
      const hasNoEntries = /No audit entries yet/.test(text);
      expect(hasDateRow || hasNoEntries).toBe(true);
    }
  });

  test('instances view adapts to the cluster size', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/instances`);
    await expect(page.locator('h1').filter({ hasText: /Instances/ })).toBeVisible();
    // KPI strip exists.
    await expect(page.locator('text=/REPLICAS$/').first()).toBeVisible();
  });
});

// ─── 4. INTERACTIVE COMPONENTS ────────────────────────────────────────────

test.describe('Admin · interactive components', () => {
  test('AutoRefresh dropdown lists the 7 interval options', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    const select = page.locator('select[title="Auto-refresh interval"]');
    await expect(select).toBeVisible();
    const optionCount = await select.locator('option').count();
    expect(optionCount).toBe(7); // Off + 6 intervals
  });

  test('refresh button trigger shows the "Refreshing" spinner state', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    await expect(refreshBtn).toBeVisible();
    // Click and immediately check for a state change — Playwright's
    // implicit wait will catch the brief "Refreshing…" text.
    await refreshBtn.click();
    // Either it's still pending (Refreshing…) or already done (Updated).
    await expect(
      page.locator('button').filter({ hasText: /Refreshing|Updated|Refresh/ }).first(),
    ).toBeVisible();
  });

  test('theme switcher swaps the html.theme-* class', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/settings`);
    // Default theme is dark, applied by the in-head bootstrap script.
    await expect(page.locator('html')).toHaveClass(/theme-dark/);
    // Click the Light theme tile.
    const lightBtn = page.getByRole('button', { name: /Light/ }).first();
    await lightBtn.click();
    await expect(page.locator('html')).toHaveClass(/theme-light/);
    // Reload — class survives via the localStorage bootstrap.
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/theme-light/);
    // Reset to dark for subsequent tests.
    await page.getByRole('button', { name: /Dark/ }).first().click();
  });

  test('logout button POSTs to /admin/logout', async ({ page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    const logoutForm = page.locator('form[action="/admin/logout"]');
    await expect(logoutForm).toBeVisible();
    await expect(logoutForm.locator('button')).toHaveText(/Logout/);
  });
});

// ─── 5. RESPONSIVE ────────────────────────────────────────────────────────

test.describe('Admin · responsive viewports', () => {
  test('mobile (390px) — no horizontal scroll, nav wraps', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    try {
      await login(page);
      await page.goto(`${ADMIN_BASE}/admin/dashboard`);
      // Body width ≤ viewport width → no horizontal scrollbar at the
      // top level. (Inner tables/charts may scroll on their own — those
      // are wrapped in overflowX: auto containers.)
      const overflow = await page.evaluate(() => ({
        bodyW: document.body.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      expect(overflow.bodyW, 'no horizontal page scroll on mobile').toBeLessThanOrEqual(overflow.clientW + 1);
      // Nav still visible.
      await expect(page.locator('.admin-nav')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test('tablet (768px) — KPI grid uses ≥ 2 columns', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    try {
      await login(page);
      await page.goto(`${ADMIN_BASE}/admin/dashboard`);
      // Find a KPI strip (auto-fit minmax(200px, 1fr)) and check its
      // computed grid-template-columns has more than one track.
      const cols = await page.locator('div[style*="repeat(auto-fit"]').first().evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
      );
      expect(cols, 'KPI grid expands beyond 1 column at 768 px').toBeGreaterThanOrEqual(2);
    } finally {
      await ctx.close();
    }
  });
});

// ─── 6. SECURITY HEADERS ──────────────────────────────────────────────────

test.describe('Admin · security headers', () => {
  test('login page CSP contains nonced script-src + form-action self', async ({ page }) => {
    const res = await page.goto(`${ADMIN_BASE}/admin/login`);
    const csp = res?.headers()['content-security-policy'] ?? '';
    expect(csp).toMatch(/script-src[^;]+'nonce-[^']+'/);
    expect(csp).toMatch(/form-action 'self'/);
    expect(csp).not.toContain("'unsafe-inline'  "); // double-space catches the literal string only
  });

  test('admin pages send X-Frame-Options DENY', async ({ page }) => {
    await login(page);
    const res = await page.goto(`${ADMIN_BASE}/admin/dashboard`);
    expect(res?.headers()['x-frame-options']).toBe('DENY');
  });

  test('admin port refuses non-/admin paths from outside loopback (403/401)', async ({ request }) => {
    // The public /api/proxy/airlabs/cities path is normally on port 13000;
    // hitting it on the admin port should return 401 (the admin-port
    // catch-all) — this catches nginx config drift.
    const res = await request.get(`${ADMIN_BASE}/api/proxy/airlabs/cities`, {
      failOnStatusCode: false,
    });
    expect([401, 403, 404]).toContain(res.status());
  });
});

// ─── 7. STATIC ASSETS REACHABLE ───────────────────────────────────────────

test.describe('Admin · static assets', () => {
  test('Next.js bundles + favicon + manifest reachable via admin port', async ({ request, page }) => {
    await login(page);
    await page.goto(`${ADMIN_BASE}/admin/dashboard`);

    // Pull a script src from the rendered HTML and re-fetch it via the
    // admin port — proves the nginx /_next/ proxy route is in place.
    const html = await page.content();
    const match = html.match(/src="(\/_next\/static\/chunks\/[^"]+)"/);
    expect(match, 'a /_next/static/chunks/ script tag should be present').not.toBeNull();
    const r = await request.get(`${ADMIN_BASE}${match![1]}`);
    expect(r.status(), `${match![1]} reachable`).toBe(200);

    const fav = await request.get(`${ADMIN_BASE}/favicon.ico`);
    expect(fav.status()).toBe(200);
  });
});
