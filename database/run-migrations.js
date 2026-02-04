/**
 * Database Migration Runner
 *
 * This script runs SQL migrations in order and tracks which migrations have been applied.
 * Uses a migrations table to ensure each migration runs only once.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

/**
 * Create the migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable(pool) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      checksum VARCHAR(64),
      execution_time_ms INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename
    ON schema_migrations(filename);
  `;

  await pool.query(createTableQuery);
  console.log('✅ Migration tracking table ready');
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations(pool) {
  try {
    const result = await pool.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    return new Set(result.rows.map(row => row.filename));
  } catch (error) {
    // Table might not exist yet
    if (error.code === '42P01') {
      return new Set();
    }
    throw error;
  }
}

/**
 * Calculate checksum for a migration file
 */
function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Run a single migration
 */
async function runMigration(pool, filename, content) {
  const startTime = Date.now();
  const checksum = calculateChecksum(content);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Run the migration SQL
    await client.query(content);

    // Record the migration
    await client.query(
      `INSERT INTO schema_migrations (filename, checksum, execution_time_ms)
       VALUES ($1, $2, $3)`,
      [filename, checksum, Date.now() - startTime]
    );

    await client.query('COMMIT');
    return { success: true, executionTime: Date.now() - startTime };
  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

async function main() {
  console.log('=== FluxStudio Database Migration Runner ===');
  console.log('Environment:', process.env.NODE_ENV || 'development');

  // Check if DATABASE_URL is configured
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set - skipping migrations');
    console.log('✅ Migration check complete (no-op mode)');
    process.exit(0);
  }

  // Create database connection pool
  const connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, '');
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false
  });

  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(pool);

    // Get list of already applied migrations
    const appliedMigrations = await getAppliedMigrations(pool);
    console.log(`📊 ${appliedMigrations.size} migrations already applied`);

    // List available migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    let files;

    try {
      files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️  No migrations directory found');
        console.log('✅ Migration check complete');
        await pool.end();
        process.exit(0);
      }
      throw error;
    }

    console.log(`📋 Found ${files.length} migration files`);

    // Find pending migrations
    const pendingMigrations = files.filter(f => !appliedMigrations.has(f));

    if (pendingMigrations.length === 0) {
      console.log('✅ All migrations already applied');
      await pool.end();
      process.exit(0);
    }

    console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

    // Run each pending migration
    let successCount = 0;
    let failCount = 0;

    for (const filename of pendingMigrations) {
      console.log(`\n📄 Running: ${filename}`);

      const filePath = path.join(migrationsDir, filename);
      const content = fs.readFileSync(filePath, 'utf8');

      const result = await runMigration(pool, filename, content);

      if (result.success) {
        console.log(`   ✅ Success (${result.executionTime}ms)`);
        successCount++;
      } else {
        console.error(`   ❌ Failed: ${result.error}`);
        failCount++;
        // Stop on first failure to maintain consistency
        break;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`⏭️  Skipped (already applied): ${appliedMigrations.size}`);

    await pool.end();

    if (failCount > 0) {
      process.exit(1);
    }

    console.log('✅ Migration runner complete');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error running migrations:', error.message);
    await pool.end();
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Migration runner failed:', err);
  process.exit(1);
});
