/**
 * Load Test Benchmark Configuration
 * @file tests/load/benchmark.config.js
 *
 * Defines performance targets and thresholds for different test scenarios.
 * Use these benchmarks to determine pass/fail criteria for CI/CD pipelines.
 */

module.exports = {
  /**
   * Environment configurations
   */
  environments: {
    local: {
      authServerUrl: 'http://localhost:3001',
      messagingServerUrl: 'http://localhost:3001',
      collaborationServerUrl: 'http://localhost:4000',
    },
    staging: {
      authServerUrl: process.env.STAGING_API_URL || 'https://staging.fluxstudio.art',
      messagingServerUrl: process.env.STAGING_API_URL || 'https://staging.fluxstudio.art',
      collaborationServerUrl: process.env.STAGING_COLLAB_URL || 'https://staging.fluxstudio.art/collab',
    },
    production: {
      authServerUrl: 'https://fluxstudio.art',
      messagingServerUrl: 'https://fluxstudio.art',
      collaborationServerUrl: 'https://fluxstudio.art/collab',
    },
  },

  /**
   * Performance thresholds
   * All times in milliseconds
   */
  thresholds: {
    // Response time thresholds (p95 - 95th percentile)
    response: {
      excellent: 100,    // Under 100ms = excellent
      good: 300,         // Under 300ms = good
      acceptable: 500,   // Under 500ms = acceptable
      degraded: 1000,    // Under 1000ms = degraded
      critical: 3000,    // Over 3000ms = critical
    },

    // Error rate thresholds (percentage)
    errorRate: {
      excellent: 0.1,    // Under 0.1% = excellent
      good: 0.5,         // Under 0.5% = good
      acceptable: 1.0,   // Under 1% = acceptable
      degraded: 2.0,     // Under 2% = degraded
      critical: 5.0,     // Over 5% = critical failure
    },

    // Throughput thresholds (requests per second)
    throughput: {
      authentication: {
        minimum: 50,     // Minimum 50 auth requests/sec
        target: 100,     // Target 100 auth requests/sec
        peak: 200,       // Peak handling 200 auth requests/sec
      },
      api: {
        minimum: 100,    // Minimum 100 API requests/sec
        target: 250,     // Target 250 API requests/sec
        peak: 500,       // Peak handling 500 API requests/sec
      },
      websocket: {
        connections: 1000,   // Support 1000 concurrent WebSocket connections
        messagesPerSec: 500, // Handle 500 messages per second
      },
    },
  },

  /**
   * Test scenarios
   */
  scenarios: {
    // Quick smoke test (1-2 minutes)
    smoke: {
      duration: '60s',
      concurrency: 5,
      requests: 50,
      description: 'Quick validation that services are responding',
    },

    // Standard load test (5-10 minutes)
    standard: {
      duration: '300s',
      concurrency: 20,
      requests: 500,
      description: 'Standard load testing for typical production traffic',
    },

    // Stress test (10-15 minutes)
    stress: {
      duration: '600s',
      concurrency: 50,
      requests: 2000,
      description: 'Stress testing to find system breaking points',
    },

    // Spike test (2-3 minutes)
    spike: {
      duration: '120s',
      initialConcurrency: 5,
      peakConcurrency: 100,
      rampUp: '30s',
      description: 'Sudden traffic spike simulation',
    },

    // Endurance test (30+ minutes)
    endurance: {
      duration: '1800s',
      concurrency: 30,
      requests: 10000,
      description: 'Long-running test to detect memory leaks and degradation',
    },
  },

  /**
   * Test profiles for different use cases
   */
  profiles: {
    // CI/CD pipeline (fast, essential)
    ci: {
      scenarios: ['smoke'],
      timeout: 120000,
      failOnThreshold: true,
    },

    // Pre-deployment validation
    preDeployment: {
      scenarios: ['smoke', 'standard'],
      timeout: 600000,
      failOnThreshold: true,
    },

    // Full performance audit
    fullAudit: {
      scenarios: ['smoke', 'standard', 'stress', 'spike'],
      timeout: 1800000,
      failOnThreshold: false, // Report but don't fail
    },

    // Production monitoring
    monitoring: {
      scenarios: ['smoke'],
      timeout: 60000,
      failOnThreshold: true,
      repeat: {
        interval: '5m',
        count: Infinity,
      },
    },
  },

  /**
   * Pass/fail criteria for different endpoints
   */
  endpoints: {
    '/health': {
      maxResponseTime: 200,
      maxErrorRate: 0.01,
      critical: true,
    },
    '/api/auth/me': {
      maxResponseTime: 300,
      maxErrorRate: 0.5,
      critical: true,
    },
    '/api/auth/login': {
      maxResponseTime: 500,
      maxErrorRate: 1.0,
      critical: true,
    },
    '/api/organizations': {
      maxResponseTime: 400,
      maxErrorRate: 0.5,
      critical: false,
    },
    '/api/projects': {
      maxResponseTime: 400,
      maxErrorRate: 0.5,
      critical: false,
    },
    '/api/files': {
      maxResponseTime: 500,
      maxErrorRate: 1.0,
      critical: false,
    },
    '/api/messages': {
      maxResponseTime: 300,
      maxErrorRate: 0.5,
      critical: false,
    },
  },

  /**
   * Reporting configuration
   */
  reporting: {
    outputDir: './test-results/load',
    formats: ['json', 'html', 'console'],
    includeRawData: false,
    histogramBuckets: [10, 25, 50, 75, 100, 150, 200, 300, 500, 1000, 2000, 5000],
  },
};
