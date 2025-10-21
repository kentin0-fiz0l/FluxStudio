/**
 * E2E Tests - Messaging Features
 */

import { test, expect } from '@playwright/test';

test.describe('Messaging', () => {
  test.beforeEach(async ({ page, context }) => {
    // Simulate logged in state
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard/messages');
  });

  test('should load messages page', async ({ page }) => {
    await expect(page).toHaveURL(/.*messages/);
    await expect(page.locator('h1, h2')).toContainText(/messages|conversations/i);
  });

  test('should send a message', async ({ page }) => {
    // Type message
    await page.fill('textarea[placeholder*="message"]', 'Hello, this is a test message');

    // Click send button
    await page.click('button:has-text("Send")');

    // Should show message in conversation
    await expect(page.locator('text=Hello, this is a test message')).toBeVisible();

    // Input should be cleared
    await expect(page.locator('textarea[placeholder*="message"]')).toHaveValue('');
  });

  test('should send message with Enter key', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="message"]');

    await textarea.fill('Quick message');
    await textarea.press('Enter');

    await expect(page.locator('text=Quick message')).toBeVisible();
  });

  test('should create new line with Shift+Enter', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="message"]');

    await textarea.fill('Line 1');
    await textarea.press('Shift+Enter');
    await textarea.type('Line 2');

    const value = await textarea.inputValue();
    expect(value).toContain('\n');
    expect(value).toContain('Line 1');
    expect(value).toContain('Line 2');
  });

  test('should apply text formatting', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="message"]');

    // Click formatting button to show toolbar
    await page.click('button[aria-label*="format"]');

    // Select text
    await textarea.fill('bold text');
    await textarea.selectText();

    // Apply bold formatting
    await page.click('button[title="Bold"]');

    // Should have markdown formatting
    const value = await textarea.inputValue();
    expect(value).toContain('**bold text**');
  });

  test('should apply bold with Cmd+B', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="message"]');

    await textarea.fill('bold');
    await textarea.press('Meta+A'); // Select all
    await textarea.press('Meta+B'); // Bold

    const value = await textarea.inputValue();
    expect(value).toContain('**bold**');
  });

  test('should attach files', async ({ page }) => {
    // Click attachment button
    await page.click('button[aria-label*="attach"]');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file content'),
    });

    // Should show file attachment
    await expect(page.locator('text=test.txt')).toBeVisible();

    // Send message with attachment
    await page.fill('textarea[placeholder*="message"]', 'Message with file');
    await page.click('button:has-text("Send")');

    // Should show message and attachment
    await expect(page.locator('text=Message with file')).toBeVisible();
    await expect(page.locator('text=test.txt')).toBeVisible();
  });

  test('should remove attachment before sending', async ({ page }) => {
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'remove-me.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Content'),
    });

    await expect(page.locator('text=remove-me.txt')).toBeVisible();

    // Click remove button
    await page.click('button[aria-label*="remove attachment"]');

    // Should no longer show attachment
    await expect(page.locator('text=remove-me.txt')).not.toBeVisible();
  });

  test('should show typing indicator', async ({ page }) => {
    // Start typing
    await page.fill('textarea[placeholder*="message"]', 'I am typing...');

    // Should show typing indicator for other users (in real implementation)
    // This would require WebSocket mocking or a second browser context
  });

  test('should show read receipts', async ({ page }) => {
    // Send message
    await page.fill('textarea[placeholder*="message"]', 'Read receipt test');
    await page.click('button:has-text("Send")');

    // Should show delivery status
    await expect(page.locator('[aria-label*="delivered"]')).toBeVisible();

    // After simulated read (would require WebSocket mock)
    // Should show read status with checkmarks
  });

  test('should search messages', async ({ page }) => {
    // Click search button
    await page.click('button[aria-label*="search"]');

    // Type search query
    await page.fill('input[placeholder*="search"]', 'test message');

    // Should show search results
    await expect(page.locator('[role="listitem"]')).toBeVisible();
  });

  test('should filter messages', async ({ page }) => {
    // Open advanced search
    await page.click('button[aria-label*="search"]');
    await page.click('button:has-text("Advanced")');

    // Apply filters
    await page.click('text=Filter by author');
    await page.click('text=John Doe');

    await page.click('button:has-text("Apply Filters")');

    // Should show filtered messages
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should use @mentions', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="message"]');

    // Type @
    await textarea.fill('Hello @');

    // Should show mention suggestions
    await expect(page.locator('[role="listbox"]')).toBeVisible();

    // Click a suggestion
    await page.click('[role="option"]:has-text("John Doe")');

    // Should insert mention
    const value = await textarea.inputValue();
    expect(value).toContain('@John Doe');
  });

  test('should navigate mentions with keyboard', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="message"]');

    await textarea.fill('@');

    // Wait for suggestions
    await page.waitForSelector('[role="listbox"]');

    // Press down arrow
    await textarea.press('ArrowDown');

    // Press enter to select
    await textarea.press('Enter');

    // Should insert selected mention
    const value = await textarea.inputValue();
    expect(value).toMatch(/@\w+\s+/);
  });

  test('should add emoji reactions', async ({ page }) => {
    // Hover over a message
    const message = page.locator('text=test message').first();
    await message.hover();

    // Click reaction button
    await page.click('button[aria-label*="react"]');

    // Click emoji
    await page.click('[role="button"]:has-text("👍")');

    // Should show reaction on message
    await expect(page.locator('text=👍')).toBeVisible();
  });

  test('should create message thread', async ({ page }) => {
    // Click reply button on a message
    const message = page.locator('text=test message').first();
    await message.hover();
    await page.click('button[aria-label*="reply"]');

    // Should open thread view
    await expect(page.locator('text=/thread|replies/i')).toBeVisible();

    // Send reply
    await page.fill('textarea[placeholder*="message"]', 'This is a reply');
    await page.click('button:has-text("Send")');

    // Should show reply in thread
    await expect(page.locator('text=This is a reply')).toBeVisible();
  });

  test('should mark messages as unread', async ({ page }) => {
    const message = page.locator('text=test message').first();
    await message.hover();

    // Click mark unread button
    await page.click('button[aria-label*="mark.*unread"]');

    // Should show unread indicator
    await expect(page.locator('[aria-label*="unread"]')).toBeVisible();
  });

  test('should delete message', async ({ page }) => {
    const message = page.locator('text=test message').first();
    await message.hover();

    // Click delete button
    await page.click('button[aria-label*="delete"]');

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Should remove message
    await expect(message).not.toBeVisible();
  });
});

test.describe('Messaging Performance', () => {
  test('should load messages quickly', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    const startTime = Date.now();
    await page.goto('/dashboard/messages');

    // Wait for messages to load
    await page.waitForSelector('[role="list"]');

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should lazy load older messages on scroll', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard/messages');

    // Get initial message count
    const initialCount = await page.locator('[role="listitem"]').count();

    // Scroll to top
    await page.evaluate(() => {
      const container = document.querySelector('[role="list"]');
      if (container) container.scrollTop = 0;
    });

    // Wait for lazy load
    await page.waitForTimeout(1000);

    // Should have loaded more messages
    const newCount = await page.locator('[role="listitem"]').count();
    expect(newCount).toBeGreaterThan(initialCount);
  });
});
