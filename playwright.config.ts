import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config.
 *
 * Run the backend + frontend first, then `npm run test:e2e`. If no servers
 * are already running, Playwright will spin up the Next.js dev server
 * via `webServer.command`. The backend (airwatch-api) must be started
 * separately — we assume it's reachable at http://localhost:8080.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev:local',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
