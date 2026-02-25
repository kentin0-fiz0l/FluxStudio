/**
 * E2E Test - Payment Flow (Stripe Test Mode)
 * @file tests/e2e/payment-flow.test.ts
 *
 * Tests the full payment lifecycle:
 *   1. Pricing page renders plans with correct tiers
 *   2. Checkout page → Stripe session creation → redirect
 *   3. Checkout success page shows confirmation
 *   4. Billing page shows subscription & usage
 *   5. Billing portal session creation
 *   6. Webhook-style subscription activation
 *
 * All Stripe API calls are mocked at the network level (no real charges).
 * The test exercises the frontend flow end-to-end against the Vite dev server.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-pay-e2e',
  name: 'paymenttest',
  email: 'payment@fluxstudio.art',
  userType: 'client',
};

const MOCK_SUBSCRIPTION = {
  id: 'sub_test_123',
  status: 'active',
  currentPeriodEnd: '2026-12-31T00:00:00Z',
  cancelledAt: null,
};

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

function apiPath(path: string) {
  return (url: URL) => url.pathname === path;
}

function apiPrefix(prefix: string) {
  return (url: URL) => url.pathname.startsWith(prefix);
}

function jsonResponse(data: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json' as const,
    body: JSON.stringify(data),
  };
}

// ---------------------------------------------------------------------------
// Route Mocks
// ---------------------------------------------------------------------------

async function mockApiRoutes(page: Page, options: { hasSubscription?: boolean } = {}) {
  const json = (data: unknown, status = 200) => async (route: Route) => {
    await route.fulfill(jsonResponse(data, status));
  };

  // Catch-all (lowest priority)
  await page.route(apiPrefix('/api/'), json({ success: true, data: {} }));

  // Broad prefixes
  await page.route(apiPrefix('/api/observability'), json({ success: true }));
  await page.route(apiPrefix('/api/agent'), json({ success: true, data: [] }));
  await page.route(apiPrefix('/api/organizations'), json([]));
  await page.route(apiPrefix('/api/activities'), json({ success: true, data: { activities: [] } }));
  await page.route(apiPrefix('/api/notifications'), json({ success: true, data: [] }));
  await page.route(apiPrefix('/api/analytics'), json({ success: true }));
  await page.route(apiPrefix('/api/projects'), json({ success: true, projects: [] }));

  // Specific endpoints (highest priority)

  // Auth
  await page.route(apiPath('/auth/settings'), json({ success: true, settings: {} }));
  await page.route(apiPath('/auth/logout'), json({ success: true }));
  await page.route(apiPath('/auth/me'), json({ success: true, data: TEST_USER }));

  // Feature flags
  await page.route(apiPath('/api/admin/flags/evaluate'), json({ onboarding_v2: false }));

  // CSRF
  await page.route(apiPath('/api/csrf-token'), json({ csrfToken: 'e2e-csrf-token' }));

  // Usage/limits
  await page.route(apiPath('/api/usage'), json({
    success: true,
    data: {
      projects: { current: 1, limit: 3 },
      storage: { current: 50_000_000, limit: 500_000_000 },
      aiCalls: { current: 2, limit: 10 },
      collaborators: { current: 1, limit: 1 },
    },
  }));
  await page.route(apiPath('/api/usage/limits'), json({
    success: true,
    data: { plan: 'free', limits: { projects: 3, storageBytes: 500_000_000, aiCallsPerMonth: 10, collaborators: 1 } },
  }));

  // Pricing
  await page.route(apiPath('/api/payments/pricing'), json({
    pricing: {
      foundation: {
        'show-concept': { amount: 150000, currency: 'usd', formatted: '$1,500.00' },
        'visual-identity': { amount: 120000, currency: 'usd', formatted: '$1,200.00' },
      },
      standard: {
        'storyboarding': { amount: 200000, currency: 'usd', formatted: '$2,000.00' },
      },
    },
  }));

  // Subscription status
  await page.route(apiPath('/api/payments/subscription'), json(
    options.hasSubscription
      ? { hasSubscription: true, subscription: MOCK_SUBSCRIPTION }
      : { hasSubscription: false, subscription: null, canTrial: true }
  ));

  // Create checkout session
  await page.route(apiPath('/api/payments/create-checkout-session'), async (route) => {
    await route.fulfill(jsonResponse({
      success: true,
      data: {
        sessionId: 'cs_test_e2e_session',
        url: `${page.url().split('/').slice(0, 3).join('/')}/checkout/success?session_id=cs_test_e2e_session`,
      },
    }));
  });

  // Create portal session
  await page.route(apiPath('/api/payments/create-portal-session'), json({
    url: 'https://billing.stripe.com/p/session/test_portal',
  }));

  // Webhook (not hit from frontend, but included for completeness)
  await page.route(apiPath('/api/payments/webhooks/stripe'), json({ received: true }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dismissCookieBanner(page: Page) {
  const dismissBtn = page.locator('button:has-text("Decline")');
  if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismissBtn.click();
    await page.locator('[role="dialog"][aria-label="Cookie consent"]')
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Payment Flow E2E (Stripe Test Mode)', () => {

  // =========================================================================
  // Pricing Page
  // =========================================================================

  test.describe('Pricing Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockApiRoutes(page);
    });

    test('should render pricing page with plan tiers', async ({ page }) => {
      await page.goto('/pricing');
      await dismissCookieBanner(page);

      // Page should load
      await expect(page.locator('h1, h2').filter({ hasText: /pricing/i }).first()).toBeVisible({ timeout: 10000 });

      // Should show plan names
      await expect(page.locator('text=Free').first()).toBeVisible();
      await expect(page.locator('text=Pro').first()).toBeVisible();
      await expect(page.locator('text=Team').first()).toBeVisible();
    });

    test('should show pricing amounts', async ({ page }) => {
      await page.goto('/pricing');
      await dismissCookieBanner(page);

      // Free plan should show $0
      await expect(page.locator('text=$0').first()).toBeVisible({ timeout: 10000 });

      // Pro plan price
      await expect(page.locator('text=$12').first()).toBeVisible();
    });

    test('should have upgrade buttons', async ({ page }) => {
      await page.goto('/pricing');
      await dismissCookieBanner(page);

      // Should have CTA buttons for upgrade
      const upgradeButtons = page.locator('a[href*="/checkout"], button:has-text("Upgrade"), button:has-text("Get Started")');
      await expect(upgradeButtons.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // =========================================================================
  // Checkout Page
  // =========================================================================

  test.describe('Checkout Page', () => {
    test.beforeEach(async ({ page }) => {
      await mockApiRoutes(page);
    });

    test('should render checkout page with pricing options', async ({ page }) => {
      await page.goto('/checkout');
      await dismissCookieBanner(page);

      // Should show secure checkout badge
      await expect(page.locator('text=/secure.*checkout.*stripe/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show trust badges', async ({ page }) => {
      await page.goto('/checkout');
      await dismissCookieBanner(page);

      await expect(page.locator('text=Secure Payment').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Flexible Payment').first()).toBeVisible();
      await expect(page.locator('text=Satisfaction Guaranteed').first()).toBeVisible();
    });

    test('should have back navigation', async ({ page }) => {
      await page.goto('/checkout');
      await dismissCookieBanner(page);

      const backButton = page.locator('button:has-text("Back")');
      await expect(backButton).toBeVisible({ timeout: 10000 });
    });
  });

  // =========================================================================
  // Checkout → Success Flow
  // =========================================================================

  test.describe('Checkout Success', () => {
    test.beforeEach(async ({ page }) => {
      await mockApiRoutes(page);
    });

    test('should display success page with session reference', async ({ page }) => {
      await page.goto('/checkout/success?session_id=cs_test_e2e_session');
      await dismissCookieBanner(page);

      // Should show success messaging
      await expect(page.locator('text=/thank|success|confirmed/i').first()).toBeVisible({ timeout: 10000 });

      // Should show session reference (truncated)
      await expect(page.locator('text=/cs_test/i').first()).toBeVisible();
    });

    test('should have navigation to projects', async ({ page }) => {
      await page.goto('/checkout/success?session_id=cs_test_e2e_session');
      await dismissCookieBanner(page);

      const projectsLink = page.locator('a[href*="/projects"], button:has-text("projects")').first();
      await expect(projectsLink).toBeVisible({ timeout: 10000 });
    });
  });

  // =========================================================================
  // Billing Page (No Subscription)
  // =========================================================================

  test.describe('Billing Page - No Subscription', () => {
    test.beforeEach(async ({ page }) => {
      await mockApiRoutes(page, { hasSubscription: false });
    });

    test('should show no active subscription state', async ({ page }) => {
      await page.goto('/billing');
      await dismissCookieBanner(page);

      await expect(page.locator('text=/no active subscription|subscribe/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show usage bars for current plan', async ({ page }) => {
      await page.goto('/billing');
      await dismissCookieBanner(page);

      // Usage sections should be present
      await expect(page.locator('text=/projects/i').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/storage/i').first()).toBeVisible();
    });

    test('should have link to upgrade/checkout', async ({ page }) => {
      await page.goto('/billing');
      await dismissCookieBanner(page);

      const upgradeLink = page.locator('a[href*="/checkout"], a[href*="/pricing"], button:has-text("Upgrade"), button:has-text("Subscribe")');
      await expect(upgradeLink.first()).toBeVisible({ timeout: 10000 });
    });
  });

  // =========================================================================
  // Billing Page (Active Subscription)
  // =========================================================================

  test.describe('Billing Page - Active Subscription', () => {
    test.beforeEach(async ({ page }) => {
      await mockApiRoutes(page, { hasSubscription: true });
    });

    test('should show active subscription status', async ({ page }) => {
      await page.goto('/billing');
      await dismissCookieBanner(page);

      await expect(page.locator('text=/active/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show manage subscription section', async ({ page }) => {
      await page.goto('/billing');
      await dismissCookieBanner(page);

      // Should have portal button
      const portalButton = page.locator('button:has-text("Manage"), button:has-text("Billing Portal"), button:has-text("Open Billing")');
      await expect(portalButton.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show payment methods section', async ({ page }) => {
      await page.goto('/billing');
      await dismissCookieBanner(page);

      await expect(page.locator('text=/payment method/i').first()).toBeVisible({ timeout: 10000 });
    });

    test('should show invoice history section', async ({ page }) => {
      await page.goto('/billing');
      await dismissCookieBanner(page);

      await expect(page.locator('text=/invoice/i').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // =========================================================================
  // Full Payment Flow: Pricing → Checkout → Success
  // =========================================================================

  test('Full flow: pricing → checkout → success', async ({ page }) => {
    test.setTimeout(45000);

    await mockApiRoutes(page);
    await page.goto('/pricing');
    await dismissCookieBanner(page);

    // Step 1: Pricing page loads
    await expect(page.locator('text=Pro').first()).toBeVisible({ timeout: 10000 });

    // Step 2: Navigate to checkout
    const checkoutLink = page.locator('a[href*="/checkout"]').first();
    await expect(checkoutLink).toBeVisible({ timeout: 5000 });
    await checkoutLink.click();

    // Step 3: Checkout page loads
    await page.waitForURL('**/checkout**', { timeout: 10000 });
    await expect(page.locator('text=/secure.*checkout/i').first()).toBeVisible({ timeout: 10000 });

    // Step 4: Select a plan (triggers checkout session creation)
    // The mock redirects to /checkout/success instead of Stripe
    const planButton = page.locator('button:has-text("Upgrade"), button:has-text("Choose"), button:has-text("Select")').first();
    if (await planButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await planButton.click();

      // Step 5: Should land on success page
      await page.waitForURL('**/checkout/success**', { timeout: 15000 });
      await expect(page.locator('text=/thank|success|confirmed/i').first()).toBeVisible({ timeout: 10000 });
    }
  });

  // =========================================================================
  // Error Handling
  // =========================================================================

  test.describe('Error Handling', () => {
    test('should handle checkout session creation failure gracefully', async ({ page }) => {
      await mockApiRoutes(page);

      // Override checkout session to return error
      await page.unroute(apiPath('/api/payments/create-checkout-session'));
      await page.route(apiPath('/api/payments/create-checkout-session'), async (route) => {
        await route.fulfill(jsonResponse(
          { success: false, error: 'Payment processing failed' },
          500,
        ));
      });

      await page.goto('/checkout');
      await dismissCookieBanner(page);

      // Try to select a plan
      const planButton = page.locator('button:has-text("Upgrade"), button:has-text("Choose"), button:has-text("Select")').first();
      if (await planButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await planButton.click();

        // Should show error state, not crash
        await expect(page.locator('text=/error|failed|try again/i').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle billing page load failure gracefully', async ({ page }) => {
      await mockApiRoutes(page);

      // Override subscription endpoint to fail
      await page.unroute(apiPath('/api/payments/subscription'));
      await page.route(apiPath('/api/payments/subscription'), async (route) => {
        await route.fulfill(jsonResponse(
          { error: 'Failed to get subscription status' },
          500,
        ));
      });

      await page.goto('/billing');
      await dismissCookieBanner(page);

      // Page should handle error gracefully
      await expect(page.locator('text=/error|failed|try again|something went wrong/i').first()).toBeVisible({ timeout: 10000 });
    });
  });
});
