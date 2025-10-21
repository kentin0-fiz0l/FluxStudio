# Sprint 3: PostgreSQL Migration - Quick Start Guide

**FOR DEPLOYMENT TEAM** 🚀

This is your **5-minute guide** to deploying the PostgreSQL migration. For detailed instructions, see [SPRINT_3_MIGRATION_RUNBOOK.md](./SPRINT_3_MIGRATION_RUNBOOK.md).

---

## Prerequisites Checklist

```bash
# 1. PostgreSQL installed and running
psql --version
# Expected: PostgreSQL 12+

# 2. Database created
psql -U postgres -c "CREATE DATABASE fluxstudio_db;"

# 3. Environment variables set
cat .env | grep DB_
# Expected:
#   DB_HOST=localhost
#   DB_PORT=5432
#   DB_NAME=fluxstudio_db
#   DB_USER=postgres
#   DB_PASSWORD=<your-secure-password>
#   USE_POSTGRES=false
#   DUAL_WRITE_ENABLED=true
```

---

## 5-Step Deployment Process

### Step 1: Initialize Database (5 min)

```bash
# Navigate to project directory
cd /Users/kentino/FluxStudio

# Run schema setup
psql -U postgres -d fluxstudio_db -f database/schema.sql

# Add tasks and activities tables
psql -U postgres -d fluxstudio_db -f database/migrations/006_add_tasks_and_activities.sql

# Test connection
node database/test-connection.js
```

**Expected Output**:
```
✅ Database connected successfully at: 2025-10-17T...
```

---

### Step 2: Backup Current Data (2 min)

```bash
# Create backup directory
mkdir -p database/backups

# Backup JSON files
cp users.json "database/backups/users.json.$(date +%Y%m%d-%H%M%S)"
cp projects.json "database/backups/projects.json.$(date +%Y%m%d-%H%M%S)"

# Verify backups exist
ls -lh database/backups/
```

---

### Step 3: Deploy Dual-Write Code (5 min)

```bash
# Ensure environment variables are set
export USE_POSTGRES=false           # Read from JSON (for now)
export DUAL_WRITE_ENABLED=true      # Write to both

# Build and restart application
npm run build
pm2 restart fluxstudio

# Verify dual-write is working
pm2 logs fluxstudio --lines 50
```

**Look for these log messages**:
```
📊 Dual-Write Service initialized:
  usePostgres: false
  dualWriteEnabled: true
  readFrom: JSON
  writeTo: PostgreSQL + JSON
```

---

### Step 4: Migrate Historical Data (10 min)

```bash
# Run migration script
node database/migrate-json-to-postgres.js

# Expected output will show:
# ✅ Migrated user: jason@fizol.io
# ✅ Migrated user: test@fluxstudio.art
# ✅ Migrated project: Test Project
# ...
# 📊 Migration Statistics
#   USERS: Total: 2, Migrated: 2 (100.0%)
#   PROJECTS: Total: 2, Migrated: 2 (100.0%)
```

---

### Step 5: Validate & Switch (5 min)

```bash
# Validate data integrity
node database/validate-data.js

# Expected output:
# ✅ Total Discrepancies Found: 0
# ✅ Data is consistent! Safe to proceed with migration.

# If validation passes, switch to PostgreSQL reads
export USE_POSTGRES=true
pm2 restart fluxstudio

# Verify application is working
curl http://localhost:3001/api/health
```

---

## Verification Checklist

After deployment, verify these features work:

- [ ] User login works
- [ ] Create new project
- [ ] Add task to project
- [ ] Update task status
- [ ] View project details
- [ ] Real-time WebSocket updates
- [ ] Activity logging appears

**Test Command**:
```bash
# Create test user via API
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","password":"test123"}'

# Verify it exists in PostgreSQL
psql -U postgres -d fluxstudio_db \
  -c "SELECT id, email, name FROM users WHERE email = 'test@example.com';"
```

---

## Emergency Rollback

If something goes wrong:

```bash
# 1. Export latest data from PostgreSQL
node database/rollback-to-json.js --force

# 2. Switch back to JSON
export USE_POSTGRES=false
pm2 restart fluxstudio

# 3. Verify application works
curl http://localhost:3001/api/health
```

---

## Monitoring Commands

```bash
# Application logs
pm2 logs fluxstudio

# Application monitoring
pm2 monit

# Database connections
psql -U postgres -d fluxstudio_db \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check for slow queries
pm2 logs fluxstudio | grep "Slow query"

# Database size
psql -U postgres -d fluxstudio_db \
  -c "SELECT pg_size_pretty(pg_database_size('fluxstudio_db'));"
```

---

## Timeline

**Total deployment time: ~30 minutes**

- Step 1 (Database Setup): 5 min
- Step 2 (Backup): 2 min
- Step 3 (Deploy Dual-Write): 5 min
- Step 4 (Migrate Data): 10 min
- Step 5 (Validate & Switch): 5 min
- Verification: 3 min

---

## Environment Variables Reference

```bash
# Add to .env file or export in terminal

# Database connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fluxstudio_db
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# Migration control flags
USE_POSTGRES=false           # Start with false, switch to true after validation
DUAL_WRITE_ENABLED=true      # Keep true for 24 hours after migration

# Node environment
NODE_ENV=production
PORT=3001
```

---

## Success Indicators

✅ **Migration Successful** if:
1. Validation script reports 0 discrepancies
2. All API endpoints respond
3. User can login
4. Projects and tasks can be created/updated
5. WebSocket real-time updates work
6. No error logs in `pm2 logs`

❌ **Rollback Required** if:
1. Validation script reports >5% discrepancies
2. API endpoints timing out
3. Database connection errors
4. Data corruption detected
5. Performance degraded significantly

---

## Support

**Issues during deployment?**

1. Check logs: `pm2 logs fluxstudio --err`
2. Review [Troubleshooting Section](./SPRINT_3_MIGRATION_RUNBOOK.md#troubleshooting) in runbook
3. Check database connection: `node database/test-connection.js`
4. Verify environment variables: `env | grep DB_`

**Still stuck?**
- Full documentation: `/database/SPRINT_3_MIGRATION_RUNBOOK.md`
- Security audit: `/database/SECURITY_AUDIT_REPORT.md`
- Project summary: `/SPRINT_3_DATABASE_MIGRATION_COMPLETE.md`

---

## File Locations

All migration files are in `/Users/kentino/FluxStudio/database/`:

```
database/
├── schema.sql                          # Full database schema
├── migrations/
│   └── 006_add_tasks_and_activities.sql  # Tasks & activities tables
├── config.js                           # Database connection & helpers
├── dual-write-service.js              # Main dual-write implementation
├── migrate-json-to-postgres.js        # Migration script
├── validate-data.js                    # Validation script
├── rollback-to-json.js                 # Emergency rollback
├── test-connection.js                  # Connection tester
├── SPRINT_3_MIGRATION_RUNBOOK.md      # Full deployment guide
├── SECURITY_AUDIT_REPORT.md           # Security assessment
└── QUICK_START_GUIDE.md               # This file
```

---

## Post-Deployment Tasks

**First 24 hours:**
- Monitor logs every 4 hours
- Check database connection pool stats
- Run validation script once more
- Document any issues encountered

**After 24 hours:**
- Consider disabling dual-write if stable:
  ```bash
  export DUAL_WRITE_ENABLED=false
  pm2 restart fluxstudio
  ```

**After 7 days:**
- Remove old JSON backups (keep one final backup)
- Update documentation with lessons learned
- Plan Sprint 4 improvements

---

**Last Updated**: 2025-10-17
**Version**: 1.0
**Status**: ✅ Ready for Deployment
