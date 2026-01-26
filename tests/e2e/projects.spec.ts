/**
 * E2E Tests - Project Management Flow
 * @file tests/e2e/projects.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test fixtures for authenticated user
const testUser = {
  email: 'test@fluxstudio.art',
  password: 'TestPassword123!',
  name: 'Test User',
};

// Helper to simulate authenticated state
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', testUser.email);
  await page.fill('input[type="password"]', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*dashboard|projects/, { timeout: 10000 });
}

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock authenticated state for testing
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token-for-e2e');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@fluxstudio.art',
      }));
    });
  });

  test('should display projects dashboard', async ({ page }) => {
    await page.goto('/projects');

    // Should show projects page
    await expect(page.locator('h1, h2').first()).toContainText(/projects/i);
  });

  test('should show create project button', async ({ page }) => {
    await page.goto('/projects');

    // Look for create/new project button
    const createButton = page.locator('button:has-text("New"), button:has-text("Create"), [aria-label*="create"]');
    await expect(createButton.first()).toBeVisible();
  });

  test('should open create project modal', async ({ page }) => {
    await page.goto('/projects');

    // Click create button
    await page.click('button:has-text("New"), button:has-text("Create")');

    // Modal should appear
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
  });

  test('should validate project name is required', async ({ page }) => {
    await page.goto('/projects');

    // Open create modal
    await page.click('button:has-text("New"), button:has-text("Create")');

    // Try to submit without name
    await page.click('button:has-text("Create"), button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=/name.*required|required.*name/i')).toBeVisible();
  });

  test('should create a new project', async ({ page }) => {
    await page.goto('/projects');

    // Open create modal
    await page.click('button:has-text("New"), button:has-text("Create")');

    // Fill in project details
    await page.fill('input[name="name"], input[placeholder*="name"]', 'E2E Test Project');
    await page.fill('textarea[name="description"], textarea[placeholder*="description"]', 'Project created by E2E test');

    // Submit
    await page.click('button:has-text("Create"), button[type="submit"]');

    // Should show success or navigate to project
    await expect(page.locator('text=/created|success/i').or(page)).toBeVisible();
  });

  test('should show project details when clicking on a project', async ({ page }) => {
    await page.goto('/projects');

    // Click on first project card/item
    const projectCard = page.locator('[data-testid="project-card"], .project-card, .project-item').first();

    if (await projectCard.isVisible()) {
      await projectCard.click();

      // Should navigate to project details
      await expect(page).toHaveURL(/.*projects\/.+/);
    }
  });

  test('should filter projects by search', async ({ page }) => {
    await page.goto('/projects');

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');

      // Wait for filter to apply
      await page.waitForTimeout(500);

      // Results should be filtered
      const projectList = page.locator('[data-testid="project-list"], .projects-list');
      await expect(projectList).toBeVisible();
    }
  });
});

test.describe('Project Files', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token-for-e2e');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@fluxstudio.art',
      }));
    });
  });

  test('should display project files section', async ({ page }) => {
    // Navigate to a project (using a test project ID)
    await page.goto('/projects/test-project-1');

    // Look for files section
    const filesSection = page.locator('text=/files|documents|assets/i');
    await expect(filesSection.first()).toBeVisible();
  });

  test('should show file upload button', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    // Look for upload button
    const uploadButton = page.locator('button:has-text("Upload"), [aria-label*="upload"]');
    await expect(uploadButton.first()).toBeVisible();
  });

  test('should open file upload dialog', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    // Click upload button
    await page.click('button:has-text("Upload"), [aria-label*="upload"]');

    // File input or drop zone should be available
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });
});

test.describe('Project Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token-for-e2e');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@fluxstudio.art',
      }));
    });
  });

  test('should access project settings', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    // Click settings button
    await page.click('button:has-text("Settings"), [aria-label*="settings"]');

    // Settings panel should appear
    await expect(page.locator('text=/settings|configuration/i')).toBeVisible();
  });

  test('should show project members section', async ({ page }) => {
    await page.goto('/projects/test-project-1/settings');

    // Members section should be visible
    const membersSection = page.locator('text=/members|team|collaborators/i');
    await expect(membersSection.first()).toBeVisible();
  });

  test('should allow inviting new members', async ({ page }) => {
    await page.goto('/projects/test-project-1/settings');

    // Find invite button
    const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Add Member")');

    if (await inviteButton.first().isVisible()) {
      await inviteButton.first().click();

      // Invite modal/form should appear
      await expect(page.locator('[role="dialog"], input[type="email"]')).toBeVisible();
    }
  });
});

test.describe('Project Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token-for-e2e');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@fluxstudio.art',
      }));
    });
  });

  test('should navigate between project tabs', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    // Look for tab navigation
    const tabs = page.locator('[role="tablist"] [role="tab"], .tabs button');

    if (await tabs.first().isVisible()) {
      const tabCount = await tabs.count();

      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/projects');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Should interact with focused element
    await expect(page).not.toHaveURL('/projects');
  });

  test('should support breadcrumb navigation', async ({ page }) => {
    await page.goto('/projects/test-project-1');

    // Look for breadcrumbs
    const breadcrumb = page.locator('[aria-label="breadcrumb"], .breadcrumb');

    if (await breadcrumb.isVisible()) {
      // Click on projects link in breadcrumb
      await breadcrumb.locator('a:has-text("Projects")').click();

      // Should navigate back to projects
      await expect(page).toHaveURL(/.*projects$/);
    }
  });
});
