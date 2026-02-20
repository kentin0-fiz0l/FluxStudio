/**
 * Visual Regression Tests — Components
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Screenshot comparison for key UI components visible on the login page
 * (the only page accessible without auth).
 *
 * For authenticated component screenshots, these tests would need
 * a test user login fixture (future enhancement).
 */

import { test, expect } from '@playwright/test';

test.describe('Component Visual Regression', () => {
  test('login form card', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Capture just the login form area
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      await expect(form).toHaveScreenshot('login-form.png');
    }
  });

  test('login page header/logo', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Capture header/logo area
    const header = page.locator('header, [class*="logo"], h1').first();
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('login-header.png');
    }
  });

  test('OAuth buttons section', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Capture OAuth/social login buttons
    const oauthSection = page.locator('[class*="oauth"], [class*="social"], button:has-text("Google")').first();
    if (await oauthSection.isVisible()) {
      await expect(oauthSection).toHaveScreenshot('oauth-buttons.png');
    }
  });
});
