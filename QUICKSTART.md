# FluxStudio - Quick Start Deployment Guide

**🎉 Your FluxStudio app is ready for DigitalOcean App Platform deployment!**

This guide will get you deployed in **30 minutes**.

---

## Prerequisites

Before you start, make sure you have:

- [ ] DigitalOcean account ([Sign up](https://cloud.digitalocean.com/registrations/new))
- [ ] GitHub account ([Sign up](https://github.com/join))
- [ ] `doctl` CLI installed ([Install](https://docs.digitalocean.com/reference/doctl/how-to/install/))
- [ ] 30-45 minutes of uninterrupted time

---

## Option 1: Automated Setup (Recommended)

### Run the preparation script:

```bash
cd /Users/kentino/FluxStudio
./scripts/prepare-deployment.sh
```

**This script will:**
1. ✅ Update GitHub username in configuration files
2. ✅ Generate production secrets
3. ✅ Validate App Platform spec
4. ✅ Optionally test local build

**After the script completes, follow the "Next Steps" it prints.**

---

## Option 2: Manual Setup

### Step 1: Quick Configuration (2 minutes)

```bash
cd /Users/kentino/FluxStudio

# Replace YOUR_GITHUB_USERNAME in .do/app.yaml
# Your GitHub username: kentin0-fiz0l
sed -i '' 's/YOUR_GITHUB_USERNAME/kentin0-fiz0l/g' .do/app.yaml
```

### Step 2: Generate Secrets (1 minute)

```bash
./scripts/generate-production-secrets.sh > production-credentials-$(date +%Y%m%d).txt
chmod 600 production-credentials-*.txt

# IMPORTANT: Save this file to your password manager!
cat production-credentials-*.txt
```

### Step 3: Create GitHub Repository (2 minutes)

```bash
# Option A: Using GitHub CLI
gh repo create FluxStudio --public --source=. --remote=origin
git push -u origin main

# Option B: Via GitHub web UI
# 1. Go to https://github.com/new
# 2. Repository name: FluxStudio
# 3. Click "Create repository"
# 4. Follow the push instructions
```

### Step 4: Add GitHub Secrets (5 minutes)

Go to: `https://github.com/YOUR_USERNAME/FluxStudio/settings/secrets/actions`

Click "New repository secret" and add:

| Secret Name | Where to get it |
|-------------|-----------------|
| `DIGITALOCEAN_ACCESS_TOKEN` | [DigitalOcean API](https://cloud.digitalocean.com/account/api/tokens) |
| `VITE_GOOGLE_CLIENT_ID` | [Google Console](https://console.cloud.google.com/apis/credentials) |
| `PREVIEW_JWT_SECRET` | From `production-credentials-*.txt` file |

### Step 5: Rotate OAuth Credentials (15 minutes)

**Google OAuth:**
1. Go to [Google Console](https://console.cloud.google.com/apis/credentials)
2. Create new OAuth 2.0 Client ID
3. Add redirect URI: `https://fluxstudio.art/api/auth/google/callback`
4. Save Client ID and Secret

**GitHub OAuth:**
1. Go to [GitHub Settings](https://github.com/settings/developers)
2. New OAuth App
3. Callback URL: `https://fluxstudio.art/api/auth/github/callback`
4. Save Client ID and Secret

**Figma & Slack:** See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md#step-3-rotate-oauth-credentials-20-minutes)

### Step 6: Deploy! (10 minutes)

```bash
cd /Users/kentino/FluxStudio

# Authenticate with DigitalOcean
doctl auth init

# Create app (this takes 5-10 minutes)
doctl apps create --spec .do/app.yaml --wait

# Get your app ID
doctl apps list

# Add secrets via UI (see next step)
```

### Step 7: Add Secrets to App Platform (5 minutes)

1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click your "fluxstudio" app
3. Go to "Settings" → "unified-backend" → "Environment Variables"
4. Add all secrets from `production-credentials-*.txt`
5. Mark each as "Encrypted"
6. Save (triggers automatic redeployment)

### Step 8: Configure DNS (5 minutes)

1. Get your App Platform URL from the DigitalOcean console
2. Update DNS records:
   - A record: `fluxstudio.art` → App Platform IP
   - CNAME: `www` → `fluxstudio.art`
3. Wait 5-15 minutes for DNS propagation

### Step 9: Verify Deployment

```bash
# Health check
curl https://fluxstudio.art/api/health

# Expected response:
# {"status":"healthy","service":"unified-backend",...}

# Visit in browser
open https://fluxstudio.art
```

**✅ If you see the FluxStudio homepage, deployment is successful!**

---

## Troubleshooting

### Build fails
```bash
# Check build logs
doctl apps logs <APP_ID> --component frontend --type BUILD
```

### Health check fails
```bash
# Check runtime logs
doctl apps logs <APP_ID> --component unified-backend --follow
```

### OAuth doesn't work
- Verify redirect URIs match exactly in OAuth provider console
- Check secrets are added correctly in App Platform UI
- Verify CORS_ORIGINS includes your domain

---

## What's Included

This deployment includes:

### ✅ Infrastructure
- **Static Frontend** (FREE) - React SPA with CDN
- **Unified Backend** ($15/mo) - Auth + Messaging
- **Collaboration Service** ($15/mo) - Real-time editing
- **Managed PostgreSQL** ($15/mo) - Database with backups
- **Managed Redis** ($15/mo) - Caching and Socket.IO

**Total: ~$60/month**

### ✅ Features
- User authentication (email/password)
- OAuth login (Google, GitHub, Figma, Slack)
- Real-time messaging (Socket.IO)
- Collaborative editing (Yjs)
- File uploads (up to 50MB)
- SSL/HTTPS (automatic)
- Daily database backups
- Health check monitoring

### ✅ Security
- All credentials encrypted
- SSL/TLS enforced
- Rate limiting enabled
- CORS configured
- JWT with 1-hour expiry
- File upload restrictions

---

## Documentation

### Essential Reading
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment guide
- **[DIGITALOCEAN_DEPLOYMENT_GUIDE.md](DIGITALOCEAN_DEPLOYMENT_GUIDE.md)** - Comprehensive guide
- **[SECURITY_FIXES_COMPLETE.md](SECURITY_FIXES_COMPLETE.md)** - Security audit report

### Reference
- **[BACKEND_CONSOLIDATION_GUIDE.md](BACKEND_CONSOLIDATION_GUIDE.md)** - Architecture details
- **[DIGITALOCEAN_MIGRATION_COMPLETE.md](DIGITALOCEAN_MIGRATION_COMPLETE.md)** - Migration report

---

## Architecture Overview

```
┌────────────────────────────────────────────────┐
│  DigitalOcean App Platform                     │
│                                                 │
│  Frontend (Static)  →  CDN  →  Users           │
│       ↓                                         │
│  Unified Backend (Node.js)                     │
│    - Authentication                             │
│    - Messaging                                  │
│    - Socket.IO (/auth, /messaging)             │
│       ↓                                         │
│  Collaboration Service (Node.js)               │
│    - Yjs CRDT                                  │
│    - WebSocket                                 │
│       ↓                                         │
│  PostgreSQL + Redis (Managed)                  │
└────────────────────────────────────────────────┘
```

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

**Savings vs 3-service architecture:** $15/mo = $180/year

---

## Next Steps After Deployment

### Week 1
- [ ] Monitor error rates and performance
- [ ] Test all user flows in production
- [ ] Collect user feedback

### Week 2
- [ ] Performance optimization (if needed)
- [ ] Update documentation with learnings
- [ ] Plan next features

### Month 1
- [ ] Review cost analysis (actual vs projected)
- [ ] Implement advanced monitoring (APM)
- [ ] Plan security enhancements (WAF)

---

## Support

**Need help?**

1. Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) troubleshooting section
2. Review [DigitalOcean Docs](https://docs.digitalocean.com/products/app-platform/)
3. Ask in [DigitalOcean Community](https://www.digitalocean.com/community)

**Found a bug?**
- Check the logs: `doctl apps logs <APP_ID> --follow`
- Review health status: `curl https://fluxstudio.art/api/health`

---

## Success Criteria

**Your deployment is successful when:**

- ✅ Frontend loads at https://fluxstudio.art
- ✅ Health check returns 200 OK
- ✅ User signup/login works
- ✅ OAuth flows work (Google, GitHub, etc.)
- ✅ Real-time messaging connects
- ✅ SSL certificate is active (HTTPS)
- ✅ No errors in application logs

---

**Ready to deploy? Start with:**

```bash
./scripts/prepare-deployment.sh
```

**Good luck! 🚀**

---

**Last Updated:** October 21, 2025
**Status:** PRODUCTION READY ✅
