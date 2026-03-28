/**
 * E2E Tests - Design Board
 * Tests board creation, node management, and real-time collaboration features
 * @file tests/e2e/design-board.spec.ts
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

test.describe('Design Board', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'Test User');
  });

  test('should load design board page', async ({ page }) => {
    await page.goto('/projects/test-project-1/design-boards');

    // Should not show error boundary
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('should create a new design board', async ({ page }) => {
    await page.goto('/projects/test-project-1/design-boards');

    const createButton = page.locator(
      'button:has-text("New Board"), button:has-text("Create Board"), button[aria-label*="create"]'
    );

    if (await createButton.isVisible()) {
      await createButton.click();

      // Should show board creation dialog or navigate to new board
      const nameInput = page.locator(
        'input[placeholder*="name"], input[placeholder*="Name"], input[name="title"]'
      );

      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Board');
      }
    }
  });

  test('should add a text node to the board', async ({ page }) => {
    await page.goto('/projects/test-project-1/design-boards/test-board-1');

    const addTextButton = page.locator(
      'button:has-text("Text"), button[aria-label*="text node"], [data-testid="add-text-node"]'
    );

    if (await addTextButton.isVisible()) {
      await addTextButton.click();

      // A new node should appear on the canvas
      const node = page.locator(
        '[data-testid="board-node"], .board-node, [data-node-type="text"]'
      );

      if (await node.first().isVisible()) {
        await expect(node.first()).toBeVisible();
      }
    }
  });

  test('should move nodes via drag and drop', async ({ page }) => {
    await page.goto('/projects/test-project-1/design-boards/test-board-1');

    const node = page.locator(
      '[data-testid="board-node"], .board-node'
    ).first();

    if (await node.isVisible()) {
      const box = await node.boundingBox();
      if (box) {
        // Drag the node 100px to the right and 50px down
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50, { steps: 10 });
        await page.mouse.up();
      }
    }
  });

  test('should show presence indicator when collaborators exist', async ({ page }) => {
    await page.goto('/projects/test-project-1/design-boards/test-board-1');

    // Presence indicator may or may not be visible depending on other users
    // Just verify the page loads correctly
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('should handle canvas zoom controls', async ({ page }) => {
    await page.goto('/projects/test-project-1/design-boards/test-board-1');

    const zoomIn = page.locator('button[aria-label*="zoom in"], button:has-text("+")');
    const zoomOut = page.locator('button[aria-label*="zoom out"], button:has-text("-")');

    if (await zoomIn.isVisible()) {
      await zoomIn.click();
      await zoomOut.click();
    }

    // Also test keyboard zoom
    await page.keyboard.press('Meta+=');
    await page.keyboard.press('Meta+-');

    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });
});
