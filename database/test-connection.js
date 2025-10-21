#!/usr/bin/env node
/**
 * Database Connection Test Script
 * Tests PostgreSQL connection and validates database setup
 */

require('dotenv').config();
const { testConnection, initializeDatabase, runMigrations, createBackup, closePool } = require('./config');

async function runDatabaseTests() {
  console.log('Starting database tests...\n');

  try {
    // Test 1: Connection Test
    console.log('1. Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      console.error('Database connection failed. Check your configuration.');
      process.exit(1);
    }
    console.log('Database connection successful\n');

    // Test 2: Schema Initialization (optional)
    if (process.argv.includes('--init-schema')) {
      console.log('2. Initializing database schema...');
      await initializeDatabase();
      console.log('Schema initialization complete\n');
    }

    // Test 3: Run Migrations (optional)
    if (process.argv.includes('--migrate')) {
      console.log('3. Running database migrations...');
      await runMigrations();
      console.log('Migrations complete\n');
    }

    // Test 4: Backup Test (optional)
    if (process.argv.includes('--backup')) {
      console.log('4. Testing backup functionality...');
      try {
        await createBackup();
        console.log('Backup test successful\n');
      } catch (err) {
        console.warn('Backup test failed (pg_dump may not be available):', err.message);
      }
    }

    console.log('All database tests completed successfully!');

  } catch (error) {
    console.error('Database test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Handle command line arguments
if (require.main === module) {
  console.log('FluxStudio Database Test Suite');
  console.log('=============================\n');

  if (process.argv.includes('--help')) {
    console.log('Usage: node database/test-connection.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --init-schema    Initialize database schema');
    console.log('  --migrate        Run database migrations');
    console.log('  --backup         Test backup functionality');
    console.log('  --help           Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node database/test-connection.js');
    console.log('  node database/test-connection.js --init-schema --migrate');
    process.exit(0);
  }

  runDatabaseTests();
}

module.exports = { runDatabaseTests };