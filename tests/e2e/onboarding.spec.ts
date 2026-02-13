/**
 * E2E Tests - Onboarding Flow
 * @file tests/e2e/onboarding.spec.ts
 */

import { test, expect } from '@playwright/test';
import { OnboardingPage } from './pages/OnboardingPage';

test.describe('Onboarding Flow', () => {
  let onboarding: OnboardingPage;

  test.beforeEach(async ({ page }) => {
    // New user without completed onboarding
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'test-token-for-e2e');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-new',
        name: 'New User',
        email: 'new@fluxstudio.art',
        onboardingComplete: false,
      }));
    });
    onboarding = new OnboardingPage(page);
  });

  test('should load onboarding page', async ({ page }) => {
    await onboarding.goto();
    await onboarding.expectLoaded();
    await expect(onboarding.heading).toBeVisible();
  });

  test('should display step navigation controls', async ({ page }) => {
    await onboarding.goto();
    await onboarding.expectLoaded();

    // Should have either next/continue or skip button
    const nextVisible = await onboarding.nextButton.first().isVisible().catch(() => false);
    const skipVisible = await onboarding.skipButton.first().isVisible().catch(() => false);

    expect(nextVisible || skipVisible).toBeTruthy();
  });

  test('should allow stepping through onboarding', async ({ page }) => {
    await onboarding.goto();
    await onboarding.expectLoaded();

    const initialHeading = await onboarding.heading.textContent();

    // Try to advance to the next step
    const nextVisible = await onboarding.nextButton.first().isVisible().catch(() => false);
    if (nextVisible) {
      await onboarding.goNext();
      await page.waitForTimeout(500);

      // Page content should change after advancing
      const newHeading = await onboarding.heading.textContent();
      // Either heading changed or URL changed
      const urlChanged = !page.url().endsWith('/onboarding');
      expect(newHeading !== initialHeading || urlChanged).toBeTruthy();
    }
  });
});
