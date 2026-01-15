/**
 * Test Setup Configuration
 * Sets up the testing environment for integration tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.USE_DATABASE = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-key';

// Database configuration for tests
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'fluxstudio';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';

// Service ports (unified backend consolidates all services on 3001)
process.env.AUTH_PORT = '3001';
process.env.MESSAGING_PORT = '3001';
process.env.UNIFIED_BACKEND_URL = 'http://localhost:3001';
process.env.MESSAGING_WS_URL = 'http://localhost:3001/messaging';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
  // Wait helper
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Random ID generator for tests
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  // Test user factory
  createTestUser: (overrides = {}) => ({
    id: global.testUtils.generateTestId(),
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    ...overrides
  }),

  // Test conversation factory
  createTestConversation: (overrides = {}) => ({
    name: 'Test Conversation',
    description: 'A test conversation',
    type: 'group',
    ...overrides
  }),

  // Test message factory
  createTestMessage: (overrides = {}) => ({
    content: 'Test message content',
    messageType: 'text',
    priority: 'normal',
    ...overrides
  })
};

// Console log filtering for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = (...args) => {
  // Filter out development server logs during tests
  const message = args.join(' ');
  if (
    message.includes('🚀') ||
    message.includes('📡') ||
    message.includes('WebSocket') ||
    message.includes('server running') ||
    message.includes('API endpoints')
  ) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  if (
    message.includes('deprecated') ||
    message.includes('cleanup failed') ||
    message.includes('auto-generated')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// Cleanup function for tests
global.testCleanup = {
  activeConnections: [],

  addConnection: (connection) => {
    global.testCleanup.activeConnections.push(connection);
  },

  cleanup: () => {
    global.testCleanup.activeConnections.forEach(connection => {
      if (connection && typeof connection.disconnect === 'function') {
        connection.disconnect();
      }
      if (connection && typeof connection.close === 'function') {
        connection.close();
      }
    });
    global.testCleanup.activeConnections = [];
  }
};

// Global cleanup after all tests
afterAll(() => {
  global.testCleanup.cleanup();
});