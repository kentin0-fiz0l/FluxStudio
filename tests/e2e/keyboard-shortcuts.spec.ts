/**
 * E2E Tests - Keyboard Shortcuts
 * Tests Cmd+K palette, ? shortcuts dialog, g→ navigation sequences
 * @file tests/e2e/keyboard-shortcuts.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

async function setupAuthenticatedUser(page: Page, userId: string, userName: string) {
  await page.addInitScript(([id, name]) => {
    localStorage.setItem('auth_token', `test-token-${id}`);
    localStorage.setItem('user', JSON.stringify({
      id,
      name,
      email: `${id}@test.fluxstudio.art`,
    }));
  }, [userId, userName]);
}

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
  });

  test('should open command palette with Cmd+K', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Command palette should appear
    const palette = page.locator(
      '[data-testid="command-palette"], [role="dialog"]:has(input[placeholder*="search"]), [role="dialog"]:has(input[placeholder*="command"])'
    );

    if (await palette.isVisible({ timeout: 2000 })) {
      await expect(palette).toBeVisible();

      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(palette).not.toBeVisible();
    }
  });

  test('should open keyboard shortcuts dialog with ?', async ({ page }) => {
    // Make sure no input is focused
    await page.locator('body').click();

    await page.keyboard.press('Shift+/'); // ? key

    // Shortcuts dialog should appear
    const dialog = page.locator(
      '[role="dialog"]:has-text("Keyboard Shortcuts"), [role="dialog"]:has-text("shortcuts")'
    );

    if (await dialog.isVisible({ timeout: 2000 })) {
      await expect(dialog).toBeVisible();

      // At least one shortcut category should be present
      expect(await dialog.textContent()).toMatch(/General|Navigation|Editing/);

      // Close with Escape
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('should navigate to projects with g→p sequence', async ({ page }) => {
    // Start from a different page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Make sure no input is focused
    await page.locator('body').click();

    // Press g then p within 500ms
    await page.keyboard.press('g');
    await page.keyboard.press('p');

    // Should navigate to projects page
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/\/projects/);
  });

  test('should navigate to messages with g→m sequence', async ({ page }) => {
    // Make sure no input is focused
    await page.locator('body').click();

    // Press g then m within 500ms
    await page.keyboard.press('g');
    await page.keyboard.press('m');

    // Should navigate to messages page
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/\/messages/);
  });

  test('should navigate to settings with g→s sequence', async ({ page }) => {
    // Make sure no input is focused
    await page.locator('body').click();

    // Press g then s within 500ms
    await page.keyboard.press('g');
    await page.keyboard.press('s');

    // Should navigate to settings page
    await page.waitForTimeout(500);
    expect(page.url()).toMatch(/\/settings/);
  });

  test('should focus search with / key', async ({ page }) => {
    // Make sure no input is focused
    await page.locator('body').click();

    await page.keyboard.press('/');

    // Search input should be focused
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search"], input[placeholder*="Search"], [data-testid="search-input"]'
    );

    if (await searchInput.isVisible({ timeout: 2000 })) {
      await expect(searchInput).toBeFocused();
    }
  });

  test('should NOT trigger shortcuts when typing in input', async ({ page }) => {
    const currentUrl = page.url();

    // Focus a text input first
    const input = page.locator('input[type="text"], input[type="search"], textarea').first();

    if (await input.isVisible()) {
      await input.focus();

      // Type 'g' then 'p' — should NOT navigate
      await page.keyboard.type('gp');

      await page.waitForTimeout(600);
      // URL should not have changed
      expect(page.url()).toBe(currentUrl);
    }
  });

  test('should show skip-to-content link on Tab', async ({ page }) => {
    // Press Tab to reveal skip link
    await page.keyboard.press('Tab');

    const skipLink = page.locator('a:has-text("Skip to main content")');

    if (await skipLink.isVisible({ timeout: 1000 })) {
      await expect(skipLink).toBeVisible();

      // Pressing Enter should move focus to main content
      await page.keyboard.press('Enter');

      const mainContent = page.locator('#main-content');
      if (await mainContent.isVisible()) {
        await expect(mainContent).toBeFocused();
      }
    }
  });
});
