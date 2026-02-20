# FluxStudio Incident Response Runbook

## 1. Severity Classification

| Level | Name | Description | Response Time | Examples |
|-------|------|-------------|---------------|----------|
| **P1** | Critical | Service is down or major data loss risk | Immediate (< 15 min) | Database unreachable, auth broken, data corruption |
| **P2** | High | Major feature broken, significant user impact | < 1 hour | Real-time collab failing, file uploads broken, payments failing |
| **P3** | Medium | Feature degraded, workaround available | < 4 hours | Slow API responses, intermittent errors, UI rendering bugs |
| **P4** | Low | Minor issue, cosmetic, or edge case | Next business day | Typos, non-critical UI glitch, minor logging gaps |

## 2. On-Call Responsibilities

### First Responder
1. Acknowledge the alert within the response time window
2. Assess severity using the classification above
3. Begin investigation — check health endpoints, logs, Sentry
4. Communicate status in the incident channel
5. Escalate if the issue is beyond your area

### Investigation Checklist
```bash
# 1. Check service health
curl -s https://api.fluxstudio.art/health/ready | jq

# 2. Check all endpoints
for endpoint in "/health" "/health/live" "/health/ready"; do
  echo "$endpoint: $(curl -s -o /dev/null -w "%{http_code}" https://api.fluxstudio.art$endpoint)"
done

# 3. Check recent deployments
doctl apps list-deployments <app-id> --format ID,Phase,Progress,Created

# 4. Check application logs
doctl apps logs <app-id> --type run --follow

# 5. Check database connectivity
doctl databases connection <db-id> --format Host,Port,Database

# 6. Check error rates in Sentry
# Visit: https://sentry.io/organizations/fluxstudio/issues/
```

## 3. Rollback Procedures

### 3.1 Feature Flag Kill Switch (Fastest — seconds)

If the issue is isolated to a new feature behind a flag, disable it immediately:

```bash
# Disable a feature flag via API
curl -X PATCH https://api.fluxstudio.art/api/admin/flags/<flag-id> \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Verify it's off
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://api.fluxstudio.art/api/admin/flags | jq '.[] | select(.name=="<flag-name>")'
```

### 3.2 Application Rollback (DigitalOcean — minutes)

```bash
# List recent deployments
doctl apps list-deployments <app-id>

# Force rebuild from current commit
doctl apps create-deployment <app-id> --force-rebuild

# Or revert the git commit and push (triggers auto-deploy)
git revert HEAD
git push origin main
```

### 3.3 Database Migration Rollback

**Before rolling back a migration:**
1. Check if the migration added columns/tables (safe to leave) vs. dropped/altered data (needs rollback)
2. Never drop columns in production migrations — only add

```bash
# Connect to production database
psql $DATABASE_URL

# Check current migration state
SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 5;

# Apply reverse migration (write one if not already prepared)
```

### 3.4 Environment Variable Rollback

```bash
# Check current spec
doctl apps spec get <app-id> | grep -A2 envs

# Update env var via spec
doctl apps update <app-id> --spec updated-spec.yaml
```

## 4. Communication Templates

### P1/P2 — Initial Notification
```
INCIDENT: [Brief description]
SEVERITY: P[1|2]
STATUS: Investigating
IMPACT: [What users are affected and how]
STARTED: [Time in UTC]
NEXT UPDATE: [ETA]
```

### Status Update
```
UPDATE on [Incident title]
STATUS: [Investigating | Identified | Monitoring | Resolved]
DETAILS: [What we know, what we're doing]
NEXT UPDATE: [ETA]
```

### Resolution
```
RESOLVED: [Incident title]
DURATION: [Start time] - [End time] ([total minutes])
ROOT CAUSE: [Brief explanation]
IMPACT: [Number of users, failed requests, etc.]
FOLLOW-UP: Post-mortem scheduled for [date]
```

## 5. Post-Mortem Template

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD
**Severity:** P[1-4]
**Duration:** [X minutes/hours]
**Author:** [Name]

## Summary
[2-3 sentences: what happened, how it was resolved]

## Timeline (UTC)
| Time | Event |
|------|-------|
| HH:MM | [First alert / detection] |
| HH:MM | [Investigation began] |
| HH:MM | [Root cause identified] |
| HH:MM | [Fix deployed] |
| HH:MM | [Incident resolved] |

## Root Cause
[Detailed explanation of what caused the incident]

## Impact
- Users affected: [number or percentage]
- Failed requests: [count]
- Data loss: [yes/no, details]
- Revenue impact: [if applicable]

## What Went Well
- [Thing 1]
- [Thing 2]

## What Went Poorly
- [Thing 1]
- [Thing 2]

## Action Items
| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| [Action 1] | [Name] | YYYY-MM-DD | [ ] |
| [Action 2] | [Name] | YYYY-MM-DD | [ ] |

## Lessons Learned
[Key takeaways for the team]
```

## 6. Incident Playbooks

### Playbook: Complete Site Outage (P1)

1. **Immediate** (0-5 min)
   - Verify outage via multiple methods
   - Check DigitalOcean status page
   - Alert team via #incidents

2. **Triage** (5-15 min)
   - Is it DNS? `dig fluxstudio.art`
   - Is it DO platform? Check status.digitalocean.com
   - Is it our code? Check deployment logs

3. **Mitigation** (15-30 min)
   - If deployment issue: Rollback (Section 3.2)
   - If infrastructure: Contact DO support (P1)
   - If DNS: Check domain configuration

4. **Communication** (ongoing)
   - Update status page every 15 min
   - Prepare user communication

### Playbook: Database Issues (P1-P2)

1. **Symptoms:** Connection timeouts, query errors, slow response times

2. **Investigation**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"
   ```

3. **Mitigation**
   - Kill long-running queries
   - Restart backend to clear connection pool
   - Scale database if needed
   - Check `doctl databases backups list <db-id>` for restore options

### Playbook: Authentication Failures (P2)

1. **Symptoms:** Users can't log in, OAuth errors, 401/403 responses

2. **Investigation**
   - Check JWT_SECRET is set in environment
   - Verify OAuth credentials (Google, Figma, Slack, GitHub)
   - Check token expiration settings
   - Review 2FA service status

3. **Mitigation**
   - Verify secrets in DO App Platform dashboard
   - Clear Redis cache if stale sessions
   - Check OAuth provider status pages

### Playbook: High Memory/CPU (P3)

1. **Symptoms:** Slow responses, health check timeouts, OOM kills

2. **Investigation**
   ```bash
   doctl apps logs <app-id> --component=unified-backend | grep -i "heap\|memory\|oom"
   curl -s https://api.fluxstudio.art/api/monitoring/metrics | jq
   ```

3. **Mitigation**
   - Restart service (quick fix)
   - Scale horizontally
   - Investigate memory leak with profiling

## 7. Key URLs & Resources

| Resource | URL |
|----------|-----|
| Production app | https://fluxstudio.art |
| API health check | https://api.fluxstudio.art/health/ready |
| DigitalOcean dashboard | https://cloud.digitalocean.com/apps |
| Sentry | https://sentry.io/organizations/fluxstudio/ |
| GitHub repo | https://github.com/kentino/FluxStudio |
| CI/CD (GitHub Actions) | https://github.com/kentino/FluxStudio/actions |

## 8. Useful Commands Reference

```bash
# App Platform
doctl apps list
doctl apps get <app-id>
doctl apps logs <app-id> --type=run --tail 100
doctl apps list-deployments <app-id>
doctl apps create-deployment <app-id> --force-rebuild

# Database
doctl databases list
doctl databases get <db-id>
doctl databases backups list <db-id>
doctl databases connection <db-id>

# Feature Flags (quick kill switch)
curl -H "Authorization: Bearer $TOKEN" https://api.fluxstudio.art/api/admin/flags

# Run smoke tests against production
./tests/smoke/run-smoke.sh https://api.fluxstudio.art
```

## 9. Emergency Contacts

| Role | Contact | When to Contact |
|------|---------|-----------------|
| On-call Engineer | Check schedule | P1-P2 |
| Tech Lead | [Contact] | P1, escalation |
| DO Support | Dashboard ticket | Infrastructure issues |
