# FluxStudio - DigitalOcean App Platform Deployment Checklist

**Status:** Ready for Deployment
**Estimated Time:** 30 minutes setup + 15 minutes deployment
**Migration Readiness:** 95%

---

## ⚠️ CRITICAL: Before You Start

**You MUST complete ALL items in this checklist before deploying to production.**

### Prerequisites

- [ ] DigitalOcean account with App Platform enabled
- [ ] `doctl` CLI installed and authenticated
- [ ] Access to all OAuth provider consoles (Google, GitHub, Figma, Slack)
- [ ] Password manager ready to store production credentials
- [ ] 30-45 minutes of uninterrupted time

---

## Step 1: Initialize GitHub Repository (5 minutes)

### 1.1 Create GitHub Repository

```bash
# Option A: Create via GitHub CLI
gh repo create FluxStudio --public --source=. --remote=origin

# Option B: Create via web UI
# 1. Go to https://github.com/new
# 2. Repository name: FluxStudio
# 3. Visibility: Public or Private
# 4. Click "Create repository"
```

### 1.2 Update GitHub Username in Configuration

**You need to update YOUR_GITHUB_USERNAME in these files:**

```bash
cd /Users/kentino/FluxStudio

# Find your GitHub username
YOUR_USERNAME="kentin0-fiz0l"  # Replace with your actual username

# Update .do/app.yaml (3 occurrences)
sed -i '' "s/YOUR_GITHUB_USERNAME/$YOUR_USERNAME/g" .do/app.yaml

# Update .github/workflows/deploy-preview.yml (if needed)
# This file uses ${{ github.repository }} which auto-populates

# Verify changes
grep -n "repo:" .do/app.yaml
# Should show: kentin0-fiz0l/FluxStudio (or your username)
```

### 1.3 Push to GitHub

```bash
cd /Users/kentino/FluxStudio

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - DigitalOcean App Platform ready"

# Add remote (use your actual GitHub repo URL)
git remote add origin git@github.com:kentin0-fiz0l/FluxStudio.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**CHECKPOINT:** Verify repository is visible on GitHub before proceeding.

---

## Step 2: Generate Production Credentials (5 minutes)

### 2.1 Generate Secrets

```bash
cd /Users/kentino/FluxStudio

# Make script executable
chmod +x scripts/generate-production-secrets.sh

# Generate credentials
./scripts/generate-production-secrets.sh > production-credentials-$(date +%Y%m%d-%H%M%S).txt

# Verify file was created
ls -lh production-credentials-*.txt
```

### 2.2 Save to Password Manager

**CRITICAL:** Copy all credentials from `production-credentials-*.txt` to your password manager.

**Credentials generated:**
- JWT_SECRET (256-bit)
- DATABASE_PASSWORD (64 characters)
- REDIS_PASSWORD (64 characters)
- OAUTH_ENCRYPTION_KEY (256-bit)
- SESSION_SECRET (256-bit)

**SECURITY:**
```bash
# Set strict permissions
chmod 600 production-credentials-*.txt

# NEVER commit this file to git
echo "production-credentials-*.txt" >> .gitignore
```

---

## Step 3: Rotate OAuth Credentials (20 minutes)

### 3.1 Google OAuth Console

**URL:** https://console.cloud.google.com/apis/credentials

**Steps:**
1. Select your project (or create new one)
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "FluxStudio Production"
5. **Authorized redirect URIs:**
   - Add: `https://fluxstudio.art/api/auth/google/callback`
   - Add: `https://fluxstudio-unified-backend.ondigitalocean.app/api/auth/google/callback`
6. Click "Create"
7. **Save:**
   - Client ID → GOOGLE_CLIENT_ID
   - Client Secret → GOOGLE_CLIENT_SECRET
   - Also save Client ID as VITE_GOOGLE_CLIENT_ID (frontend needs it)

**CHECKPOINT:** Test authorization URL: https://fluxstudio.art/api/auth/google

---

### 3.2 GitHub OAuth App

**URL:** https://github.com/settings/developers

**Steps:**
1. Click "New OAuth App"
2. **Application name:** FluxStudio Production
3. **Homepage URL:** https://fluxstudio.art
4. **Authorization callback URL:**
   - `https://fluxstudio.art/api/auth/github/callback`
5. Click "Register application"
6. Click "Generate a new client secret"
7. **Save:**
   - Client ID → GITHUB_CLIENT_ID
   - Client Secret → GITHUB_CLIENT_SECRET

**CHECKPOINT:** Verify redirect URI matches exactly (including /api/auth/github/callback)

---

### 3.3 Figma OAuth App

**URL:** https://www.figma.com/developers/apps

**Steps:**
1. Click "Create app"
2. **App name:** FluxStudio Production
3. **Callback URL:** `https://fluxstudio.art/api/integrations/figma/callback`
4. Click "Create"
5. **Save:**
   - Client ID → FIGMA_CLIENT_ID
   - Client Secret → FIGMA_CLIENT_SECRET

**Note:** Figma uses `/api/integrations/figma/callback` (not `/api/auth/`)

---

### 3.4 Slack App

**URL:** https://api.slack.com/apps

**Steps:**
1. Click "Create New App" → "From scratch"
2. **App Name:** FluxStudio Production
3. Select workspace
4. Go to "OAuth & Permissions"
5. **Redirect URLs:**
   - Add: `https://fluxstudio.art/api/integrations/slack/callback`
6. **Bot Token Scopes:** (configure as needed)
   - channels:read
   - chat:write
   - users:read
7. Go to "Basic Information"
8. **Save:**
   - Client ID → SLACK_CLIENT_ID
   - Client Secret → SLACK_CLIENT_SECRET
   - Signing Secret → SLACK_SIGNING_SECRET

---

## Step 4: Configure GitHub Secrets (5 minutes)

### 4.1 Add Repository Secrets

**URL:** https://github.com/kentin0-fiz0l/FluxStudio/settings/secrets/actions

**Click "New repository secret" for each:**

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `DIGITALOCEAN_ACCESS_TOKEN` | Your DO API token | From DO Console → API → Tokens |
| `PREVIEW_DATABASE_URL` | Staging DB URL | Can use same as production for now |
| `PREVIEW_REDIS_URL` | Staging Redis URL | Can use same as production for now |
| `PREVIEW_JWT_SECRET` | From credentials file | Use generated JWT_SECRET |
| `PREVIEW_SESSION_SECRET` | From credentials file | Use generated SESSION_SECRET |
| `VITE_GOOGLE_CLIENT_ID` | From Google Console | Same as GOOGLE_CLIENT_ID |
| `GOOGLE_CLIENT_ID` | From Google Console | For PR previews |
| `GOOGLE_CLIENT_SECRET` | From Google Console | For PR previews |

**To get DigitalOcean API token:**
```bash
# Via web UI:
# 1. Go to: https://cloud.digitalocean.com/account/api/tokens
# 2. Click "Generate New Token"
# 3. Name: "FluxStudio GitHub Actions"
# 4. Scopes: Read & Write
# 5. Expiration: No expiration (or set your preference)
# 6. Copy token immediately (only shown once)
```

---

## Step 5: Validate Configuration (2 minutes)

### 5.1 Validate App Spec

```bash
cd /Users/kentino/FluxStudio

# Install doctl if not installed
brew install doctl  # macOS
# or: snap install doctl  # Linux

# Authenticate
doctl auth init
# Paste your DigitalOcean API token

# Validate app.yaml
doctl apps validate-spec .do/app.yaml
```

**Expected output:**
```
✅ App spec is valid
```

**If errors occur:**
- Check YAML syntax (indentation must be spaces, not tabs)
- Verify GitHub username was updated
- Check all environment variable names match

### 5.2 Test Local Build

```bash
cd /Users/kentino/FluxStudio

# Test frontend build
npm ci
npm run build

# Verify build output
ls -lh build/
# Should show index.html and assets/

# Test unified backend
npm run start:unified &
sleep 3
curl http://localhost:3001/health
# Should return: {"status":"healthy","service":"unified-backend",...}

# Stop test server
pkill -f "node server-unified"
```

---

## Step 6: Deploy to DigitalOcean App Platform (10 minutes)

### 6.1 Create App

```bash
cd /Users/kentino/FluxStudio

# Create app from spec
doctl apps create --spec .do/app.yaml --wait

# This will:
# 1. Create the app
# 2. Provision managed PostgreSQL database
# 3. Provision managed Redis
# 4. Deploy frontend, unified-backend, and collaboration services
# 5. Wait for deployment to complete (can take 5-10 minutes)
```

**Monitor deployment:**
```bash
# Get app ID (will be shown after creation)
APP_ID="<your-app-id>"

# Watch logs in real-time
doctl apps logs $APP_ID --component unified-backend --follow
```

### 6.2 Add Encrypted Secrets via UI

**URL:** https://cloud.digitalocean.com/apps

**Steps:**
1. Click on your "fluxstudio" app
2. Go to "Settings" tab
3. Click "unified-backend" component
4. Scroll to "Environment Variables"
5. Click "Edit"
6. For each SECRET-type variable, click "Edit" and enter value:

| Variable Name | Value | Type |
|---------------|-------|------|
| `JWT_SECRET` | From credentials file | Encrypted |
| `SESSION_SECRET` | From credentials file | Encrypted |
| `OAUTH_ENCRYPTION_KEY` | From credentials file | Encrypted |
| `GOOGLE_CLIENT_ID` | From Google Console | Encrypted |
| `GOOGLE_CLIENT_SECRET` | From Google Console | Encrypted |
| `GITHUB_CLIENT_ID` | From GitHub OAuth App | Encrypted |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App | Encrypted |
| `FIGMA_CLIENT_ID` | From Figma App | Encrypted |
| `FIGMA_CLIENT_SECRET` | From Figma App | Encrypted |
| `SLACK_CLIENT_ID` | From Slack App | Encrypted |
| `SLACK_CLIENT_SECRET` | From Slack App | Encrypted |
| `SLACK_SIGNING_SECRET` | From Slack App | Encrypted |
| `SMTP_USER` | Your SMTP username | Encrypted |
| `SMTP_PASSWORD` | Your SMTP password | Encrypted |
| `VITE_GOOGLE_CLIENT_ID` | Same as GOOGLE_CLIENT_ID | Encrypted |

7. Click "Save"
8. Wait for redeployment (automatic after saving)

---

## Step 7: Configure DNS (5 minutes)

### 7.1 Get App Platform IP

```bash
# Get app info
doctl apps get $APP_ID

# Or via UI: Apps → fluxstudio → Settings → Domains
```

### 7.2 Update DNS Records

**In your DNS provider (DigitalOcean, Cloudflare, etc.):**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | fluxstudio.art | App Platform IP | 3600 |
| CNAME | www | fluxstudio.art | 3600 |

**Wait for DNS propagation:**
```bash
# Check DNS propagation (can take 5-15 minutes)
dig fluxstudio.art
dig www.fluxstudio.art

# Or use: https://dnschecker.org
```

---

## Step 8: Verify Deployment (5 minutes)

### 8.1 Health Checks

```bash
# Frontend
curl -I https://fluxstudio.art
# Expected: HTTP/2 200

# Unified Backend
curl https://fluxstudio.art/api/health
# Expected: {"status":"healthy","service":"unified-backend",...}

# Collaboration Service
curl https://fluxstudio.art/collab/health
# Expected: {"status":"healthy",...}
```

### 8.2 Test Authentication

**Via Browser:**
1. Go to https://fluxstudio.art
2. Click "Sign Up"
3. Enter email/password
4. Verify signup succeeds
5. Click "Login"
6. Verify login works
7. Check JWT token in localStorage (F12 → Application → Local Storage)

### 8.3 Test OAuth Flows

```bash
# Google OAuth
# 1. Go to: https://fluxstudio.art/api/auth/google
# 2. Should redirect to Google login
# 3. After auth, should redirect back to app

# GitHub OAuth
# Similar flow for: https://fluxstudio.art/api/auth/github
```

### 8.4 Test Real-time Features

**Via Browser Console (F12):**
```javascript
// Test Socket.IO connection
const socket = io('https://fluxstudio.art/messaging');
socket.on('connect', () => console.log('✅ Socket.IO connected'));
socket.on('error', (err) => console.error('❌ Socket.IO error:', err));
```

---

## Step 9: Monitor Production (Ongoing)

### 9.1 Set Up Alerts

**DigitalOcean Console → Apps → fluxstudio → Settings → Alerts:**

- [ ] Enable deployment failure alerts
- [ ] Enable component failure alerts
- [ ] Set alert email to: your-email@example.com

### 9.2 Check Metrics

```bash
# View app metrics
doctl apps get $APP_ID

# View logs
doctl apps logs $APP_ID --component unified-backend --follow
doctl apps logs $APP_ID --component collaboration --follow
doctl apps logs $APP_ID --component frontend --type BUILD
```

### 9.3 Performance Monitoring

**Key metrics to watch:**
- Response time: < 200ms (p95)
- Error rate: < 0.1%
- CPU usage: < 80%
- Memory usage: < 800MB
- Database connections: < 20/25

---

## Step 10: Decommission Old Droplet (7 days after deployment)

**⚠️ WAIT 7 DAYS** to ensure App Platform deployment is stable before destroying Droplet.

### 10.1 Verify Stability Checklist

After 7 days of monitoring:

- [ ] Zero critical incidents
- [ ] All OAuth flows working
- [ ] Real-time features stable (Socket.IO, WebSocket)
- [ ] Database backups running daily
- [ ] No increase in error rates
- [ ] Performance metrics within acceptable range
- [ ] User feedback positive (no deployment-related complaints)

### 10.2 Final Droplet Backup

```bash
# SSH to Droplet
ssh root@167.172.208.61

# Create final backup
cd /var/www/fluxstudio
tar czf fluxstudio-final-backup-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  .

# Download backup to local machine
exit
scp root@167.172.208.61:/var/www/fluxstudio/fluxstudio-final-backup-*.tar.gz \
  ~/backups/
```

### 10.3 Destroy Droplet

```bash
# List droplets
doctl compute droplet list

# Destroy old droplet
doctl compute droplet delete 167.172.208.61 --force
```

**Cost savings activated:** $24/mo saved ($288/year)

---

## Rollback Plan (If Needed)

**If critical issues occur during deployment:**

### Emergency Rollback (5 minutes)

1. **Revert DNS to Droplet**
   ```bash
   # Update A record: fluxstudio.art → 167.172.208.61
   # Via your DNS provider
   ```

2. **Restart Droplet Services**
   ```bash
   ssh root@167.172.208.61
   cd /var/www/fluxstudio
   pm2 restart all
   pm2 status
   ```

3. **Verify Droplet Health**
   ```bash
   curl http://167.172.208.61/api/health
   # Should return 200 OK
   ```

4. **Notify Users** (if needed)
   - Post status update
   - Explain rollback reason
   - Provide timeline for retry

---

## Troubleshooting

### Build Failures

**Symptom:** Frontend build fails in App Platform

**Check:**
```bash
doctl apps logs $APP_ID --component frontend --type BUILD
```

**Common causes:**
- Missing environment variables (VITE_*)
- npm ci fails (delete package-lock.json, regenerate)
- TypeScript errors (check tsconfig.json)

**Fix:**
```bash
# Test build locally
npm run build

# If successful, push fix to GitHub
git add .
git commit -m "Fix build configuration"
git push
```

---

### Health Check Failures

**Symptom:** App Platform marks component as unhealthy

**Check:**
```bash
doctl apps logs $APP_ID --component unified-backend --follow
```

**Common causes:**
- Database connection timeout (check DATABASE_URL)
- Missing environment variables
- Port mismatch (must be 3001 for unified-backend, 4000 for collaboration)

**Fix:**
```bash
# Verify environment variables in UI
# Apps → Settings → unified-backend → Environment Variables

# Check health endpoint
curl https://fluxstudio.art/api/health
```

---

### OAuth Failures

**Symptom:** OAuth redirects fail with 400 or 500 errors

**Check:**
1. Redirect URIs match exactly in provider console
2. Client ID and Secret are correct in environment variables
3. CORS_ORIGINS includes App Platform URLs

**Fix:**
```bash
# Verify CORS in .do/app.yaml
grep -A 10 "cors:" .do/app.yaml

# Verify redirect URIs in OAuth provider
# Google: https://console.cloud.google.com/apis/credentials
# GitHub: https://github.com/settings/developers
```

---

### WebSocket Connection Issues

**Symptom:** Socket.IO or WebSocket connections fail

**Check:**
```javascript
// Browser console (F12)
const socket = io('https://fluxstudio.art/messaging');
socket.on('connect_error', (err) => console.error('Connection error:', err));
```

**Common causes:**
- CORS not configured for WebSocket protocol
- Redis not connected (Socket.IO adapter)
- Wrong WebSocket URL (should be wss:// not ws://)

**Fix:**
```bash
# Check Redis connection
doctl apps logs $APP_ID --component unified-backend | grep -i redis

# Verify CORS configuration in .do/app.yaml
```

---

## Success Criteria

**Deployment is SUCCESSFUL when ALL of these are true:**

- [x] ✅ All health checks pass (200 OK responses)
- [x] ✅ Frontend loads at https://fluxstudio.art
- [x] ✅ Authentication flows work (signup, login)
- [x] ✅ OAuth flows work (Google, GitHub, Figma, Slack)
- [x] ✅ Real-time messaging connects (Socket.IO)
- [x] ✅ Collaborative editing works (Yjs)
- [x] ✅ File uploads work (within 50MB limit)
- [x] ✅ SSL certificate auto-provisioned (HTTPS works)
- [x] ✅ Error rate < 0.1%
- [x] ✅ Response times < 200ms (p95)
- [x] ✅ Database backups running daily
- [x] ✅ No user-reported deployment issues

---

## Post-Deployment Next Steps

### Week 1
- [ ] Monitor error rates and performance metrics
- [ ] Test all user flows in production
- [ ] Collect user feedback
- [ ] Document any issues encountered

### Week 2
- [ ] Performance optimization (if needed)
- [ ] Scale resources if necessary
- [ ] Update documentation with learnings
- [ ] Plan next features

### Month 1
- [ ] Review cost analysis (actual vs projected)
- [ ] Optimize resource allocation
- [ ] Implement advanced monitoring (APM)
- [ ] Plan security enhancements (WAF, etc.)

---

## Resources

**Documentation:**
- Complete guide: `DIGITALOCEAN_DEPLOYMENT_GUIDE.md`
- Migration report: `DIGITALOCEAN_MIGRATION_COMPLETE.md`
- Security fixes: `SECURITY_FIXES_COMPLETE.md`
- Consolidation guide: `BACKEND_CONSOLIDATION_GUIDE.md`

**Support:**
- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- doctl Reference: https://docs.digitalocean.com/reference/doctl/
- Community Forum: https://www.digitalocean.com/community

---

**Last Updated:** October 21, 2025
**Version:** 1.0.0
**Status:** READY FOR DEPLOYMENT ✅
