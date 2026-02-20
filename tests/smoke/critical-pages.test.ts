/**
 * Post-Deployment Smoke Tests — Critical Pages
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Loads critical frontend pages via Playwright and checks for no 500 errors,
 * basic rendering, and key element presence.
 *
 * Usage: SMOKE_TEST_URL=https://fluxstudio.art npx playwright test tests/smoke/critical-pages.test.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:5173';

test.describe('Critical Pages Smoke Tests', () => {
  test('Login page loads without errors', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/login`);
    expect(response?.status()).toBeLessThan(500);

    // Check for key login elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('Root redirects or loads without 500', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBeLessThan(500);
  });

  test('Dashboard page loads (may redirect to login)', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/dashboard`);
    expect(response?.status()).toBeLessThan(500);

    // Either shows dashboard content or redirects to login
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toMatch(/dashboard|login/);
  });

  test('Settings page loads (may redirect to login)', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/settings`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('No console errors on login page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (e.g., favicon, CORS in dev)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('CORS') && !e.includes('net::ERR_')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
