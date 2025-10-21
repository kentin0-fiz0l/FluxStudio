/**
 * Jest Configuration for Integration Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.integration.test.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'database/**/*.js',
    'server-*.js',
    '!node_modules/**',
    '!tests/**',
    '!coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Test timeout
  testTimeout: 30000,

  // Module paths
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],

  // Transform configuration
  transform: {},

  // Verbose output
  verbose: true,

  // Force exit
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Max workers for parallel tests
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js'
};