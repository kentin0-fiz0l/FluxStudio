#!/usr/bin/env node

/**
 * Migration Runner for FluxStudio
 * Runs the enhanced file security migration
 */

const { runMigrations } = require('./database/config');
const fs = require('fs').promises;

async function main() {
  try {
    console.log('🔄 Starting database migration...');

    // Run all pending migrations using the built-in migration system
    await runMigrations();

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();