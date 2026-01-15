# FluxStudio Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying FluxStudio to DigitalOcean App Platform.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Build succeeds: `npm run build`

### Security
- [ ] No secrets in code: `npm run check-secrets` or check pre-commit hook
- [ ] Dependencies updated: `npm audit`
- [ ] Environment variables documented

### Database
- [ ] Migrations tested locally
- [ ] Rollback procedure documented for new migrations
- [ ] Backup taken before major schema changes

## Deployment Procedures

### Standard Deployment (Auto-deploy on push)

1. **Merge to main branch**
   ```bash
   git checkout main
   git pull origin main
   git merge feature-branch
   git push origin main
   ```

2. **Monitor deployment**
   - Check GitHub Actions: https://github.com/kentin0-fiz0l/FluxStudio/actions
   - Check DigitalOcean dashboard: https://cloud.digitalocean.com/apps

3. **Verify deployment**
   ```bash
   # Check health endpoints
   curl -s https://fluxstudio.art/health
   curl -s https://fluxstudio.art/api/health
   ```

### Manual Deployment (Force rebuild)

1. **Using DigitalOcean CLI**
   ```bash
   # Get app ID
   doctl apps list

   # Force new deployment
   doctl apps create-deployment <app-id> --force-rebuild

   # Monitor deployment
   doctl apps get-deployment <app-id> <deployment-id>
   ```

2. **Using DigitalOcean Dashboard**
   - Navigate to App Platform > FluxStudio
   - Click "Actions" > "Force Rebuild & Deploy"

### Rollback Procedure

1. **Identify previous working deployment**
   ```bash
   doctl apps list-deployments <app-id>
   ```

2. **Revert git commit (if needed)**
   ```bash
   git revert <commit-sha>
   git push origin main
   ```

3. **Force rebuild from previous state**
   ```bash
   # Checkout previous commit
   git checkout <previous-sha>

   # Create hotfix branch
   git checkout -b hotfix/rollback

   # Push and deploy
   git push origin hotfix/rollback
   ```

## Environment-Specific Procedures

### Production (fluxstudio.art)

**Pre-deployment**
- Announce maintenance window if needed
- Ensure database backup is recent
- Review any pending migrations

**Post-deployment**
- Monitor error rates in Grafana
- Check user-facing functionality
- Review performance metrics

### Staging (if configured)

**Pre-deployment**
- No announcement needed
- Test migrations on staging first

**Post-deployment**
- Run E2E tests against staging
- Get team sign-off before production

## Service-Specific Notes

### Frontend (Static Site)

- Build command: `npm ci && npm run build`
- Output directory: `build`
- Catchall: `index.html` (for SPA routing)
- Cache: CDN edge caching enabled

**Common Issues:**
- Build fails: Check Node version, clear npm cache
- Assets not loading: Verify VITE_* env vars

### Backend (unified-backend)

- Run command: `node server-unified.js`
- Health check: `/health`
- Port: 3001

**Common Issues:**
- Database connection: Verify DATABASE_URL secret
- Redis timeout: Check REDIS_URL and network rules

### Collaboration (collaboration)

- Run command: `node server-collaboration.js`
- Health check: `/health`
- Port: 4000

**Common Issues:**
- WebSocket failures: Check CORS configuration
- Memory issues: Monitor heap usage

### MCP Server (flux-mcp)

- Dockerfile-based deployment
- Health check: `/health`
- Port: 8787

**Common Issues:**
- GitHub rate limiting: Check GITHUB_TOKEN
- Auth failures: Verify MCP_AUTH_TOKEN

### FFmpeg Worker (ffmpeg-worker)

- Dockerfile-based deployment
- Health check: `/health`
- Port: 8080

**Common Issues:**
- Transcoding failures: Check disk space in /tmp
- S3 upload failures: Verify SPACES_* credentials

## Database Migration Deployment

### Pre-migration Checklist
- [ ] Test migration locally
- [ ] Create database backup
- [ ] Prepare rollback script
- [ ] Schedule maintenance window if needed

### Migration Procedure

1. **Run migration job (automatic)**
   - Migrations run automatically as PRE_DEPLOY job
   - Check job logs in DigitalOcean dashboard

2. **Manual migration (if needed)**
   ```bash
   # Connect to database
   psql $DATABASE_URL

   # Run migration manually
   node database/run-migrations.js
   ```

### Migration Rollback

1. **Using rollback migration**
   ```bash
   # Create rollback migration
   node database/create-migration.js rollback-<feature>

   # Run rollback
   node database/run-migrations.js
   ```

2. **Database restore (last resort)**
   ```bash
   doctl databases restore <database-id> --backup-id <backup-id>
   ```

## Monitoring & Alerts

### Health Check URLs

| Service | URL | Expected |
|---------|-----|----------|
| Frontend | https://fluxstudio.art | 200 OK |
| Backend | https://fluxstudio.art/api/health | 200 OK |
| Collab | https://fluxstudio.art/collab/health | 200 OK |

### Key Metrics to Watch

- **Response Time**: p95 < 500ms
- **Error Rate**: < 1%
- **Memory Usage**: < 80%
- **CPU Usage**: < 70%

### Alert Escalation

1. Warning alerts: Review within 1 hour
2. Critical alerts: Respond within 15 minutes
3. Outage: Immediate response required

## Troubleshooting

### Common Deployment Issues

**Build Failures**
```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Health Check Failures**
```bash
# Check service logs
doctl apps logs <app-id> --type=run --tail 100

# Check specific component
doctl apps logs <app-id> --component=unified-backend
```

**Database Connection Issues**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check pool status
curl -s https://fluxstudio.art/api/health | jq .database
```

**SSL/CORS Issues**
- Verify domain configuration in app.yaml
- Check CORS_ORIGINS environment variable
- Clear CDN cache if needed

## Post-Deployment Verification

### Automated Verification
```bash
npm run verify
```

### Manual Verification Checklist
- [ ] Homepage loads correctly
- [ ] User can log in
- [ ] Real-time features work (WebSocket)
- [ ] File uploads work
- [ ] Email notifications work
- [ ] OAuth providers work

## Maintenance Mode

### Enable Maintenance Mode
```bash
# Set environment variable
doctl apps update <app-id> --spec maintenance-mode.yaml
```

### Disable Maintenance Mode
```bash
doctl apps update <app-id> --spec .do/app.yaml
```

## Contact & Escalation

- **Primary**: On-call engineer
- **Secondary**: Tech lead
- **Emergency**: Platform team

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-15 | Initial version | Claude |
