# Disaster Recovery Plan

## Overview

This document outlines the disaster recovery (DR) procedures for FluxStudio production environment on DigitalOcean App Platform.

## Recovery Time Objectives

| Component | RTO (Recovery Time) | RPO (Recovery Point) |
|-----------|---------------------|----------------------|
| Frontend | 15 minutes | 0 (code in git) |
| Backend API | 30 minutes | 0 (code in git) |
| Database | 1 hour | 24 hours (daily backup) |
| File Storage | 2 hours | 24 hours |

## Backup Strategy

### Database Backups

**Automated Backups (DigitalOcean Managed)**
- Frequency: Daily at 00:00 UTC
- Retention: 7 days
- Location: DigitalOcean NYC region

**Point-in-Time Recovery**
- DigitalOcean managed PostgreSQL supports restoring to any point within the backup window
- Use the DO dashboard: Databases → `49f4dc39` → Backups → Restore

**Manual Backups**
```bash
# Create manual backup
./scripts/backup-database.sh

# List available backups
doctl databases backups list 49f4dc39-3d91-4bce-aa7a-7784c8e32a66
```

### Application Backups

- **Code**: GitHub repository with branch protection
- **Configuration**: `.do/app.yaml` in version control
- **Secrets**: DigitalOcean dashboard (manually documented)

### Redis Cache

- **DigitalOcean Managed Redis**: No persistent backup (cache-only)
- Rate limiter state, session cache, and Socket.IO adapter state are ephemeral
- **Recovery**: Redis restarts with empty state; clients reconnect automatically
- No data loss risk — all authoritative data lives in PostgreSQL

### File Storage Backups

- **DigitalOcean Spaces**: Cross-region replication enabled
- **CDN Cache**: Automatic invalidation on deploy

## Recovery Procedures

### Scenario 1: Application Service Failure

**Symptoms**: 5xx errors, health check failures

**Steps**:
1. Check DigitalOcean App Platform logs
   ```bash
   doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type=run
   ```
2. If code issue, rollback to previous deployment
   ```bash
   doctl apps create-deployment bd400c99-683f-4d84-ac17-e7130fef0781 --force-rebuild
   ```
3. If infrastructure issue, contact DigitalOcean support

### Scenario 2: Database Corruption or Loss

**Symptoms**: Database connection errors, data inconsistency

**Steps**:
1. Stop application to prevent further damage
   ```bash
   doctl apps update bd400c99-683f-4d84-ac17-e7130fef0781 --spec disable-app.yaml
   ```
2. List available backups
   ```bash
   doctl databases backups list 49f4dc39-3d91-4bce-aa7a-7784c8e32a66
   ```
3. Restore from backup
   ```bash
   doctl databases restore 49f4dc39-3d91-4bce-aa7a-7784c8e32a66 --backup-id <backup-id>
   ```
4. Verify data integrity
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM subscriptions WHERE status = 'active';"
   ```
5. Re-sync Stripe subscription state (see Scenario 5 below)
6. Restart application

### Scenario 3: Complete Environment Loss

**Symptoms**: All services unavailable, domain unreachable

**Steps**:
1. Verify GitHub repository is accessible
2. Create new DigitalOcean App from `app.yaml`
   ```bash
   doctl apps create --spec .do/app.yaml
   ```
3. Restore secrets from backup documentation
4. Restore database from backup
5. Update DNS if necessary
6. Verify all services healthy

### Scenario 4: Security Breach

**Symptoms**: Unauthorized access, data exfiltration suspected

**Immediate Actions**:
1. Rotate all secrets immediately
   ```bash
   # Generate new secrets
   openssl rand -base64 64  # JWT_SECRET
   openssl rand -hex 32     # SESSION_SECRET
   ```
2. Invalidate all user sessions
3. Enable maintenance mode
4. Review access logs
5. Notify affected users per legal requirements

### Scenario 5: Stripe Subscription Drift After DB Restore

**Symptoms**: Database restored from backup but subscriptions are out of sync with Stripe (e.g., user paid after backup was taken but DB shows old state)

**Steps**:
1. List active Stripe subscriptions
   ```bash
   # Use Stripe CLI or dashboard to export active subscriptions
   stripe subscriptions list --status=active --limit=100
   ```
2. Compare against local `subscriptions` table
   ```sql
   SELECT user_id, stripe_subscription_id, status, current_period_end
   FROM subscriptions WHERE status = 'active';
   ```
3. For each discrepancy, update the local record to match Stripe
   ```sql
   UPDATE subscriptions
   SET status = 'active', current_period_end = '<stripe_period_end>'
   WHERE stripe_subscription_id = '<sub_id>';
   ```
4. Re-sync customer IDs on `users` table
   ```sql
   -- Verify stripe_customer_id matches Stripe records
   SELECT id, email, stripe_customer_id FROM users
   WHERE stripe_customer_id IS NOT NULL;
   ```
5. Replay any missed webhooks from the Stripe dashboard
   - Dashboard → Developers → Webhooks → select endpoint → Resend events

**Prevention**: Stripe is the source of truth for payment state. After any DB restore, always re-sync subscriptions before re-enabling the app.

## Secret Rotation Procedure

### Required Secrets

| Secret | Rotation Frequency | Rotation Method |
|--------|-------------------|-----------------|
| JWT_SECRET | Quarterly | DigitalOcean dashboard |
| SESSION_SECRET | Quarterly | DigitalOcean dashboard |
| OAUTH_ENCRYPTION_KEY | Annually | DigitalOcean dashboard |
| STRIPE_SECRET_KEY | On breach only | Stripe Dashboard → API keys |
| STRIPE_WEBHOOK_SECRET | On breach only | Stripe Dashboard → Webhooks → Signing secret |
| GOOGLE_CLIENT_SECRET | On breach only | Google Cloud Console |
| GITHUB_CLIENT_SECRET | On breach only | GitHub Settings |
| DATABASE_URL | On breach only | Create new credentials |
| REDIS_URL | On breach only | Create new credentials |

### Rotation Steps

1. Generate new secret value
2. Update in DigitalOcean dashboard
3. Trigger new deployment
4. Verify application health
5. Document rotation in security log

## Health Monitoring

### Endpoints to Monitor

| Endpoint | Expected Response | Check Interval |
|----------|------------------|----------------|
| `/health` | `200 OK` | 30 seconds |
| `/api/health` | `200 OK` | 30 seconds |
| `/collab/health` | `200 OK` | 60 seconds |

### Alert Thresholds

- Response time > 500ms: Warning
- Response time > 2000ms: Critical
- Error rate > 1%: Warning
- Error rate > 5%: Critical
- Uptime < 99.9%: Review SLA

## Contact Information

### DigitalOcean Support
- Dashboard: https://cloud.digitalocean.com/support
- Priority: Use "Critical" for production outages

### Team Escalation
1. On-call engineer (check schedule)
2. Tech lead
3. Platform team

## Testing Schedule

| Test Type | Frequency | Last Tested | Next Due |
|-----------|-----------|-------------|----------|
| Backup restore | Quarterly | - | 2026-Q2 |
| Stripe sync drill | Quarterly | - | 2026-Q2 |
| Failover | Annually | - | 2026-Q4 |
| Secret rotation | Quarterly | - | 2026-Q3 |

## Appendix

### Resource IDs

| Resource | ID |
|----------|----|
| App | `bd400c99-683f-4d84-ac17-e7130fef0781` |
| Database (PostgreSQL) | `49f4dc39-3d91-4bce-aa7a-7784c8e32a66` |

### Database Connection String Format
```
postgresql://user:password@host:port/database?sslmode=require
```

### DigitalOcean CLI Quick Reference
```bash
# List apps
doctl apps list

# Get app details
doctl apps get bd400c99-683f-4d84-ac17-e7130fef0781

# View logs
doctl apps logs bd400c99-683f-4d84-ac17-e7130fef0781 --type=run --follow

# List deployments
doctl apps list-deployments bd400c99-683f-4d84-ac17-e7130fef0781

# Rollback to previous deployment
doctl apps create-deployment bd400c99-683f-4d84-ac17-e7130fef0781 --force-rebuild

# List database backups
doctl databases backups list 49f4dc39-3d91-4bce-aa7a-7784c8e32a66
```
