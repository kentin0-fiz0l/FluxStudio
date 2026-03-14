#!/usr/bin/env node

/**
 * Schema Verification Script
 *
 * Compares expected database schema against actual DB state.
 * Run after migrations to catch discrepancies.
 *
 * Usage:
 *   node database/verify-schema.js
 *   DATABASE_URL=postgres://... node database/verify-schema.js
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = discrepancies found
 *   2 = connection error
 */

const { Pool } = require('pg');

// Essential tables that must exist for the application to function
const ESSENTIAL_TABLES = [
  'users',
  'organizations',
  'organization_members',
  'projects',
  'tasks',
  'messages',
  'conversations',
  'notifications',
  'security_events',
  'refresh_tokens',
  'schema_migrations',
  'subscriptions',
  'subscription_plans',
  'formations',
  'formation_sets',
  'files',
  'active_sessions',
  'audit_logs',
];

// Columns that MUST be TEXT (not UUID) due to migration 100 converting to CUID format
const TEXT_REQUIRED_COLUMNS = [
  { table: 'users', column: 'id' },
  { table: 'projects', column: 'id' },
  { table: 'projects', column: 'organization_id' },
  { table: 'projects', column: 'manager_id' },
  { table: 'tasks', column: 'user_id' },
  { table: 'tasks', column: 'assigned_to' },
  { table: 'messages', column: 'author_id' },
  { table: 'notifications', column: 'user_id' },
  { table: 'active_sessions', column: 'user_id' },
  { table: 'subscriptions', column: 'user_id' },
];

// Indexes that should exist for query performance
const EXPECTED_INDEXES = [
  { table: 'users', name: 'idx_users_email' },
  { table: 'projects', name: 'idx_projects_organization' },
  { table: 'tasks', name: 'idx_tasks_project' },
  { table: 'messages', name: 'idx_messages_conversation' },
  { table: 'active_sessions', name: 'idx_active_sessions_user' },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set — skipping schema verification');
    process.exit(0);
  }

  const connectionString = process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, '');
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const issues = [];
  const warnings = [];

  try {
    console.log('🔍 FluxStudio Schema Verification');
    console.log('==================================\n');

    // 1. Check essential tables
    console.log('📋 Checking essential tables...');
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    const existingTables = new Set(tablesResult.rows.map(r => r.tablename));

    for (const table of ESSENTIAL_TABLES) {
      if (existingTables.has(table)) {
        console.log(`  ✅ ${table}`);
      } else {
        issues.push(`Missing essential table: ${table}`);
        console.log(`  ❌ ${table} — MISSING`);
      }
    }

    // 2. Check TEXT vs UUID columns
    console.log('\n🔤 Checking column types (TEXT required, not UUID)...');
    for (const { table, column } of TEXT_REQUIRED_COLUMNS) {
      if (!existingTables.has(table)) continue;

      const colResult = await pool.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      `, [table, column]);

      if (colResult.rows.length === 0) {
        warnings.push(`Column ${table}.${column} does not exist`);
        console.log(`  ⚠️  ${table}.${column} — column not found`);
      } else if (colResult.rows[0].data_type === 'uuid') {
        issues.push(`${table}.${column} is UUID (should be TEXT)`);
        console.log(`  ❌ ${table}.${column} — UUID (should be TEXT)`);
      } else {
        console.log(`  ✅ ${table}.${column} — ${colResult.rows[0].data_type}`);
      }
    }

    // 3. Check indexes
    console.log('\n📇 Checking performance indexes...');
    const indexResult = await pool.query(`
      SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public'
    `);
    const existingIndexes = new Set(indexResult.rows.map(r => r.indexname));

    for (const { table, name } of EXPECTED_INDEXES) {
      if (!existingTables.has(table)) continue;

      if (existingIndexes.has(name)) {
        console.log(`  ✅ ${name} on ${table}`);
      } else {
        warnings.push(`Missing index: ${name} on ${table}`);
        console.log(`  ⚠️  ${name} on ${table} — MISSING`);
      }
    }

    // 4. Check migration count
    console.log('\n📊 Migration status...');
    try {
      const migResult = await pool.query('SELECT COUNT(*) as count FROM schema_migrations');
      const migCount = parseInt(migResult.rows[0].count);
      console.log(`  Applied migrations: ${migCount}`);

      // Check for failed migrations
      const failedResult = await pool.query(
        "SELECT filename FROM schema_migrations WHERE checksum = 'FAILED'"
      );
      if (failedResult.rows.length > 0) {
        for (const row of failedResult.rows) {
          warnings.push(`Failed migration: ${row.filename}`);
          console.log(`  ⚠️  Failed: ${row.filename}`);
        }
      }
    } catch {
      // Try alternate migration table
      try {
        const migResult = await pool.query('SELECT COUNT(*) as count FROM migrations');
        console.log(`  Applied migrations (legacy table): ${migResult.rows[0].count}`);
      } catch {
        warnings.push('No migration tracking table found');
        console.log('  ⚠️  No migration tracking table found');
      }
    }

    // 5. Check subscription plans
    console.log('\n💳 Checking subscription plans...');
    if (existingTables.has('subscription_plans')) {
      const plansResult = await pool.query(
        'SELECT slug, is_active FROM subscription_plans ORDER BY price_monthly'
      );
      const plans = plansResult.rows;
      const expectedSlugs = ['free', 'pro', 'team'];
      for (const slug of expectedSlugs) {
        const plan = plans.find(p => p.slug === slug);
        if (plan) {
          console.log(`  ✅ ${slug} plan — ${plan.is_active ? 'active' : 'inactive'}`);
        } else {
          warnings.push(`Missing subscription plan: ${slug}`);
          console.log(`  ⚠️  ${slug} plan — MISSING`);
        }
      }
    } else {
      warnings.push('subscription_plans table missing');
      console.log('  ⚠️  subscription_plans table not found');
    }

    // Summary
    console.log('\n==================================');
    console.log('📊 Summary');
    console.log(`  Tables found: ${existingTables.size}`);
    console.log(`  Indexes found: ${existingIndexes.size}`);
    console.log(`  Issues: ${issues.length}`);
    console.log(`  Warnings: ${warnings.length}`);

    if (issues.length > 0) {
      console.log('\n❌ ISSUES (must fix):');
      issues.forEach(i => console.log(`  - ${i}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (review):');
      warnings.forEach(w => console.log(`  - ${w}`));
    }

    if (issues.length === 0) {
      console.log('\n✅ Schema verification PASSED');
    } else {
      console.log('\n❌ Schema verification FAILED');
    }

    await pool.end();
    process.exit(issues.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Schema verification error:', error.message);
    await pool.end();
    process.exit(2);
  }
}

main();
