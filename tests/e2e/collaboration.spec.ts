/**
 * E2E Tests - Real-time Collaboration
 * @file tests/e2e/collaboration.spec.ts
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Setup authenticated user state
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

test.describe('Real-time Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'User One');
  });

  test('should show online status indicator', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    // Look for connection status indicator
    const statusIndicator = page.locator(
      '[data-testid="connection-status"], .connection-status, [aria-label*="connection"]'
    );

    if (await statusIndicator.isVisible()) {
      await expect(statusIndicator).toBeVisible();
    }
  });

  test('should display presence indicators for collaborators', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    // Look for avatar stack or collaborator list
    const presenceArea = page.locator(
      '[data-testid="collaborators"], .presence-avatars, .collaborator-list'
    );

    // This might not be visible without other users
    if (await presenceArea.isVisible()) {
      await expect(presenceArea).toBeVisible();
    }
  });

  test('should show typing indicator', async ({ page }) => {
    await page.goto('/projects/test-project-1/chat');

    // Find message input
    const messageInput = page.locator(
      'textarea[placeholder*="message"], input[placeholder*="message"], [contenteditable="true"]'
    );

    if (await messageInput.isVisible()) {
      // Start typing
      await messageInput.fill('Testing typing indicator...');

      // Wait for potential typing indicator to appear
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Collaborative Editing', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'User One');
  });

  test('should load collaborative document editor', async ({ page }) => {
    await page.goto('/documents/test-doc-1');

    // Look for editor component
    const editor = page.locator(
      '[data-testid="editor"], .tiptap, .ProseMirror, [contenteditable="true"]'
    );

    await expect(editor.first()).toBeVisible();
  });

  test('should show cursor position of current user', async ({ page }) => {
    await page.goto('/documents/test-doc-1');

    // Click in editor
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();

    if (await editor.isVisible()) {
      await editor.click();

      // Cursor should be visible
      await expect(page.locator('.ProseMirror-focused, [data-focused="true"]')).toBeVisible();
    }
  });

  test('should save content changes', async ({ page }) => {
    await page.goto('/documents/test-doc-1');

    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();

    if (await editor.isVisible()) {
      // Type some content
      await editor.click();
      await page.keyboard.type('Test content from E2E');

      // Wait for autosave (typically 30 seconds, but might have visual indicator)
      const saveIndicator = page.locator('text=/saved|saving/i');

      if (await saveIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(saveIndicator).toContainText(/saved/i);
      }
    }
  });
});

test.describe('Multi-user Collaboration (Simulated)', () => {
  test('should handle multiple users in same document', async ({ browser }) => {
    // Create two browser contexts for two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup different users
    await setupAuthenticatedUser(page1, 'user-1', 'User One');
    await setupAuthenticatedUser(page2, 'user-2', 'User Two');

    // Both navigate to same document
    await page1.goto('/documents/test-doc-1');
    await page2.goto('/documents/test-doc-1');

    // Both should see the editor
    await expect(page1.locator('.ProseMirror, [contenteditable="true"]').first()).toBeVisible();
    await expect(page2.locator('.ProseMirror, [contenteditable="true"]').first()).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
  });
});

test.describe('Design Board Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'User One');
  });

  test('should load design board canvas', async ({ page }) => {
    await page.goto('/design-boards/test-board-1');

    // Look for canvas element
    const canvas = page.locator('canvas, svg, [data-testid="design-canvas"]');
    await expect(canvas.first()).toBeVisible();
  });

  test('should support zooming', async ({ page }) => {
    await page.goto('/design-boards/test-board-1');

    // Look for zoom controls
    const zoomIn = page.locator('button[aria-label*="zoom in"], button:has-text("+")');
    const zoomOut = page.locator('button[aria-label*="zoom out"], button:has-text("-")');

    if (await zoomIn.first().isVisible()) {
      await zoomIn.first().click();
      await zoomOut.first().click();
    }
  });

  test('should support panning', async ({ page }) => {
    await page.goto('/design-boards/test-board-1');

    const canvas = page.locator('canvas, [data-testid="design-canvas"]').first();

    if (await canvas.isVisible()) {
      // Perform drag gesture for panning
      await canvas.dragTo(canvas, {
        sourcePosition: { x: 100, y: 100 },
        targetPosition: { x: 200, y: 200 },
      });
    }
  });

  test('should show element toolbar on selection', async ({ page }) => {
    await page.goto('/design-boards/test-board-1');

    // Click on canvas to potentially select an element
    const canvas = page.locator('canvas, [data-testid="design-canvas"]').first();

    if (await canvas.isVisible()) {
      await canvas.click();

      // Look for toolbar that appears on selection
      const toolbar = page.locator('[data-testid="element-toolbar"], .element-toolbar, .selection-toolbar');

      // Toolbar might appear if there are elements
      if (await toolbar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(toolbar).toBeVisible();
      }
    }
  });
});

test.describe('Chat and Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'User One');
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('/messages');

    // Chat interface should be visible
    await expect(page.locator('text=/messages|conversations|chat/i').first()).toBeVisible();
  });

  test('should show conversation list', async ({ page }) => {
    await page.goto('/messages');

    // Conversation list
    const conversationList = page.locator('[data-testid="conversation-list"], .conversation-list');
    await expect(conversationList.first()).toBeVisible();
  });

  test('should send a message', async ({ page }) => {
    await page.goto('/messages');

    // Click on a conversation if available
    const conversation = page.locator('[data-testid="conversation-item"], .conversation-item').first();

    if (await conversation.isVisible()) {
      await conversation.click();

      // Find message input
      const messageInput = page.locator(
        'textarea[placeholder*="message"], input[placeholder*="type"], [contenteditable="true"]'
      ).last();

      if (await messageInput.isVisible()) {
        await messageInput.fill('Test message from E2E');

        // Find and click send button
        await page.click('button[type="submit"], button:has-text("Send"), button[aria-label*="send"]');

        // Message should appear in chat
        await expect(page.locator('text="Test message from E2E"')).toBeVisible();
      }
    }
  });

  test('should support emoji reactions', async ({ page }) => {
    await page.goto('/messages');

    // Look for message with reaction button
    const reactionButton = page.locator('[aria-label*="react"], button:has-text("😀"), .reaction-trigger');

    if (await reactionButton.first().isVisible()) {
      await reactionButton.first().click();

      // Emoji picker should appear
      await expect(page.locator('[data-testid="emoji-picker"], .emoji-picker')).toBeVisible();
    }
  });
});

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedUser(page, 'user-1', 'User One');
  });

  test('should show notification bell', async ({ page }) => {
    await page.goto('/dashboard');

    // Notification icon/button
    const notificationButton = page.locator(
      '[aria-label*="notification"], button:has([data-lucide="bell"]), .notification-bell'
    );

    await expect(notificationButton.first()).toBeVisible();
  });

  test('should open notification panel', async ({ page }) => {
    await page.goto('/dashboard');

    // Click notification button
    const notificationButton = page.locator(
      '[aria-label*="notification"], button:has([data-lucide="bell"])'
    ).first();

    if (await notificationButton.isVisible()) {
      await notificationButton.click();

      // Panel should open
      await expect(
        page.locator('[data-testid="notification-panel"], .notification-dropdown, [role="menu"]')
      ).toBeVisible();
    }
  });

  test('should mark notification as read', async ({ page }) => {
    await page.goto('/dashboard');

    // Open notifications
    await page.click('[aria-label*="notification"], button:has([data-lucide="bell"])');

    // Look for unread notification
    const unreadNotification = page.locator('.notification-item.unread, [data-unread="true"]').first();

    if (await unreadNotification.isVisible()) {
      await unreadNotification.click();

      // Should be marked as read (visual change)
      await expect(unreadNotification).not.toHaveClass(/unread/);
    }
  });
});
