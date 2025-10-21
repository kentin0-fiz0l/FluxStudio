#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Runs SQL migrations in order and tracks which have been applied.
 * Part of: Week 2 Security Sprint
 * Date: 2025-10-15
 *
 * Usage:
 *   node lib/migrations/run-migrations.js
 *   DATABASE_URL=... node lib/migrations/run-migrations.js
 */

// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Create migrations tracking table
 */
async function createMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('✓ Migrations tracking table ready');
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  const result = await pool.query(
    'SELECT migration_name FROM schema_migrations ORDER BY id'
  );
  return result.rows.map(row => row.migration_name);
}

/**
 * Mark migration as applied
 */
async function recordMigration(name) {
  await pool.query(
    'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
    [name]
  );
}

/**
 * Run a single migration file
 */
async function runMigration(filename) {
  const filepath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  console.log(`Running migration: ${filename}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await recordMigration(filename);
    await client.query('COMMIT');
    console.log(`✓ Migration applied: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`✗ Migration failed: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('=== Database Migration Runner ===\n');

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful\n');

    // Create migrations table
    await createMigrationsTable();

    // Get pending migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`Applied migrations: ${appliedMigrations.length}\n`);

    // Get all migration files
    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found');
      return;
    }

    // Run pending migrations
    let appliedCount = 0;
    for (const file of files) {
      if (!appliedMigrations.includes(file)) {
        await runMigration(file);
        appliedCount++;
      } else {
        console.log(`⊘ Already applied: ${file}`);
      }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Total migrations: ${files.length}`);
    console.log(`Applied: ${appliedCount}`);
    console.log(`Skipped: ${files.length - appliedCount}`);

  } catch (error) {
    console.error('\n✗ Migration Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations };
