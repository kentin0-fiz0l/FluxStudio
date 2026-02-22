/**
 * Lighthouse CI Configuration
 *
 * Sprint 43: Phase 6.1 Performance & Launch Optimization
 *
 * Enforces 90+ scores across performance, accessibility, and best practices.
 *
 * Run locally: npx @lhci/cli autorun
 * CI: treosh/lighthouse-ci-action@v12
 */

module.exports = {
  ci: {
    collect: {
      staticDistDir: './build',
      numberOfRuns: 3,
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/pricing',
        'http://localhost:3000/try',
      ],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance — enforced at 90+ (error, not warn)
        'categories:performance': ['error', { minScore: 0.9 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],

        // Accessibility — enforced at 90+
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Best practices — enforced at 90+
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // Allow some common issues that are not blockers
        'unsized-images': 'off',
        'uses-responsive-images': 'off',
        'offscreen-images': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
