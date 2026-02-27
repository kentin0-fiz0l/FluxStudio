/**
 * Lighthouse CI Configuration
 *
 * Enforced thresholds (error level -- fails CI on violation):
 *   Performance   >= 90
 *   Accessibility >= 95
 *   Best Practices >= 90
 *   SEO           >= 90
 *
 * Run locally:  npx @lhci/cli autorun
 * CI:           lhci autorun  (installed globally in the workflow)
 */

module.exports = {
  ci: {
    collect: {
      staticDistDir: './build',
      numberOfRuns: 3,
      url: [
        'http://localhost/',
        'http://localhost/login',
        'http://localhost/pricing',
        'http://localhost/try',
      ],
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // -- Category scores (error = fail the build) --
        'categories:performance': ['error', { minScore: 0.90 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['error', { minScore: 0.90 }],

        // -- Core Web Vitals --
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],

        // -- Audits relaxed for SPA / known non-blockers --
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
