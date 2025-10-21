# Sprint 3: PostgreSQL Migration Runbook
## Zero-Downtime Database Migration Guide

---

## Table of Contents
1. [Overview](#overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Migration Phases](#migration-phases)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Performance Monitoring](#performance-monitoring)

---

## Overview

This runbook guides you through migrating Flux Studio from JSON file storage to PostgreSQL using a **dual-write strategy** for zero-downtime deployment.

### Strategy Summary

```
Phase 1: Deploy Dual-Write (Read: JSON, Write: Both)
Phase 2: Migrate Data (Copy JSON → PostgreSQL)
Phase 3: Validate Data (Compare JSON vs PostgreSQL)
Phase 4: Switch Reads (Read: PostgreSQL, Write: Both)
Phase 5: Monitor & Cleanup (Remove JSON writes after 24hrs)
```

### Key Files

- **Dual-Write Service**: `/database/dual-write-service.js`
- **Migration Script**: `/database/migrate-json-to-postgres.js`
- **Validation Script**: `/database/validate-data.js`
- **Rollback Script**: `/database/rollback-to-json.js`
- **Schema**: `/database/schema.sql`
- **Migration SQL**: `/database/migrations/006_add_tasks_and_activities.sql`

---

## Pre-Migration Checklist

### 1. Environment Setup

```bash
# Verify PostgreSQL is installed and running
psql --version

# Create database (if not exists)
createdb fluxstudio_db

# Set environment variables in .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fluxstudio_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
NODE_ENV=production

# Migration control flags
USE_POSTGRES=false           # Start with false
DUAL_WRITE_ENABLED=true      # Enable dual-write
```

### 2. Backup Current Data

```bash
# Backup JSON files
mkdir -p database/backups
cp users.json database/backups/users.json.$(date +%Y%m%d-%H%M%S)
cp projects.json database/backups/projects.json.$(date +%Y%m%d-%H%M%S)

# Backup PostgreSQL (if exists)
pg_dump -U postgres fluxstudio_db > database/backups/fluxstudio_db_$(date +%Y%m%d-%H%M%S).sql
```

### 3. Test Database Connection

```bash
node database/test-connection.js
```

Expected output:
```
✅ Database connected successfully at: 2025-10-17T...
```

### 4. Run Schema Setup

```bash
# Initialize schema
psql -U postgres -d fluxstudio_db -f database/schema.sql

# Run migrations
psql -U postgres -d fluxstudio_db -f database/migrations/006_add_tasks_and_activities.sql
```

---

## Migration Phases

### Phase 1: Deploy Dual-Write (Day 1 - Hour 0)

**Objective**: Deploy code with dual-write enabled, reading from JSON

#### Steps:

1. **Update Environment Variables**
   ```bash
   # In .env or production environment
   USE_POSTGRES=false           # Still read from JSON
   DUAL_WRITE_ENABLED=true      # Write to both systems
   ```

2. **Deploy Application**
   ```bash
   # Build and deploy
   npm run build
   pm2 restart fluxstudio
   ```

3. **Verify Dual-Write is Working**
   ```bash
   # Create a test user via API
   curl -X POST https://fluxstudio.art/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","name":"Test","password":"test123"}'

   # Check it exists in both systems
   # 1. JSON file
   cat users.json | grep test@example.com

   # 2. PostgreSQL
   psql -U postgres -d fluxstudio_db \
     -c "SELECT * FROM users WHERE email = 'test@example.com';"
   ```

4. **Monitor Logs**
   ```bash
   pm2 logs fluxstudio --lines 100
   ```

   Look for:
   - ✅ User created in PostgreSQL
   - ✅ User created in JSON
   - ✅ Project created in PostgreSQL
   - ✅ Project created in JSON

---

### Phase 2: Migrate Historical Data (Day 1 - Hour 1-2)

**Objective**: Copy all existing JSON data to PostgreSQL

#### Steps:

1. **Run Migration Script**
   ```bash
   node database/migrate-json-to-postgres.js
   ```

   Expected output:
   ```
   🚀 Starting JSON to PostgreSQL Migration
   ============================================================

   📋 Migrating Users...
   ✅ Migrated user: jason@fizol.io
   ✅ Migrated user: test@fluxstudio.art

   📋 Migrating Projects...
   ✅ Migrated project: Test Project
     ✅ Migrated task: Setup environment
     ✅ Migrated milestone: Phase 1 Complete

   ============================================================
   📊 Migration Statistics
   ============================================================

   USERS:
     Total: 2
     Migrated: 2 (100.0%)
     Errors: 0

   PROJECTS:
     Total: 2
     Migrated: 2 (100.0%)
     Errors: 0

   ✅ Migration completed successfully!
   ```

2. **Handle Errors** (if any)
   - Check error messages
   - Fix data issues (UUIDs, foreign keys, etc.)
   - Re-run migration script (it's idempotent)

---

### Phase 3: Validate Data Integrity (Day 1 - Hour 2)

**Objective**: Ensure JSON and PostgreSQL data match

#### Steps:

1. **Run Validation Script**
   ```bash
   node database/validate-data.js
   ```

   Expected output:
   ```
   🚀 Starting Data Validation
   ============================================================

   🔍 Validating Users...
     JSON users: 2
     PostgreSQL users: 2
     Matched: 2
     Missing: 0

   🔍 Validating Projects...
     JSON projects: 2
     PostgreSQL projects: 2
     Matched: 2
     Missing: 0

   ============================================================
   📊 Data Validation Report
   ============================================================

   ✅ Total Discrepancies Found: 0

   📋 STATISTICS:

   USERS:
     JSON Count: 2
     PostgreSQL Count: 2
     Matched: 2
     Missing: 0
     Accuracy: 100.0%

   💡 RECOMMENDATIONS:
     ✅ Data is consistent! Safe to proceed with migration.
     ✅ You can set USE_POSTGRES=true
   ```

2. **If Discrepancies Found**
   - Review discrepancy details
   - Fix data issues
   - Re-run migration: `node database/migrate-json-to-postgres.js`
   - Re-validate: `node database/validate-data.js`

---

### Phase 4: Switch to PostgreSQL Reads (Day 1 - Hour 3)

**Objective**: Start reading from PostgreSQL while still dual-writing

#### Steps:

1. **Update Environment Variable**
   ```bash
   # In .env or production environment
   USE_POSTGRES=true            # ← CHANGE THIS
   DUAL_WRITE_ENABLED=true      # Keep dual-write enabled
   ```

2. **Restart Application**
   ```bash
   pm2 restart fluxstudio
   ```

3. **Verify PostgreSQL Reads**
   ```bash
   # Check logs for PostgreSQL queries
   pm2 logs fluxstudio --lines 50 | grep "PostgreSQL"
   ```

4. **Test All Critical Flows**
   - User login
   - Project creation
   - Task management
   - File uploads
   - Real-time updates (WebSocket)

5. **Monitor Performance**
   ```bash
   # Check response times
   pm2 monit

   # Check slow queries in logs
   pm2 logs fluxstudio | grep "Slow query"
   ```

---

### Phase 5: Monitor & Cleanup (Day 2-7)

**Objective**: Monitor stability, then disable dual-write

#### Day 2-3: Active Monitoring

```bash
# Check application health
curl https://fluxstudio.art/api/health

# Monitor database pool
psql -U postgres -d fluxstudio_db \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check for errors
pm2 logs fluxstudio --err
```

#### Day 4-7: Disable Dual-Write (Optional)

Once confident PostgreSQL is stable:

```bash
# In .env
USE_POSTGRES=true
DUAL_WRITE_ENABLED=false     # ← Disable JSON writes

# Restart
pm2 restart fluxstudio
```

---

## Rollback Procedures

### Emergency Rollback to JSON

If critical issues occur with PostgreSQL:

```bash
# 1. Export latest data from PostgreSQL
node database/rollback-to-json.js --force

# 2. Update environment
# In .env:
USE_POSTGRES=false
DUAL_WRITE_ENABLED=true

# 3. Restart application
pm2 restart fluxstudio

# 4. Verify application works
curl https://fluxstudio.art/api/health
```

### Partial Rollback (Specific Tables)

If only specific tables have issues:

```sql
-- Manually export problematic data
psql -U postgres -d fluxstudio_db -c "\COPY tasks TO '/tmp/tasks.csv' CSV HEADER;"

-- Fix issues in CSV
-- Re-import
psql -U postgres -d fluxstudio_db -c "\COPY tasks FROM '/tmp/tasks.csv' CSV HEADER;"
```

---

## Troubleshooting

### Issue: "Connection timeout to PostgreSQL"

**Symptoms**: Application can't connect to database

**Solutions**:
```bash
# 1. Check PostgreSQL is running
sudo systemctl status postgresql

# 2. Verify connection settings
psql -U postgres -d fluxstudio_db -c "SELECT NOW();"

# 3. Check firewall rules
sudo ufw status

# 4. Increase connection pool timeout
# In database/config.js:
connectionTimeoutMillis: 5000  # Increase from 2000
```

### Issue: "Slow queries detected"

**Symptoms**: Application response time increases

**Solutions**:
```sql
-- Find slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('users', 'projects', 'tasks');

-- Analyze table statistics
ANALYZE users;
ANALYZE projects;
ANALYZE tasks;
```

### Issue: "Duplicate key violation"

**Symptoms**: Insert fails with constraint error

**Solutions**:
```sql
-- Check for duplicate IDs
SELECT id, COUNT(*)
FROM users
GROUP BY id
HAVING COUNT(*) > 1;

-- Clean up duplicates (carefully!)
DELETE FROM users
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM users
  GROUP BY id
);
```

### Issue: "Data mismatch between JSON and PostgreSQL"

**Symptoms**: Validation script reports discrepancies

**Solutions**:
```bash
# 1. Run validation with verbose output
node database/validate-data.js

# 2. Fix specific records
psql -U postgres -d fluxstudio_db \
  -c "UPDATE users SET name = 'Correct Name' WHERE id = '...'"

# 3. Re-run validation
node database/validate-data.js
```

---

## Performance Monitoring

### Key Metrics to Monitor

1. **Database Connection Pool**
   ```javascript
   // In application logs
   {
     totalCount: 20,     // Total connections
     idleCount: 15,      // Available connections
     waitingCount: 0     // Requests waiting for connection
   }
   ```

2. **Query Performance**
   ```sql
   -- Average query time
   SELECT
     query,
     calls,
     total_exec_time / calls as avg_time,
     max_exec_time
   FROM pg_stat_statements
   ORDER BY avg_time DESC
   LIMIT 20;
   ```

3. **Cache Hit Ratio**
   ```sql
   SELECT
     sum(heap_blks_read) as heap_read,
     sum(heap_blks_hit) as heap_hit,
     sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_ratio
   FROM pg_statio_user_tables;
   ```

   **Target**: Cache ratio > 0.99 (99%)

4. **Index Usage**
   ```sql
   SELECT
     schemaname,
     tablename,
     indexname,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

### Performance Alerts

Set up monitoring for:
- Query time > 1 second
- Connection pool waiting > 5 requests
- Cache hit ratio < 95%
- Disk usage > 80%

---

## Success Criteria

- ✅ All API endpoints working with PostgreSQL
- ✅ Zero data loss (validation passes 100%)
- ✅ Response times ≤ JSON baseline
- ✅ No connection pool exhaustion
- ✅ Zero downtime during migration
- ✅ Rollback capability maintained for 7 days

---

## Maintenance

### Weekly Tasks
- Check database size: `SELECT pg_size_pretty(pg_database_size('fluxstudio_db'));`
- Vacuum analyze tables: `VACUUM ANALYZE;`
- Review slow queries
- Check index usage

### Monthly Tasks
- Review and archive old activities
- Update PostgreSQL statistics
- Review connection pool configuration
- Performance tuning based on query patterns

---

## Support Contacts

- **Database Admin**: [Your DBA contact]
- **DevOps**: [Your DevOps contact]
- **On-Call**: [Your on-call rotation]

---

## Appendix

### A. Environment Variables Reference

```bash
# Database Configuration
DB_HOST=localhost              # PostgreSQL host
DB_PORT=5432                   # PostgreSQL port
DB_NAME=fluxstudio_db          # Database name
DB_USER=postgres               # Database user
DB_PASSWORD=***                # Database password

# Migration Control
USE_POSTGRES=true              # Read from PostgreSQL
DUAL_WRITE_ENABLED=true        # Write to both systems

# Node Environment
NODE_ENV=production            # production/development
PORT=3001                      # Application port
```

### B. Quick Reference Commands

```bash
# Test connection
node database/test-connection.js

# Run migration
node database/migrate-json-to-postgres.js

# Validate data
node database/validate-data.js

# Rollback (emergency)
node database/rollback-to-json.js --force

# Check database size
psql -U postgres -d fluxstudio_db \
  -c "SELECT pg_size_pretty(pg_database_size('fluxstudio_db'));"

# Check table sizes
psql -U postgres -d fluxstudio_db \
  -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### C. SQL Snippets

```sql
-- Count records in all tables
SELECT 'users' as table, COUNT(*) FROM users
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'milestones', COUNT(*) FROM milestones
UNION ALL SELECT 'activities', COUNT(*) FROM activities;

-- Find tables without indexes
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
  SELECT tablename
  FROM pg_indexes
  WHERE schemaname = 'public'
);

-- Show active connections
SELECT
  datname,
  count(*) as connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY connections DESC;
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-17
**Next Review**: After Phase 5 completion
