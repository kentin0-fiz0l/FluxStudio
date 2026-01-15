# Incident Response Procedures

## Incident Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV1** | Complete outage | < 15 min | Site unreachable, data loss |
| **SEV2** | Major degradation | < 1 hour | Core features broken |
| **SEV3** | Minor impact | < 4 hours | Non-critical feature broken |
| **SEV4** | No user impact | Next business day | Internal tooling issues |

## Incident Response Steps

### 1. Detection & Triage

**Automated Detection**
- Health check failures trigger alerts
- Error rate spikes in monitoring
- User reports via support channels

**Manual Assessment**
```bash
# Quick health check
curl -s https://fluxstudio.art/health | jq
curl -s https://fluxstudio.art/api/health | jq

# Check service status
doctl apps get <app-id> --format json | jq '.active_deployment.progress'
```

### 2. Communication

**Internal**
- Post in #incidents channel
- Include: severity, symptoms, impact

**External (if needed)**
- Update status page
- Prepare user communication

### 3. Investigation

**Gather Information**
```bash
# View recent logs
doctl apps logs <app-id> --type=run --tail 200

# Check specific time range
doctl apps logs <app-id> --type=run --since 30m

# Check deployment history
doctl apps list-deployments <app-id>
```

**Common Investigation Paths**

| Symptom | Check | Command |
|---------|-------|---------|
| 5xx errors | Backend logs | `doctl apps logs <app-id> --component=unified-backend` |
| Slow responses | Database | `SELECT * FROM pg_stat_activity;` |
| WebSocket failures | Collab service | `doctl apps logs <app-id> --component=collaboration` |
| Auth failures | OAuth config | Check environment variables |

### 4. Mitigation

**Quick Fixes**
- Restart service: Force redeploy
- Rollback: Deploy previous version
- Scale up: Increase instance count
- Enable maintenance mode: Redirect traffic

**Rollback Procedure**
```bash
# List deployments
doctl apps list-deployments <app-id>

# Find last working deployment
# Note: DigitalOcean doesn't have direct rollback
# You need to revert the code and redeploy

git revert HEAD
git push origin main
```

### 5. Resolution & Recovery

**Verify Fix**
```bash
# Run health checks
npm run verify

# Monitor error rates for 15 minutes
# Check user reports
```

**Document Resolution**
- What was the root cause?
- What fixed it?
- How long was the impact?

### 6. Post-Incident Review

**Within 48 hours**
- Schedule post-mortem meeting
- Gather timeline and evidence
- Identify action items

**Post-mortem Template**
```markdown
## Incident: [Title]
Date: [Date]
Duration: [Start] - [End]
Severity: [SEV1-4]

### Summary
[1-2 sentence description]

### Impact
- Users affected: [count/percentage]
- Features impacted: [list]

### Timeline
- HH:MM - [Event]
- HH:MM - [Event]

### Root Cause
[Description of what caused the incident]

### Resolution
[What was done to fix it]

### Action Items
- [ ] [Item 1] - Owner: [Name]
- [ ] [Item 2] - Owner: [Name]

### Lessons Learned
[What we learned and will do differently]
```

## Incident Playbooks

### Playbook: Complete Site Outage (SEV1)

1. **Immediate** (0-5 min)
   - Verify outage via multiple methods
   - Check DigitalOcean status page
   - Alert team via #incidents

2. **Triage** (5-15 min)
   - Is it DNS? `dig fluxstudio.art`
   - Is it DO platform? Check status.digitalocean.com
   - Is it our code? Check deployment logs

3. **Mitigation** (15-30 min)
   - If deployment issue: Rollback
   - If infrastructure: Contact DO support (P1)
   - If DNS: Check domain configuration

4. **Communication** (ongoing)
   - Update status page every 15 min
   - Prepare user communication

### Playbook: Database Issues (SEV1-2)

1. **Symptoms**
   - Connection timeouts
   - Query errors in logs
   - Slow response times

2. **Investigation**
   ```bash
   # Check connection
   psql $DATABASE_URL -c "SELECT 1;"

   # Check active connections
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

   # Check slow queries
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start;"
   ```

3. **Mitigation**
   - Kill long-running queries
   - Restart backend to clear connections
   - Scale database if needed

### Playbook: Authentication Failures (SEV2)

1. **Symptoms**
   - Users can't log in
   - OAuth errors
   - 401/403 responses

2. **Investigation**
   - Check JWT_SECRET is set
   - Verify OAuth credentials
   - Check token expiration

3. **Mitigation**
   - Verify secrets in DO dashboard
   - Clear Redis cache if needed
   - Check OAuth provider status

### Playbook: High Memory/CPU (SEV3)

1. **Symptoms**
   - Slow responses
   - Health check timeouts
   - OOM kills in logs

2. **Investigation**
   ```bash
   # Check metrics
   curl -s https://fluxstudio.art/api/monitoring/metrics

   # Check for memory leaks in logs
   doctl apps logs <app-id> --component=unified-backend | grep -i "heap\|memory"
   ```

3. **Mitigation**
   - Restart service (quick fix)
   - Scale horizontally
   - Investigate memory leak

## Emergency Contacts

| Role | Contact | When to Contact |
|------|---------|-----------------|
| On-call Engineer | Check schedule | SEV1-2 |
| Tech Lead | [Contact] | SEV1, escalation |
| DO Support | Dashboard | Infrastructure issues |

## Useful Commands Reference

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

# Quick health check
for endpoint in "/" "/api/health" "/collab/health"; do
  echo "$endpoint: $(curl -s -o /dev/null -w "%{http_code}" https://fluxstudio.art$endpoint)"
done
```
