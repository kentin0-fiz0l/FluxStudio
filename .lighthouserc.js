/**
 * Lighthouse CI Configuration
 *
 * Sprint 40: Phase 5.3 Observability & Analytics
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
      ],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance
        'categories:performance': ['warn', { minScore: 0.8 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.15 }],
        'total-blocking-time': ['warn', { maxNumericValue: 400 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],

        // Accessibility
        'categories:accessibility': ['error', { minScore: 0.9 }],

        // Best practices
        'categories:best-practices': ['warn', { minScore: 0.85 }],

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
