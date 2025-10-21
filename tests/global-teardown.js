/**
 * Global Test Teardown
 * Runs after all tests to clean up the testing environment
 */

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  // Clean up any test data in the database
  try {
    const { query } = require('../database/config');

    // Clean up test data (anything with 'test-' prefix)
    await query('DELETE FROM message_reactions WHERE 1=1');
    await query('DELETE FROM messages WHERE author_id LIKE $1', ['test-%']);
    await query('DELETE FROM conversation_participants WHERE user_id LIKE $1', ['test-%']);
    await query('DELETE FROM conversations WHERE created_by LIKE $1', ['test-%']);
    await query('DELETE FROM users WHERE id LIKE $1', ['test-%']);

    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.warn('⚠️  Database cleanup failed (might be expected):', error.message);
  }

  console.log('✅ Test environment cleaned up');
};