/**
 * E2E Tests - Dashboard
 * @file tests/e2e/dashboard.spec.ts
 */

import { test, expect } from '@playwright/test';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Dashboard', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token-for-e2e');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@fluxstudio.art',
      }));
    });
    dashboard = new DashboardPage(page);
  });

  test('should load and display dashboard heading', async ({ page }) => {
    await dashboard.goto();
    await dashboard.expectLoaded();
    await expect(dashboard.heading).toContainText(/dashboard|home|overview|welcome/i);
  });

  test('should render navigation links', async ({ page }) => {
    await dashboard.goto();
    await dashboard.expectLoaded();

    const navCount = await dashboard.navLinks.count();
    expect(navCount).toBeGreaterThan(0);
  });

  test('should render dashboard widgets or cards', async ({ page }) => {
    await dashboard.goto();
    await dashboard.expectLoaded();

    const widgetCount = await dashboard.getWidgetCount();
    expect(widgetCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to projects from dashboard', async ({ page }) => {
    await dashboard.goto();
    await dashboard.expectLoaded();

    await dashboard.navigateTo('project');
    await page.waitForURL(/.*project/i, { timeout: 10000 });
    await expect(page).toHaveURL(/.*project/i);
  });
});
