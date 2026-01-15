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

**Manual Backups**
```bash
# Create manual backup
./scripts/backup-database.sh

# List available backups
doctl databases backups list <database-id>
```

### Application Backups

- **Code**: GitHub repository with branch protection
- **Configuration**: `.do/app.yaml` in version control
- **Secrets**: DigitalOcean dashboard (manually documented)

### File Storage Backups

- **DigitalOcean Spaces**: Cross-region replication enabled
- **CDN Cache**: Automatic invalidation on deploy

## Recovery Procedures

### Scenario 1: Application Service Failure

**Symptoms**: 5xx errors, health check failures

**Steps**:
1. Check DigitalOcean App Platform logs
   ```bash
   doctl apps logs <app-id> --type=run
   ```
2. If code issue, rollback to previous deployment
   ```bash
   doctl apps create-deployment <app-id> --force-rebuild
   ```
3. If infrastructure issue, contact DigitalOcean support

### Scenario 2: Database Corruption or Loss

**Symptoms**: Database connection errors, data inconsistency

**Steps**:
1. Stop application to prevent further damage
   ```bash
   doctl apps update <app-id> --spec disable-app.yaml
   ```
2. List available backups
   ```bash
   doctl databases backups list <database-id>
   ```
3. Restore from backup
   ```bash
   doctl databases restore <database-id> --backup-id <backup-id>
   ```
4. Verify data integrity
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   ```
5. Restart application

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

## Secret Rotation Procedure

### Required Secrets

| Secret | Rotation Frequency | Rotation Method |
|--------|-------------------|-----------------|
| JWT_SECRET | Quarterly | DigitalOcean dashboard |
| SESSION_SECRET | Quarterly | DigitalOcean dashboard |
| OAUTH_ENCRYPTION_KEY | Annually | DigitalOcean dashboard |
| GOOGLE_CLIENT_SECRET | On breach only | Google Cloud Console |
| GITHUB_CLIENT_SECRET | On breach only | GitHub Settings |
| DATABASE_URL | On breach only | Create new credentials |

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
| Backup restore | Quarterly | - | TBD |
| Failover | Annually | - | TBD |
| Secret rotation | Quarterly | - | TBD |

## Appendix

### Database Connection String Format
```
postgresql://user:password@host:port/database?sslmode=require
```

### DigitalOcean CLI Quick Reference
```bash
# List apps
doctl apps list

# Get app details
doctl apps get <app-id>

# View logs
doctl apps logs <app-id> --type=run --follow

# List deployments
doctl apps list-deployments <app-id>

# Rollback to previous deployment
doctl apps create-deployment <app-id> --force-rebuild
```
