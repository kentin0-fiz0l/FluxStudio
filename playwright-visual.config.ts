import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Visual Regression Configuration
 *
 * Sprint 42: Phase 5.5 Deployment Confidence
 *
 * Separate config for visual regression tests:
 * - Single browser (Chromium) for consistent screenshots
 * - Fixed viewport for deterministic rendering
 * - Stricter diff thresholds
 *
 * Usage:
 *   npx playwright test --config=playwright-visual.config.ts
 *   npx playwright test --config=playwright-visual.config.ts --update-snapshots  # Update baselines
 */
export default defineConfig({
  testDir: './tests/visual',

  fullyParallel: false, // Sequential for consistent screenshots
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for consistency

  reporter: [
    ['html', { outputFolder: 'visual-report' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',

    // Fixed viewport for deterministic screenshots
    viewport: { width: 1280, height: 720 },

    // Disable animations for stable screenshots
    actionTimeout: 10000,
  },

  // Single browser for consistent baselines
  projects: [
    {
      name: 'visual-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // Disable animations via CSS
        contextOptions: {
          reducedMotion: 'reduce',
        },
      },
    },
  ],

  // Snapshot settings
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // Allow 1% pixel diff
      threshold: 0.2, // Pixel-level color threshold
      animations: 'disabled',
    },
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
