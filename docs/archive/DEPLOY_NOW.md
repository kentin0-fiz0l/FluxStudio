# 🚀 Deploy FluxStudio NOW - 15 Minute Guide

**Your code is ready!** Commit `8fcf1dc` contains all deployment files.

---

## Step 1: Create GitHub Repository (2 minutes)

### Option A: Web UI (Easiest)

1. **Open**: https://github.com/new

2. **Fill in**:
   - Repository name: `FluxStudio`
   - Description: `Creative design collaboration platform`
   - Visibility: **Public**
   - ❌ DO NOT check "Add a README file"
   - ❌ DO NOT check "Add .gitignore"
   - ❌ DO NOT check "Choose a license"

3. **Click**: "Create repository"

4. **Copy the SSH URL** shown on the next page:
   ```
   git@github.com:kentin0-fiz0l/FluxStudio.git
   ```

### Then run these commands:

```bash
cd /Users/kentino/FluxStudio

# Remove old remote
git remote remove origin 2>/dev/null || true

# Add new remote
git remote add origin git@github.com:kentin0-fiz0l/FluxStudio.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main
```

**✅ Verify**: Visit https://github.com/kentin0-fiz0l/FluxStudio

---

## Step 2: Deploy to DigitalOcean (5 minutes)

### Authenticate with DigitalOcean:

```bash
doctl auth init
```

When prompted, enter your DigitalOcean API token from:
https://cloud.digitalocean.com/account/api/tokens

### Validate and Deploy:

```bash
# Validate app spec
doctl apps validate-spec .do/app.yaml

# Create the app (takes 5-10 minutes)
doctl apps create --spec .do/app.yaml --wait
```

**This creates:**
- ✅ Static Frontend (FREE)
- ✅ Unified Backend ($15/mo)
- ✅ Collaboration Service ($15/mo)
- ✅ PostgreSQL Database ($15/mo)
- ✅ Redis Cache ($15/mo)

**Total: $60/month**

---

## Step 3: Add Secrets (5 minutes)

### Get your App ID:

```bash
doctl apps list
```

### Open App Platform UI:

```bash
# Replace APP_ID with your actual app ID
open "https://cloud.digitalocean.com/apps/APP_ID/settings"
```

### Add these secrets from `production-credentials-20251021-104926.txt`:

Go to: **Settings** → **unified-backend** → **Environment Variables**

Click "Edit" and add each secret as **Encrypted**:

| Variable Name | Value from credentials file |
|---------------|----------------------------|
| `JWT_SECRET` | Copy from file |
| `SESSION_SECRET` | Copy from file |
| `OAUTH_ENCRYPTION_KEY` | Copy from file |

### Add OAuth credentials:

You need to create OAuth apps first (see Step 4), then add:

| Variable Name | Get from OAuth provider |
|---------------|------------------------|
| `GOOGLE_CLIENT_ID` | Google Console |
| `GOOGLE_CLIENT_SECRET` | Google Console |
| `GITHUB_CLIENT_ID` | GitHub Settings |
| `GITHUB_CLIENT_SECRET` | GitHub Settings |
| `FIGMA_CLIENT_ID` | Figma Developer |
| `FIGMA_CLIENT_SECRET` | Figma Developer |
| `SLACK_CLIENT_ID` | Slack API |
| `SLACK_CLIENT_SECRET` | Slack API |
| `SLACK_SIGNING_SECRET` | Slack API |

### Add SMTP credentials:

| Variable Name | Value |
|---------------|-------|
| `SMTP_USER` | Your email address |
| `SMTP_PASSWORD` | Your email app password |

**Click "Save"** - This triggers automatic redeployment.

---

## Step 4: Configure OAuth Providers (10 minutes)

### Get your App Platform URL:

```bash
doctl apps list --format DefaultIngress
```

Or find it in the DigitalOcean UI.

Example: `https://fluxstudio-abc123.ondigitalocean.app`

### Google OAuth:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URI: `https://YOUR_APP_URL/api/auth/google/callback`
5. Copy Client ID and Secret → Add to App Platform

### GitHub OAuth:

1. Go to: https://github.com/settings/developers
2. New OAuth App
3. Authorization callback URL: `https://YOUR_APP_URL/api/auth/github/callback`
4. Copy Client ID and Secret → Add to App Platform

### Figma OAuth:

1. Go to: https://www.figma.com/developers/apps
2. Create new app
3. OAuth callback URL: `https://YOUR_APP_URL/api/integrations/figma/callback`
4. Copy Client ID and Secret → Add to App Platform

### Slack OAuth:

1. Go to: https://api.slack.com/apps
2. Create new app
3. OAuth & Permissions → Redirect URL: `https://YOUR_APP_URL/api/integrations/slack/callback`
4. Copy Client ID, Client Secret, and Signing Secret → Add to App Platform

---

## Step 5: Verify Deployment (2 minutes)

### Check health endpoint:

```bash
# Replace with your actual app URL
curl https://YOUR_APP_URL/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "unified-backend",
  "timestamp": "2025-10-21T...",
  "services": ["auth", "messaging"]
}
```

### Visit your app:

```bash
open https://YOUR_APP_URL
```

**✅ Success criteria:**
- Frontend loads with FluxStudio UI
- Health check returns 200 OK
- No errors in browser console

---

## Step 6: Configure Custom Domain (Optional - 5 minutes)

### In DigitalOcean UI:

1. Go to: App Platform → Settings → Domains
2. Click "Add Domain"
3. Enter: `fluxstudio.art`
4. Follow DNS configuration instructions

### Update your DNS provider:

Add these records:
- **A Record**: `@` → App Platform IP
- **CNAME**: `www` → `fluxstudio.art`

Wait 5-15 minutes for DNS propagation.

---

## Monitoring & Logs

### View deployment logs:

```bash
# Get your app ID
APP_ID=$(doctl apps list --format ID --no-header)

# Follow logs for unified backend
doctl apps logs $APP_ID --component unified-backend --follow

# Follow logs for collaboration service
doctl apps logs $APP_ID --component collaboration --follow
```

### Check deployment status:

```bash
doctl apps get $APP_ID
```

---

## Troubleshooting

### Build fails:

```bash
doctl apps logs $APP_ID --component frontend --type BUILD
```

### Health check fails:

```bash
doctl apps logs $APP_ID --component unified-backend --follow
```

### OAuth doesn't work:

- Verify redirect URIs match exactly in provider console
- Check secrets are added correctly (not truncated)
- Verify CORS_ORIGINS includes your domain

---

## Quick Command Reference

```bash
# List apps
doctl apps list

# Get app details
doctl apps get APP_ID

# View logs
doctl apps logs APP_ID --follow

# Update app spec
doctl apps update APP_ID --spec .do/app.yaml

# Delete app
doctl apps delete APP_ID
```

---

## Documentation

- **QUICKSTART.md** - 30-minute comprehensive guide
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step checklist
- **DIGITALOCEAN_DEPLOYMENT_GUIDE.md** - Complete reference
- **SECURITY_FIXES_COMPLETE.md** - Security audit
- **BACKEND_CONSOLIDATION_GUIDE.md** - Architecture details

---

## Cost Breakdown

| Component | Monthly Cost |
|-----------|--------------|
| Static Site | FREE |
| Unified Backend | $15 |
| Collaboration | $15 |
| PostgreSQL | $15 |
| Redis | $15 |
| **Total** | **$60/mo** |

**Savings:** $15/mo compared to 3-service architecture

---

## Success! 🎉

When everything is deployed:

✅ Frontend at https://YOUR_APP_URL
✅ Health check returns 200 OK
✅ User signup/login works
✅ OAuth flows work
✅ Real-time messaging connects
✅ SSL certificate active
✅ No errors in logs

---

**Questions?** Check the troubleshooting sections in:
- DEPLOYMENT_CHECKLIST.md
- DIGITALOCEAN_DEPLOYMENT_GUIDE.md

**Ready to deploy? Start here:**

```bash
./scripts/create-github-repo.sh
```

Or follow Step 1 above manually.

---

**Last Updated:** October 21, 2025
**Commit:** 8fcf1dc
**Status:** READY TO DEPLOY ✅
