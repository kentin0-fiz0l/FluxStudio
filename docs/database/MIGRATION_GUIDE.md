# FluxStudio Database Migration Guide

## Overview

FluxStudio uses a consolidated migration system located at `/database/migration-system.js`. This system handles schema changes, tracks applied migrations, and supports rollbacks.

## Quick Start

```bash
# Check migration status
node database/migration-system.js status

# Run pending migrations
node database/migration-system.js run

# Create a new migration
node database/migration-system.js create add_user_preferences

# Verify database connection
node database/migration-system.js verify
```

## Migration Files

Migrations are stored in `/database/migrations/` as SQL files with numeric prefixes:

```
database/migrations/
  000_create_base_messaging_schema.sql
  001_add_message_threading_and_search.sql
  001_create_initial_schema.sql
  ...
  105_create_project_members.sql
```

### Naming Convention

- Format: `NNN_description.sql`
- NNN: Three-digit sequence number (e.g., `001`, `002`, `100`)
- description: Snake_case description of the change

### Migration File Structure

```sql
-- Migration: 106_add_user_settings.sql
-- Created: 2025-02-09T12:00:00Z
-- Description: Add user settings table

-- Your SQL here
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

CREATE INDEX idx_user_settings_user ON user_settings(user_id);
```

## Commands Reference

### run

Applies all pending migrations in order.

```bash
node database/migration-system.js run

# Preview without applying (dry run)
DRY_RUN=true node database/migration-system.js run
```

### status

Shows which migrations have been applied and which are pending.

```bash
node database/migration-system.js status
```

Output:
```
MIGRATION STATUS
============================================================

Applied Migrations:
  [x] 001_create_initial_schema.sql (1.23s)
  [x] 002_add_messaging_tables.sql (0.45s)

Pending Migrations:
  [ ] 106_add_user_settings.sql

============================================================
Total: 106 | Applied: 105 | Pending: 1
```

### rollback

Removes the tracking record for the last migration. **Note:** This does NOT reverse the SQL changes automatically.

```bash
node database/migration-system.js rollback
```

### create

Creates a new migration file with the next sequence number.

```bash
node database/migration-system.js create add_user_settings
# Creates: 106_add_user_settings.sql
```

### verify

Tests the database connection and checks if the migration table exists.

```bash
node database/migration-system.js verify
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `DRY_RUN` | Set to `true` to preview migrations | No |
| `DEBUG` | Set to `true` for verbose error output | No |
| `NODE_ENV` | Environment (production enables SSL) | No |

## Migration Tracking

Applied migrations are tracked in the `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER,
  checksum VARCHAR(64),
  applied_by VARCHAR(255) DEFAULT current_user
);
```

## Best Practices

### DO:

1. **Make migrations idempotent**: Use `IF NOT EXISTS` and `IF EXISTS`
   ```sql
   CREATE TABLE IF NOT EXISTS my_table (...);
   CREATE INDEX IF NOT EXISTS idx_my_index ON my_table(column);
   ```

2. **Use transactions**: The migration system wraps each migration in a transaction

3. **Test locally first**: Run migrations on your local database before production

4. **Keep migrations small**: One logical change per migration

5. **Add indexes**: Always create indexes for frequently queried columns

### DON'T:

1. **Never modify applied migrations**: Create a new migration instead

2. **Avoid destructive changes in production**: Use soft deletes

3. **Don't drop columns without warning**: Deprecate first, then remove in a later migration

## Error Handling

The migration system handles common errors gracefully:

- **Duplicate object errors** (`42P07`, `42710`): Automatically marked as applied
- **Connection errors**: Clear error message with connection details
- **Syntax errors**: Transaction rolled back, migration marked as failed

## Integration with Application

The migration system can be imported and used programmatically:

```javascript
const { runMigration, getAppliedMigrations } = require('./database/migration-system');

// Check status
const applied = await getAppliedMigrations();
console.log(`Applied: ${applied.length} migrations`);

// Run specific migration
await runMigration('106_add_user_settings.sql');
```

## Legacy Migration Files

The following legacy migration runners are deprecated:

- `/run-migration.js` - Use `database/migration-system.js` instead
- `/run-migrations.js` - Use `database/migration-system.js` instead
- `/lib/migrations/run-migrations.js` - Use `database/migration-system.js` instead
- `/database/migrate-data.js` - Data migration utility (still valid for JSON to PostgreSQL)

## Troubleshooting

### Migration stuck or failed

1. Check the `schema_migrations` table for the failed migration
2. Manually fix the database state if needed
3. Either:
   - Fix and re-run: Remove the record from `schema_migrations`, fix the SQL, run again
   - Skip: Manually insert a record into `schema_migrations` to mark as applied

### Connection refused

1. Check `DATABASE_URL` is set correctly
2. Verify PostgreSQL is running
3. Check network/firewall settings for remote databases

### Permission denied

1. Ensure the database user has CREATE, ALTER, and DROP permissions
2. For production, use a dedicated migrations user with appropriate privileges
