/**
 * Global Test Setup
 * Runs before all tests to prepare the testing environment
 */

module.exports = async () => {
  console.log('🧪 Setting up integration test environment...');

  // Set environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.USE_DATABASE = 'true';
  process.env.JWT_SECRET = 'test-jwt-secret-key';

  // Database configuration
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_NAME = 'fluxstudio';
  process.env.DB_USER = 'postgres';
  process.env.DB_PASSWORD = 'postgres';

  // Service ports
  process.env.AUTH_PORT = '3001';
  process.env.MESSAGING_PORT = '3004';

  console.log('✅ Test environment configured');
  console.log('⚠️  Tests expect services to be running on ports 3001 and 3004');
};