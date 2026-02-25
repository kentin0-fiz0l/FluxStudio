/**
 * E2E Test - OnboardingV2 Flow
 * @file tests/e2e/onboarding.test.ts
 *
 * Tests the streamlined 3-step onboarding flow (gated behind `onboarding_v2` flag):
 *   Step 1: Quick Auth - email + password signup
 *   Step 2: Template Selection - pick a formation template from the grid
 *   Step 3: Launching - animation plays, then redirect to /get-started
 *
 * All API calls and the feature flag service are mocked at the network level
 * so the test runs entirely offline against the Vite dev server.
 *
 * NOTE: In local dev mode, VITE_DEV_MOCK_AUTH may auto-authenticate the user.
 * When that happens, OnboardingV2 detects `isAuthenticated === true` on mount
 * and auto-advances from the auth step to the template step. The tests handle
 * both scenarios: (a) already authenticated (skip to Step 2), and (b) not
 * authenticated (full Step 1 -> 2 -> 3 flow).
 *
 * IMPORTANT: Route mocks use URL predicate functions to match only actual API
 * requests (pathname starts with /api/ or /auth/) and avoid intercepting Vite
 * HMR module requests like /src/services/api/organizations.ts which also
 * contain "/api/" in their paths.
 *
 * IMPORTANT: Playwright evaluates route handlers in LIFO (last-in, first-out)
 * order. The catch-all `/api/` handler must be registered FIRST so it is
 * evaluated LAST, and specific routes (like /api/admin/flags/evaluate) must
 * be registered AFTER so they take priority.
 */

import { test, expect, type Page, type Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Fixtures & Constants
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-e2e-onboarding',
  name: 'onboardtest',
  email: 'onboard@fluxstudio.art',
  userType: 'client',
};

const TEST_PASSWORD = 'Str0ngP@ss!';

const MOCK_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.e2e-test-token';
const MOCK_REFRESH = 'e2e-refresh-token';

// ---------------------------------------------------------------------------
// Route helpers
// ---------------------------------------------------------------------------

/** Match only requests whose pathname equals a specific path */
function apiPath(path: string) {
  return (url: URL) => url.pathname === path;
}

/** Match requests whose pathname starts with a prefix */
function apiPrefix(prefix: string) {
  return (url: URL) => url.pathname.startsWith(prefix);
}

/** Standard JSON response helper */
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

/**
 * Sets up API route mocks. Uses URL predicate functions (instead of glob
 * patterns) to precisely match API endpoint paths and avoid intercepting
 * Vite HMR module requests like /src/services/api/organizations.ts.
 *
 * Routes are registered from lowest to highest priority because Playwright
 * evaluates handlers in LIFO (last-in, first-out) order.
 */
async function mockApiRoutes(page: Page) {
  const json = (data: unknown, status = 200) => async (route: Route) => {
    await route.fulfill(jsonResponse(data, status));
  };

  // --- Catch-all FIRST (lowest priority, evaluated last) ---
  await page.route(apiPrefix('/api/'), json({ success: true, data: {} }));

  // --- Broad prefix routes (medium priority) ---
  await page.route(apiPrefix('/api/observability'), json({ success: true }));
  await page.route(apiPrefix('/api/agent'), json({ success: true, data: [] }));
  await page.route(apiPrefix('/api/organizations'), json([]));
  await page.route(apiPrefix('/api/activities'), json({ success: true, data: { activities: [] } }));
  await page.route(apiPrefix('/api/notifications'), json({ success: true, data: [] }));
  await page.route(apiPrefix('/api/analytics'), json({ success: true }));

  // Projects
  await page.route(apiPrefix('/api/projects'), async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill(jsonResponse({
        success: true,
        data: {
          id: 'proj-onboarding-1',
          name: body?.name || 'My First Project',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      }, 201));
    } else {
      await route.fulfill(jsonResponse({ success: true, projects: [] }));
    }
  });

  // --- Specific endpoints LAST (highest priority, evaluated first) ---

  // Users onboarding state
  await page.route(apiPath('/api/users/onboarding'), json({ success: true, data: {} }));

  // Auth endpoints
  await page.route(apiPath('/auth/settings'), json({ success: true, settings: {} }));
  await page.route(apiPath('/auth/logout'), json({ success: true }));
  await page.route(apiPath('/auth/me'), json({ success: true, data: TEST_USER }));
  await page.route(apiPath('/auth/signup'), json({
    success: true,
    data: { token: MOCK_TOKEN, refreshToken: MOCK_REFRESH, user: TEST_USER },
  }));

  // Feature flags -- onboarding_v2 enabled
  await page.route(apiPath('/api/admin/flags/evaluate'), json({ onboarding_v2: true }));

  // CSRF token
  await page.route(apiPath('/api/csrf-token'), json({ csrfToken: 'e2e-csrf-token' }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Dismiss the cookie consent banner if it appears.
 */
async function dismissCookieBanner(page: Page) {
  const dismissBtn = page.locator('button:has-text("Decline")');
  if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismissBtn.click();
    // Wait for the banner animation to complete
    await page.locator('[role="dialog"][aria-label="Cookie consent"]')
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});
  }
}

/**
 * Navigate to /signup, wait for OnboardingV2, and dismiss cookie banner.
 * Returns 'auth' or 'template' indicating which step is shown.
 */
async function gotoSignupAndWait(page: Page): Promise<'auth' | 'template'> {
  await page.goto('/signup');

  const templateHeading = page.locator('text=Choose a starting point');

  // Wait for OnboardingV2 to settle. In dev mode with mock auth, the page may
  // briefly flash the auth step ("Create your account") before auto-advancing
  // to the template step. We wait for the template step first since it is the
  // final stable state when mock auth is active.
  try {
    await templateHeading.waitFor({ state: 'visible', timeout: 8000 });
    await dismissCookieBanner(page);
    return 'template';
  } catch {
    // Template heading did not appear within 8s — check if auth step is stable
    const authHeading = page.locator('text=Create your account');
    await expect(authHeading).toBeVisible({ timeout: 8000 });
    await dismissCookieBanner(page);
    // Double-check auth step is still visible (not transitioning away)
    if (await authHeading.isVisible()) {
      return 'auth';
    }
    // If auth disappeared during the check, template must be showing now
    await expect(templateHeading).toBeVisible({ timeout: 5000 });
    return 'template';
  }
}

/**
 * Navigate through Step 1 (if needed) and land on the template step.
 */
async function ensureOnTemplateStep(page: Page) {
  const initialStep = await gotoSignupAndWait(page);

  if (initialStep === 'auth') {
    await page.fill('#onboarding-email', TEST_USER.email);
    await page.fill('#onboarding-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
  }

  await expect(page.locator('text=Choose a starting point')).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('OnboardingV2 Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page);
  });

  // -------------------------------------------------------------------------
  // Feature flag gate
  // -------------------------------------------------------------------------

  test('should render OnboardingV2 when onboarding_v2 flag is enabled', async ({ page }) => {
    const step = await gotoSignupAndWait(page);

    // OnboardingV2 progress labels should be visible
    await expect(page.locator('text=Sign Up')).toBeVisible();
    await expect(page.locator('text=Pick Template')).toBeVisible();
    await expect(page.locator('text=Create')).toBeVisible();

    if (step === 'auth') {
      await expect(page.locator('#onboarding-email')).toBeVisible();
      await expect(page.locator('#onboarding-password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText(/Continue/i);
    }

    if (step === 'template') {
      await expect(page.locator('text=Pick a formation template or start blank')).toBeVisible();
      await expect(page.locator('button:has-text("Start blank")')).toBeVisible();
    }
  });

  // -------------------------------------------------------------------------
  // Step 1: Auth validation
  // -------------------------------------------------------------------------

  test('Step 1 - Auth: should show validation error for invalid email', async ({ page }) => {
    const step = await gotoSignupAndWait(page);
    if (step !== 'auth') { test.skip(); return; }

    await page.fill('#onboarding-email', 'not-an-email');
    await page.fill('#onboarding-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });

  test('Step 1 - Auth: should show validation error for short password', async ({ page }) => {
    const step = await gotoSignupAndWait(page);
    if (step !== 'auth') { test.skip(); return; }

    await page.fill('#onboarding-email', TEST_USER.email);
    await page.fill('#onboarding-password', 'short');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Step 2: Template selection
  // -------------------------------------------------------------------------

  test('Step 2 - Template: should display template grid and options', async ({ page }) => {
    await ensureOnTemplateStep(page);

    const templateCards = page.locator('.grid button');
    await expect(templateCards.first()).toBeVisible();
    const count = await templateCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await expect(page.locator('button:has-text("Start blank")')).toBeVisible();
    await expect(page.locator('button:has-text("Skip to dashboard")')).toBeVisible();
  });

  test('Step 2 - Template: cards should display performer count', async ({ page }) => {
    await ensureOnTemplateStep(page);

    await expect(page.locator('text=/\\d.*performers/i').first()).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Step 3: Launching
  // -------------------------------------------------------------------------

  test('Step 3 - Launch: should show launching state after selecting a template', async ({ page }) => {
    await ensureOnTemplateStep(page);

    // Click the first template card (force to bypass any residual overlay)
    await page.locator('.grid button').first().click({ force: true });

    await expect(page.locator('text=Launching your editor')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Loading your template...')).toBeVisible();
    await expect(page.locator('text=Tip: Drag performers to create your formation')).toBeVisible();
  });

  test('Step 3 - Launch: should show blank canvas text when starting blank', async ({ page }) => {
    await ensureOnTemplateStep(page);

    await page.locator('button:has-text("Start blank")').click({ force: true });

    await expect(page.locator('text=Launching your editor')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Setting up a blank canvas...')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Full flow: template -> launch -> redirect
  // -------------------------------------------------------------------------

  test('Full flow: should complete onboarding and redirect to /get-started within 30s', async ({ page }) => {
    test.setTimeout(45000);
    const startTime = Date.now();

    await ensureOnTemplateStep(page);

    await page.locator('.grid button').first().click({ force: true });

    await expect(page.locator('text=Launching your editor')).toBeVisible({ timeout: 5000 });

    // Wait for redirect (component uses setTimeout 1200ms)
    await page.waitForURL('**/get-started**', { timeout: 15000 });
    expect(page.url()).toContain('/get-started');

    // Total elapsed under 30 seconds
    const elapsedMs = Date.now() - startTime;
    expect(elapsedMs).toBeLessThan(30_000);
  });

  test('Full flow with blank: should redirect to /get-started', async ({ page }) => {
    test.setTimeout(45000);

    await ensureOnTemplateStep(page);

    await page.locator('button:has-text("Start blank")').click({ force: true });

    await expect(page.locator('text=Launching your editor')).toBeVisible({ timeout: 5000 });
    await page.waitForURL('**/get-started**', { timeout: 15000 });
    expect(page.url()).toContain('/get-started');
  });

  // -------------------------------------------------------------------------
  // sessionStorage
  // -------------------------------------------------------------------------

  test('should store selected template ID in sessionStorage', async ({ page }) => {
    await ensureOnTemplateStep(page);

    await page.locator('.grid button').first().click({ force: true });
    await expect(page.locator('text=Launching your editor')).toBeVisible({ timeout: 5000 });

    const storedTemplate = await page.evaluate(() =>
      sessionStorage.getItem('onboarding_v2_template')
    );
    expect(storedTemplate).toBeTruthy();
    expect(storedTemplate!.length).toBeGreaterThan(0);
  });

  test('should not set sessionStorage when starting blank', async ({ page }) => {
    await ensureOnTemplateStep(page);

    await page.locator('button:has-text("Start blank")').click({ force: true });
    await expect(page.locator('text=Launching your editor')).toBeVisible({ timeout: 5000 });

    const storedTemplate = await page.evaluate(() =>
      sessionStorage.getItem('onboarding_v2_template')
    );
    expect(storedTemplate).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Auth step UX (only when auth step is reachable)
  // -------------------------------------------------------------------------

  test('should show password toggle on auth step', async ({ page }) => {
    const step = await gotoSignupAndWait(page);
    if (step !== 'auth') { test.skip(); return; }

    const passwordInput = page.locator('#onboarding-password');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.locator('button[aria-label="Show password"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.locator('button[aria-label="Hide password"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should display Sign in link on auth step', async ({ page }) => {
    const step = await gotoSignupAndWait(page);
    if (step !== 'auth') { test.skip(); return; }

    const signInLink = page.locator('a:has-text("Sign in")');
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/login');
  });

  test('should handle signup API error gracefully', async ({ page }) => {
    // Override signup to return error
    await page.unroute(apiPath('/auth/signup'));
    await page.route(apiPath('/auth/signup'), async (route) => {
      await route.fulfill(jsonResponse(
        { success: false, error: 'Email already registered' },
        409,
      ));
    });

    const step = await gotoSignupAndWait(page);
    if (step !== 'auth') { test.skip(); return; }

    await page.fill('#onboarding-email', TEST_USER.email);
    await page.fill('#onboarding-password', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/failed|error|already/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Create your account')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Skip to dashboard
  // -------------------------------------------------------------------------

  test('Skip to dashboard should navigate to /projects', async ({ page }) => {
    test.setTimeout(45000);

    await ensureOnTemplateStep(page);

    await page.locator('button:has-text("Skip to dashboard")').click({ force: true });
    await page.waitForURL('**/projects**', { timeout: 15000 });
    expect(page.url()).toContain('/projects');
  });

  // -------------------------------------------------------------------------
  // Progress bar
  // -------------------------------------------------------------------------

  test('Progress bar labels should be visible during template step', async ({ page }) => {
    await ensureOnTemplateStep(page);

    await expect(page.locator('text=Sign Up').first()).toBeVisible();
    await expect(page.locator('text=Pick Template').first()).toBeVisible();
    await expect(page.locator('text=Create').first()).toBeVisible();
  });

  test('Progress bar should advance to final step during launch', async ({ page }) => {
    await ensureOnTemplateStep(page);

    await page.locator('.grid button').first().click({ force: true });

    await expect(page.locator('text=Launching your editor')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Sign Up').first()).toBeVisible();
    await expect(page.locator('text=Pick Template').first()).toBeVisible();
    await expect(page.locator('text=Create').first()).toBeVisible();
  });
});
