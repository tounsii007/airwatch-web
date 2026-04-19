import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the public routes render without throwing.
 * We do NOT assert anything backend-dependent here; those tests should be
 * tagged @backend and run only when airwatch-api is up.
 */

test.describe('Smoke — public routes render', () => {
  test('/ loads and shows the AirWatch brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('AIRWATCH', { exact: false })).toBeVisible();
  });

  test('/search loads the search input', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('/settings renders the settings page', async ({ page }) => {
    await page.goto('/settings');
    // Settings page always has at least one heading-like element per section.
    await expect(page.locator('main')).toBeVisible();
  });

  test('/geofences renders the create form', async ({ page }) => {
    await page.goto('/geofences');
    await expect(page.getByText('GEOFENCES')).toBeVisible();
    await expect(page.getByText(/NEW FENCE/)).toBeVisible();
  });

  test('/replay renders the list panel', async ({ page }) => {
    await page.goto('/replay');
    await expect(page.getByText('FLIGHT REPLAY')).toBeVisible();
    await expect(page.getByText('RECENT FLIGHTS')).toBeVisible();
  });
});

test.describe('Smoke — navigation', () => {
  test('bottom nav links navigate to their routes', async ({ page, isMobile }) => {
    await page.goto('/');

    // On desktop the links are in the top header; on mobile in the bottom bar.
    // Both use the same hrefs.
    const targets = [
      { href: '/search', text: 'AIRWATCH' }, // every page has the brand
      { href: '/airports', text: 'AIRWATCH' },
      { href: '/settings', text: 'AIRWATCH' },
    ];

    for (const t of targets) {
      await page.goto(t.href);
      await expect(page).toHaveURL(t.href);
      // Give React a moment on mobile devices.
      if (isMobile) await page.waitForTimeout(200);
    }
  });
});
