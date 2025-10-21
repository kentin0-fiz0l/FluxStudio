/**
 * E2E Tests - Authentication Flow
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/FluxStudio|Creative Design/i);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('text=Login');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1, h2')).toContainText(/sign in|login/i);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.locator('h1, h2')).toContainText(/sign up|create account/i);
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('/login');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/email.*required/i')).toBeVisible();
  });

  test('should show validation errors on invalid email', async ({ page }) => {
    await page.goto('/login');

    // Fill invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show email validation error
    await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
  });

  test('should handle Google OAuth login button', async ({ page }) => {
    await page.goto('/login');

    // Should have Google login button
    const googleButton = page.locator('button:has-text("Google")');
    await expect(googleButton).toBeVisible();

    // Click should trigger OAuth flow (we won't complete it in test)
    await googleButton.click();

    // Wait for potential redirect or popup (handled by OAuth provider)
    // In real tests, you'd mock the OAuth response
  });

  test('should persist login state across page refreshes', async ({ page, context }) => {
    // Note: This test assumes you have a test user
    // In real implementation, you'd set up test fixtures

    // Simulate logged in state by setting cookies/localStorage
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');

    // Should stay logged in after refresh
    await page.reload();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should logout successfully', async ({ page, context }) => {
    // Simulate logged in state
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'test-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');

    // Click logout (might be in a dropdown menu)
    await page.click('[aria-label="User menu"]');
    await page.click('text=Logout');

    // Should redirect to homepage or login
    await expect(page).toHaveURL(/\/$|\/login/);
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Signup Flow', () => {
  test('should complete multi-step signup wizard', async ({ page }) => {
    await page.goto('/signup');

    // Step 1: Account details
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button:has-text("Next")');

    // Step 2: User type selection
    await page.click('text=/designer|client/i');
    await page.click('button:has-text("Next")');

    // Step 3: Confirmation
    // (Actual steps depend on your signup wizard implementation)
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input[name="password"]', 'weak');

    // Should show weak password indicator
    await expect(page.locator('text=/weak|too short/i')).toBeVisible();

    await page.fill('input[name="password"]', 'StrongPassword123!');

    // Should show strong password indicator
    await expect(page.locator('text=/strong|good/i')).toBeVisible();
  });

  test('should prevent duplicate email registration', async ({ page }) => {
    await page.goto('/signup');

    // Try to register with existing email
    await page.fill('input[name="email"]', 'existing@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/email.*already.*exists/i')).toBeVisible();
  });
});

test.describe('Password Reset', () => {
  test('should navigate to password reset page', async ({ page }) => {
    await page.goto('/login');

    await page.click('text=Forgot Password');
    await expect(page).toHaveURL(/.*reset|forgot/);
  });

  test('should send password reset email', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Forgot Password');

    await page.fill('input[type="email"]', 'user@example.com');
    await page.click('button:has-text("Send Reset Link")');

    // Should show success message
    await expect(page.locator('text=/email.*sent|check.*inbox/i')).toBeVisible();
  });
});
