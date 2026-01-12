# Google OAuth Credential Rotation Guide

**Status:** In Progress
**Priority:** P0 - CRITICAL
**Estimated Time:** 15-20 minutes

---

## Why This Is Critical

The current Google OAuth Client ID is **exposed in the repository**:
```
EXPOSED: 65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb
```

**Risks:**
- Attackers can impersonate your application
- OAuth tokens can be stolen
- User accounts can be compromised
- Violates Google's OAuth security policies

---

## Prerequisites

- Access to Google Cloud Console
- SSH access to production server (root@167.172.208.61)
- Terminal access to run deployment script

---

## Step-by-Step Instructions

### Step 1: Access Google Cloud Console (2 minutes)

1. Open: **https://console.cloud.google.com/apis/credentials**
2. Select your FluxStudio project
3. Navigate to "Credentials" tab

### Step 2: Delete Exposed Credential (1 minute)

1. Find OAuth 2.0 Client ID: `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb`
2. Click the **trash/delete icon** (⚠️ This will invalidate all existing OAuth sessions)
3. Confirm deletion

### Step 3: Create New OAuth 2.0 Client ID (5 minutes)

#### Click "+ CREATE CREDENTIALS" → "OAuth client ID"

**Configuration:**

| Field | Value |
|-------|-------|
| Application type | Web application |
| Name | FluxStudio Production |

**Authorized JavaScript origins:**
```
https://fluxstudio.art
https://www.fluxstudio.art
http://localhost:5173
http://localhost:3000
```

**Authorized redirect URIs:**
```
https://fluxstudio.art/api/auth/google/callback
https://www.fluxstudio.art/api/auth/google/callback
http://localhost:5173/api/auth/google/callback
http://localhost:3000/api/auth/google/callback
```

#### Click "CREATE"

**IMPORTANT:** Copy and save both:
- ✅ Client ID (format: `123456789-abc123xyz.apps.googleusercontent.com`)
- ✅ Client Secret (format: random string like `GOCSPX-Abc123Xyz456...`)

---

### Step 4: Run Automated Update Script (5 minutes)

Open terminal in FluxStudio directory:

```bash
cd /Users/kentino/FluxStudio
./scripts/update-oauth-credentials.sh
```

The script will:
1. ✅ Prompt you for new Client ID and Secret
2. ✅ Backup current production environment
3. ✅ Update production `.env.production`
4. ✅ Update local `.env.production.new`
5. ✅ Rebuild frontend with new credentials
6. ✅ Deploy updated frontend to production
7. ✅ Restart authentication service

**Expected Output:**
```
🔐 Google OAuth Credential Rotation
====================================

Please enter your NEW Google OAuth credentials:

Google Client ID: [paste your new Client ID]
Google Client Secret: [paste your new Secret]

📝 Summary:
  Client ID: 123456789-abc123...
  Secret: GOCSPX-Abc123...

Update production with these credentials? (y/N) y

🔄 Step 1: Backup current production environment
✓ Backup created: .env.production.backup-20251013_160000

🔄 Step 2: Update Google OAuth credentials on production server
✓ Production environment updated

🔄 Step 3: Update local .env.production.new file
✓ Local environment file updated

🔄 Step 4: Rebuild frontend with new OAuth Client ID
✓ Frontend rebuilt

🔄 Step 5: Deploy updated frontend to production
✓ Frontend deployed

🔄 Step 6: Restart authentication service
✓ Authentication service restarted

✅ Google OAuth credentials successfully rotated!
```

---

### Step 5: Verify and Test (5 minutes)

#### A. Check Service Status
```bash
ssh root@167.172.208.61 "pm2 status"
```

Expected: All services **online** with 0 restarts

#### B. Check Logs for Errors
```bash
ssh root@167.172.208.61 "pm2 logs flux-auth --lines 50"
```

Look for: No OAuth errors, clean startup

#### C. Test Google Sign-In

1. Open **https://fluxstudio.art/login**
2. Click **"Sign in with Google"**
3. Complete OAuth flow
4. Verify successful login and redirect to dashboard

**Test Cases:**
- ✅ OAuth popup opens correctly
- ✅ Google consent screen shows correct app name
- ✅ User can authorize successfully
- ✅ Redirects to dashboard after login
- ✅ User profile data loads correctly

---

## Manual Method (If Script Fails)

### Update Production Server Directly

```bash
# SSH to production
ssh root@167.172.208.61

# Navigate to app directory
cd /var/www/fluxstudio

# Backup current environment
cp .env.production .env.production.backup-$(date +%Y%m%d_%H%M%S)

# Edit environment file
nano .env.production

# Update these three lines:
GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET
VITE_GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID

# Save and exit (Ctrl+X, Y, Enter)

# Restart authentication service
pm2 restart flux-auth

# Verify service is running
pm2 status
```

### Rebuild and Deploy Frontend

```bash
# On local machine
cd /Users/kentino/FluxStudio

# Update local environment
nano .env.production.new
# (Update the same three variables)

# Rebuild frontend
npm run build

# Deploy to production
rsync -az --delete build/ root@167.172.208.61:/var/www/fluxstudio/build/
```

---

## Verification Checklist

After rotation, verify all checkboxes:

### Backend
- [ ] Production `.env.production` updated with new credentials
- [ ] Authentication service restarted successfully (no crash loops)
- [ ] No OAuth errors in logs: `pm2 logs flux-auth --lines 50`
- [ ] Health check passing: `curl https://fluxstudio.art/health`

### Frontend
- [ ] Frontend rebuilt with new `VITE_GOOGLE_CLIENT_ID`
- [ ] Updated build deployed to production
- [ ] No console errors when loading login page
- [ ] Google Sign-In button renders correctly

### OAuth Flow
- [ ] Google Sign-In popup opens
- [ ] Consent screen shows correct app name
- [ ] Authorization succeeds
- [ ] Redirects to dashboard
- [ ] User profile loads

### Security
- [ ] Old Client ID deleted from Google Cloud Console
- [ ] Backup of old `.env.production` created
- [ ] New credentials not committed to git
- [ ] `.env.production` in `.gitignore`

---

## Rollback Plan (If Issues Occur)

### Immediate Rollback

```bash
# SSH to production
ssh root@167.172.208.61
cd /var/www/fluxstudio

# Restore previous environment
LATEST_BACKUP=$(ls -t .env.production.backup-* | head -1)
cp $LATEST_BACKUP .env.production

# Restart service
pm2 restart flux-auth

# Verify
pm2 logs flux-auth --lines 20
```

### Re-enable Old Credentials

1. Go back to Google Cloud Console
2. Re-create OAuth Client ID with **exact same settings** as before
3. Use the **new** Client ID and Secret (old ones are gone)
4. Update production environment
5. Restart services

---

## Troubleshooting

### Issue: "redirect_uri_mismatch" Error

**Cause:** Redirect URIs not configured in Google Cloud Console

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add missing redirect URI to "Authorized redirect URIs" list
4. Save and try again (may take 5 minutes to propagate)

### Issue: "invalid_client" Error

**Cause:** Client Secret mismatch or not properly escaped

**Fix:**
1. Verify Client Secret in `.env.production` matches Google Cloud Console
2. Check for special characters that need escaping
3. Restart authentication service: `pm2 restart flux-auth`

### Issue: Authentication Service Crash Loop

**Cause:** Malformed environment variable

**Fix:**
```bash
# Check logs for specific error
ssh root@167.172.208.61 "pm2 logs flux-auth --err --lines 50"

# Common issues:
# - Missing quotes around secret with special chars
# - Typo in Client ID format
# - Environment variable not loaded

# Rollback and verify credentials
```

### Issue: Frontend Still Shows Old Client ID

**Cause:** Frontend not rebuilt or deployed with new `VITE_GOOGLE_CLIENT_ID`

**Fix:**
```bash
# Local machine
cd /Users/kentino/FluxStudio
npm run build
rsync -az --delete build/ root@167.172.208.61:/var/www/fluxstudio/build/

# Clear browser cache and hard refresh
```

---

## Post-Rotation Tasks

### Immediate (Within 1 hour)
- [ ] Test Google Sign-In on production
- [ ] Monitor error logs for OAuth issues
- [ ] Verify user authentication works
- [ ] Check PM2 service stability

### Same Day
- [ ] Remove old credentials from any local `.env` files
- [ ] Update team documentation with new setup
- [ ] Notify team that users will need to re-authenticate
- [ ] Monitor support channels for user issues

### Within 1 Week
- [ ] Verify all OAuth-related features working
- [ ] Check analytics for authentication success rate
- [ ] Review security logs for any anomalies
- [ ] Document lessons learned

---

## Security Best Practices

### DO ✅
- Store credentials in environment variables only
- Use `.env.example` files with placeholder values
- Add `.env*` to `.gitignore` (except `.env.example`)
- Rotate credentials every 90 days
- Use different credentials for dev/staging/production
- Enable OAuth consent screen verification

### DON'T ❌
- Never commit `.env` files to git
- Never share credentials in Slack/email
- Never use production credentials locally
- Never log credentials (even partial)
- Never use the same credentials across environments

---

## Additional Resources

- **Google OAuth 2.0 Docs:** https://developers.google.com/identity/protocols/oauth2
- **OAuth Consent Screen Setup:** https://console.cloud.google.com/apis/credentials/consent
- **FluxStudio Auth Code:** `/Users/kentino/FluxStudio/server-auth.js` (lines 524-629)
- **Frontend OAuth Integration:** `/Users/kentino/FluxStudio/src/hooks/useGoogleOAuth.tsx`

---

## Support

If you encounter issues during rotation:

1. **Check logs first:**
   ```bash
   ssh root@167.172.208.61 "pm2 logs flux-auth --lines 100"
   ```

2. **Verify environment variables loaded:**
   ```bash
   ssh root@167.172.208.61 "cd /var/www/fluxstudio && pm2 restart flux-auth --update-env && pm2 logs flux-auth --lines 20"
   ```

3. **Test OAuth endpoint directly:**
   ```bash
   curl -v https://fluxstudio.art/api/auth/google
   ```

4. **Rollback if critical:**
   See "Rollback Plan" section above

---

**Last Updated:** 2025-10-13
**Next Rotation Due:** 2026-01-13 (90 days)
