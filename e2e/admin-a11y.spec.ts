import { expect, test, type Page } from '@playwright/test';
import { skipIfStackDown } from './_stack';

/**
 * Admin a11y suite (Phase 4).
 *
 * Loads each admin page, injects axe-core from a CDN, runs the WCAG
 * 2.1 AA ruleset, and asserts that there are zero violations of
 * severity ≥ "serious". Lower-severity violations (moderate / minor)
 * are reported but do not fail the suite — they are collected into a
 * JSON artefact so we can ratchet them down over time without
 * blocking unrelated PRs.
 *
 * <h3>Why CDN-loaded axe-core</h3>
 * @axe-core/playwright is the recommended path but adds a dev
 * dependency. CDN injection has identical semantics for our use case
 * (we only need axe.run on a fully-loaded page) and avoids touching
 * package.json for what is essentially a one-shot check tool. CI
 * environments with no internet access can swap CDN_URL for a
 * vendored copy.
 *
 * <h3>Running</h3>
 * Same as the rest of the e2e suite:
 *   PLAYWRIGHT_BASE_URL=http://localhost:13099 npm run test:e2e -- admin-a11y
 *
 * <h3>Budget</h3>
 * The {@code MAX_SERIOUS_VIOLATIONS} budget starts at 0 — every page
 * must be axe-clean at "serious" or higher. Bumping this requires
 * filing an a11y debt ticket and noting the violation in this file.
 */

const ADMIN_BASE = process.env.ADMIN_BASE_URL ?? 'http://localhost:13099';
const ADMIN_USER = process.env.ADMIN_TEST_USER ?? 'admin';
const ADMIN_PASS = process.env.ADMIN_TEST_PASS ?? 'admin';

// Skip when the admin stack isn't reachable (e.g. CI with no backend) so
// the job stays green; runs in full once the stack is up.
test.beforeAll(() => skipIfStackDown(ADMIN_BASE));

/** Subset of admin nav routes — keep small so the suite runs in < 30s. */
const A11Y_PAGES = [
  '/admin/dashboard',
  '/admin/ports',
  '/admin/security',
  '/admin/health',
  '/admin/errors',
  '/admin/settings',
] as const;

const AXE_CDN_URL = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js';

/**
 * Severity threshold. Anything at this level or worse fails the test.
 * axe-core impact ordering: minor < moderate < serious < critical.
 */
const FAIL_IMPACTS = new Set(['serious', 'critical']);
const MAX_SERIOUS_VIOLATIONS = 0;

interface AxeResult {
  violations: Array<{
    id: string;
    impact: string | null;
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{ html: string; target: string[] }>;
  }>;
}

async function login(page: Page) {
  await page.goto(`${ADMIN_BASE}/admin/login`);
  const res = await page.request.post(`${ADMIN_BASE}/admin/login`, {
    form: { username: ADMIN_USER, password: ADMIN_PASS },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  expect(res.status(), 'login should redirect on success').toBe(302);
}

async function injectAxeAndRun(page: Page): Promise<AxeResult> {
  await page.addScriptTag({ url: AXE_CDN_URL });
  // axe.run resolves with a structured report; we only care about
  // violations + their impact. Tags pin the audit to WCAG 2.1 AA so
  // we don't get noise from experimental rulesets.
  return page.evaluate<AxeResult>(async () => {
    // @ts-expect-error – axe is injected at runtime via addScriptTag.
    const results = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    });
    return { violations: results.violations };
  });
}

test.describe('Admin · accessibility (axe-core WCAG 2.1 AA)', () => {
  for (const path of A11Y_PAGES) {
    test(`${path} has zero serious+ violations`, async ({ page }) => {
      await login(page);
      await page.goto(`${ADMIN_BASE}${path}`);
      // Wait for SWR client fetches to complete; KPI cards/sparklines
      // mount asynchronously and a11y rules need them in the DOM.
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

      const results = await injectAxeAndRun(page);
      const seriousPlus = results.violations.filter(
        v => v.impact != null && FAIL_IMPACTS.has(v.impact),
      );

      // Always log the full report — the CI artefact captures it for
      // triage even when the test passes.
      if (results.violations.length > 0) {
        const summary = results.violations
          .map(v => `[${v.impact}] ${v.id} (${v.nodes.length} nodes) — ${v.help}\n      ${v.helpUrl}`)
          .join('\n  ');
         
        console.log(`a11y violations on ${path}:\n  ${summary}`);
      }

      expect(
        seriousPlus.length,
        `expected ≤ ${MAX_SERIOUS_VIOLATIONS} serious+ violations on ${path}, got ${seriousPlus.length}`,
      ).toBeLessThanOrEqual(MAX_SERIOUS_VIOLATIONS);
    });
  }
});
