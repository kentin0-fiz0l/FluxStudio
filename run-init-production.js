#!/usr/bin/env node
/**
 * Run Production Database Initialization
 * This script runs the init-production.sql file against the database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runInit() {
  console.log('🚀 Running Production Database Initialization');
  console.log('============================================\n');

  // Create database connection with SSL
  const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  };

  console.log('📊 Connecting to database...');
  const pool = new Pool(connectionConfig);

  try {
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Connected to database at:', testResult.rows[0].now);
    console.log('');

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'init-production.sql');
    console.log('📄 Reading SQL file:', sqlFilePath);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('');

    // Execute the SQL
    console.log('⚙️  Executing initialization SQL...');
    const result = await pool.query(sql);

    // Check last result for status message
    if (result[result.length - 1]?.rows?.[0]?.status) {
      console.log('✅', result[result.length - 1].rows[0].status);
    }

    console.log('');
    console.log('✅ Database initialization completed successfully!');
    console.log('');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tables = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    console.log('');
    console.log('🎉 All done!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('');
    console.error('Stack trace:',err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run
runInit().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
