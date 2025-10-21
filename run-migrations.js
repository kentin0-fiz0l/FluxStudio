#!/usr/bin/env node
/**
 * Migration Runner for FluxStudio
 * Runs all pending database migrations
 */

require('dotenv').config();
const { runMigrations, testConnection, closePool } = require('./database/config');

async function main() {
  console.log('🚀 FluxStudio Migration Runner');
  console.log('================================\n');

  console.log('📊 Configuration:');
  console.log(`   Database: ${process.env.DB_NAME || 'fluxstudio_db'}`);
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   Port: ${process.env.DB_PORT || 5432}`);
  console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
  console.log('');

  // Test connection first
  console.log('🔌 Testing database connection...');
  const connected = await testConnection();

  if (!connected) {
    console.error('❌ Failed to connect to database. Please check your configuration.');
    process.exit(1);
  }

  console.log('');

  // Run migrations
  try {
    await runMigrations();
    console.log('\n✅ Migration process completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration process failed:', err.message);
    console.error('Stack trace:', err.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted by user');
  await closePool();
  process.exit(0);
});

// Run
main();
