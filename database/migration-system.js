#!/usr/bin/env node
/**
 * FluxStudio Consolidated Migration System
 *
 * Unifies all migration runners into a single, robust system.
 * Supports: schema migrations, data migrations, rollbacks, and status checks.
 *
 * Usage:
 *   node database/migration-system.js run          # Run pending migrations
 *   node database/migration-system.js status       # Check migration status
 *   node database/migration-system.js rollback     # Rollback last migration
 *   node database/migration-system.js create NAME  # Create new migration file
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 *   DRY_RUN=true - Preview migrations without applying
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ============================================================================
// Configuration
// ============================================================================

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATION_TABLE = 'schema_migrations';

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// ============================================================================
// Helper Functions
// ============================================================================

function log(message, type = 'info') {
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[OK]\x1b[0m',
    warn: '\x1b[33m[WARN]\x1b[0m',
    error: '\x1b[31m[ERROR]\x1b[0m'
  };
  console.log(`${prefix[type] || '[LOG]'} ${message}`);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Migration Table Management
// ============================================================================

async function ensureMigrationTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      execution_time_ms INTEGER,
      checksum VARCHAR(64),
      applied_by VARCHAR(255) DEFAULT current_user
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query(
    `SELECT migration_name, applied_at, execution_time_ms
     FROM ${MIGRATION_TABLE}
     ORDER BY id ASC`
  );
  return result.rows;
}

async function recordMigration(name, executionTimeMs, checksum) {
  await pool.query(
    `INSERT INTO ${MIGRATION_TABLE} (migration_name, execution_time_ms, checksum)
     VALUES ($1, $2, $3)`,
    [name, executionTimeMs, checksum]
  );
}

async function removeMigrationRecord(name) {
  await pool.query(
    `DELETE FROM ${MIGRATION_TABLE} WHERE migration_name = $1`,
    [name]
  );
}

// ============================================================================
// Migration File Operations
// ============================================================================

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort((a, b) => {
      // Sort by numeric prefix first, then alphabetically
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999999');
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999999');
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
}

function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function readMigrationFile(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  return fs.readFileSync(filepath, 'utf8');
}

// ============================================================================
// Migration Execution
// ============================================================================

async function runMigration(filename, dryRun = false) {
  const sql = readMigrationFile(filename);
  const checksum = calculateChecksum(sql);
  const startTime = Date.now();

  if (dryRun) {
    log(`[DRY RUN] Would apply: ${filename}`, 'info');
    return { success: true, dryRun: true };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Execute migration SQL
    await client.query(sql);

    // Record successful migration
    const executionTime = Date.now() - startTime;
    await client.query(
      `INSERT INTO ${MIGRATION_TABLE} (migration_name, execution_time_ms, checksum)
       VALUES ($1, $2, $3)`,
      [filename, executionTime, checksum]
    );

    await client.query('COMMIT');

    return { success: true, executionTime, checksum };
  } catch (error) {
    await client.query('ROLLBACK');

    // Check if it's a safe "already exists" error
    const isSafeError =
      error.code === '42P07' || // duplicate_table
      error.code === '42710' || // duplicate_object
      error.code === '42701' || // duplicate_column
      error.message.includes('already exists');

    if (isSafeError) {
      // Mark as applied since objects already exist
      try {
        await pool.query(
          `INSERT INTO ${MIGRATION_TABLE} (migration_name, execution_time_ms, checksum)
           VALUES ($1, $2, $3) ON CONFLICT (migration_name) DO NOTHING`,
          [filename, Date.now() - startTime, checksum]
        );
        return { success: true, skipped: true, reason: error.message };
      } catch (markError) {
        // Ignore marking errors
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// Commands
// ============================================================================

async function runCommand() {
  log('Starting migration run...', 'info');
  const dryRun = process.env.DRY_RUN === 'true';

  if (dryRun) {
    log('DRY RUN MODE - No changes will be made', 'warn');
  }

  await ensureMigrationTable();

  const appliedMigrations = await getAppliedMigrations();
  const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));
  const allFiles = getMigrationFiles();

  const pendingMigrations = allFiles.filter(f => !appliedNames.has(f));

  if (pendingMigrations.length === 0) {
    log('No pending migrations', 'success');
    return;
  }

  log(`Found ${pendingMigrations.length} pending migration(s)`, 'info');

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const migration of pendingMigrations) {
    try {
      log(`Applying: ${migration}`, 'info');
      const result = await runMigration(migration, dryRun);

      if (result.dryRun) {
        // Dry run output already logged
      } else if (result.skipped) {
        log(`Skipped (already applied): ${migration}`, 'warn');
        skipped++;
      } else {
        log(`Applied: ${migration} (${formatDuration(result.executionTime)})`, 'success');
        applied++;
      }
    } catch (error) {
      log(`Failed: ${migration} - ${error.message}`, 'error');
      failed++;

      // Don't stop on failure - continue with other migrations
      // but log the full error for debugging
      if (process.env.DEBUG) {
        console.error(error);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  log(`Migration Summary:`, 'info');
  log(`  Applied: ${applied}`, 'info');
  log(`  Skipped: ${skipped}`, 'info');
  log(`  Failed:  ${failed}`, failed > 0 ? 'error' : 'info');
  console.log('='.repeat(50));
}

async function statusCommand() {
  log('Checking migration status...', 'info');

  await ensureMigrationTable();

  const applied = await getAppliedMigrations();
  const allFiles = getMigrationFiles();
  const appliedNames = new Set(applied.map(m => m.migration_name));

  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION STATUS');
  console.log('='.repeat(60));

  console.log('\nApplied Migrations:');
  if (applied.length === 0) {
    console.log('  (none)');
  } else {
    for (const m of applied) {
      const time = m.execution_time_ms ? formatDuration(m.execution_time_ms) : 'N/A';
      console.log(`  [x] ${m.migration_name} (${time})`);
    }
  }

  const pending = allFiles.filter(f => !appliedNames.has(f));
  console.log('\nPending Migrations:');
  if (pending.length === 0) {
    console.log('  (none)');
  } else {
    for (const m of pending) {
      console.log(`  [ ] ${m}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${allFiles.length} | Applied: ${applied.length} | Pending: ${pending.length}`);
  console.log('='.repeat(60) + '\n');
}

async function rollbackCommand() {
  log('Starting rollback...', 'warn');

  await ensureMigrationTable();

  const applied = await getAppliedMigrations();

  if (applied.length === 0) {
    log('No migrations to rollback', 'info');
    return;
  }

  const lastMigration = applied[applied.length - 1];
  log(`Rolling back: ${lastMigration.migration_name}`, 'warn');

  // Remove from tracking table
  await removeMigrationRecord(lastMigration.migration_name);

  log(`Rollback complete: ${lastMigration.migration_name}`, 'success');
  log('Note: Database changes are NOT automatically reversed.', 'warn');
  log('You may need to manually reverse the migration SQL.', 'warn');
}

async function createCommand(name) {
  if (!name) {
    log('Usage: migration-system.js create NAME', 'error');
    process.exit(1);
  }

  // Get next migration number
  const files = getMigrationFiles();
  let nextNum = 1;

  if (files.length > 0) {
    const lastFile = files[files.length - 1];
    const match = lastFile.match(/^(\d+)/);
    if (match) {
      nextNum = parseInt(match[1]) + 1;
    }
  }

  const paddedNum = String(nextNum).padStart(3, '0');
  const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const filename = `${paddedNum}_${safeName}.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  const template = `-- Migration: ${filename}
-- Created: ${new Date().toISOString()}
-- Description: ${name}

-- Write your migration SQL here

-- Example:
-- CREATE TABLE IF NOT EXISTS example (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Add your SQL statements below:

`;

  fs.writeFileSync(filepath, template);
  log(`Created migration: ${filename}`, 'success');
  console.log(`  Path: ${filepath}`);
}

async function verifyCommand() {
  log('Verifying database connection...', 'info');

  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    log('Database connection successful', 'success');
    console.log(`  Server Time: ${result.rows[0].time}`);
    console.log(`  Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);

    // Check if migration table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = '${MIGRATION_TABLE}'
      )
    `);

    if (tableCheck.rows[0].exists) {
      log('Migration tracking table exists', 'success');
    } else {
      log('Migration tracking table does not exist (will be created on first run)', 'info');
    }

  } catch (error) {
    log(`Database connection failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const command = process.argv[2] || 'run';
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'run':
        await runCommand();
        break;
      case 'status':
        await statusCommand();
        break;
      case 'rollback':
        await rollbackCommand();
        break;
      case 'create':
        await createCommand(arg);
        break;
      case 'verify':
        await verifyCommand();
        break;
      case 'help':
        console.log(`
FluxStudio Migration System

Usage: node database/migration-system.js [command] [args]

Commands:
  run       Run all pending migrations (default)
  status    Show migration status
  rollback  Rollback the last applied migration
  create    Create a new migration file
  verify    Verify database connection
  help      Show this help message

Environment Variables:
  DATABASE_URL  PostgreSQL connection string (required)
  DRY_RUN=true  Preview migrations without applying
  DEBUG=true    Show full error stack traces
        `);
        break;
      default:
        log(`Unknown command: ${command}`, 'error');
        log('Use "help" for available commands', 'info');
        process.exit(1);
    }
  } catch (error) {
    log(`Migration error: ${error.message}`, 'error');
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  log('Interrupted by user', 'warn');
  await pool.end();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error.message}`, 'error');
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runMigration,
  getAppliedMigrations,
  getMigrationFiles,
  ensureMigrationTable
};
