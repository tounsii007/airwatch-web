import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 *
 * Two run modes:
 *
 *   1. Against the live docker-compose stack — `docker compose up`
 *      first, then `npm run test:e2e`. baseURL = http://localhost:13000
 *      (nginx ingress, where the browser would actually land).
 *
 *   2. Against `next dev` — `PLAYWRIGHT_BASE_URL=http://localhost:3000
 *      npm run test:e2e`. Skips the docker stack; useful for fast
 *      iteration but the API + tile proxy paths obviously won't work.
 *      Tests should mark themselves `test.skip(!apiAvailable)` when
 *      they need the backend.
 *
 * CI: set `PLAYWRIGHT_BASE_URL` to whatever the CI's compose-up
 * exposes. Default of port 13000 matches a freshly-cloned dev box.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:13000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Ignore HTTPS errors so a cert-less local stack doesn't break tests.
    ignoreHTTPSErrors: true,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],

  // Don't auto-start a dev server when targeting the docker stack —
  // assume it's already up. Set PLAYWRIGHT_AUTO_DEV=1 to spin up
  // `next dev` for fast iteration.
  webServer: process.env.PLAYWRIGHT_AUTO_DEV
    ? {
        command: 'npm run dev:local',
        port: 3000,
        reuseExistingServer: true,
        timeout: 60_000,
      }
    : undefined,
});
