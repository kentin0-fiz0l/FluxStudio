/**
 * Visual Regression Tests — Pages
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Screenshot comparison tests for critical pages.
 * Baselines stored in tests/visual/__snapshots__/
 *
 * Run: npx playwright test --config=playwright-visual.config.ts
 * Update baselines: npx playwright test --config=playwright-visual.config.ts --update-snapshots
 */

import { test, expect } from '@playwright/test';

test.describe('Page Visual Regression', () => {
  test('login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for fonts and images to load
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
    });
  });

  test('login page — email input focused', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.focus();
      await page.waitForTimeout(300);
    }

    await expect(page).toHaveScreenshot('login-page-focused.png');
  });

  test('dashboard page (unauthenticated → redirect)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Captures whatever the unauthenticated state looks like (login redirect or error)
    await expect(page).toHaveScreenshot('dashboard-unauth.png', {
      fullPage: true,
    });
  });

  test('settings page (unauthenticated → redirect)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('settings-unauth.png', {
      fullPage: true,
    });
  });
});
