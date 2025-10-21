# Google OAuth Credential Rotation Guide
**Status:** 🔴 CRITICAL - IMMEDIATE ACTION REQUIRED
**Estimated Time:** 30 minutes
**Date:** October 14, 2025

---

## Why This Is Critical

The current Google OAuth Client ID (`65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb`) has been **exposed in git history** and must be rotated immediately to prevent unauthorized access.

**Exposed in commit:** 398c287 (October 11, 2025)

---

## Prerequisites

Before starting, ensure you have:
- [ ] Access to Google Cloud Console
- [ ] Project owner or OAuth admin permissions
- [ ] .env.production backup created ✅ (already done)
- [ ] New credentials generated ✅ (already done)

---

## Step-by-Step Rotation

### Step 1: Access Google Cloud Console (2 minutes)

1. **Navigate to Google Cloud Console:**
   ```
   https://console.cloud.google.com
   ```

2. **Select your project:**
   - Look for "FluxStudio" or your project name in the dropdown
   - If you don't see it, click "Select a project" at the top

3. **Navigate to OAuth credentials:**
   ```
   Navigation menu → APIs & Services → Credentials
   ```

   Or direct link:
   ```
   https://console.cloud.google.com/apis/credentials
   ```

---

### Step 2: Delete Old OAuth Client (3 minutes)

1. **Find the exposed OAuth Client ID:**
   - Look for: `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb`
   - It should be listed under "OAuth 2.0 Client IDs"

2. **Document the old configuration (IMPORTANT):**
   - **Application type:** Web application
   - **Name:** (note the name)
   - **Authorized JavaScript origins:**
     - `https://fluxstudio.art`
     - `https://www.fluxstudio.art`
     - `http://localhost:5173` (for development)

   - **Authorized redirect URIs:**
     - `https://fluxstudio.art/api/auth/google/callback`
     - `https://www.fluxstudio.art/api/auth/google/callback`
     - `http://localhost:3001/api/auth/google/callback` (for development)

3. **Delete the old client:**
   - Click the trash icon next to the OAuth Client ID
   - Confirm deletion

⚠️ **WARNING:** Existing users will be logged out after deletion

---

### Step 3: Create New OAuth Client (5 minutes)

1. **Click "Create Credentials" → "OAuth client ID"**

2. **Select Application Type:**
   - Choose: **Web application**

3. **Enter Name:**
   ```
   FluxStudio Production OAuth (Rotated Oct 2025)
   ```

4. **Configure Authorized JavaScript origins:**
   ```
   https://fluxstudio.art
   https://www.fluxstudio.art
   http://localhost:5173
   ```

5. **Configure Authorized redirect URIs:**
   ```
   https://fluxstudio.art/api/auth/google/callback
   https://www.fluxstudio.art/api/auth/google/callback
   http://localhost:3001/api/auth/google/callback
   ```

6. **Click "Create"**

---

### Step 4: Copy New Credentials (2 minutes)

You'll see a popup with your new credentials:

```
Your Client ID:
[NEW_CLIENT_ID]

Your Client Secret:
[NEW_CLIENT_SECRET]
```

**IMPORTANT:** Copy these immediately - you won't be able to see the secret again!

---

### Step 5: Update .env.production (3 minutes)

1. **Open .env.production:**
   ```bash
   cd /Users/kentino/FluxStudio
   nano .env.production
   ```

2. **Update the OAuth credentials:**

   Find these lines:
   ```bash
   GOOGLE_CLIENT_ID=65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   VITE_GOOGLE_CLIENT_ID=65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com
   ```

   Replace with:
   ```bash
   GOOGLE_CLIENT_ID=[YOUR_NEW_CLIENT_ID]
   GOOGLE_CLIENT_SECRET=[YOUR_NEW_CLIENT_SECRET]
   VITE_GOOGLE_CLIENT_ID=[YOUR_NEW_CLIENT_ID]
   ```

3. **Save and exit:**
   - Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 6: Update Development Environment (3 minutes)

If you have a local `.env` or `.env.local` file:

1. **Update .env.local:**
   ```bash
   nano .env.local
   ```

2. **Update the same OAuth credentials**

3. **Save and exit**

---

### Step 7: Restart Services (5 minutes)

**On Production Server:**
```bash
# SSH into production server
ssh root@167.172.208.61

# Navigate to app directory
cd /var/www/fluxstudio

# Update .env.production with new credentials
nano .env.production

# Restart all services
pm2 restart all

# Verify services are running
pm2 status

# Check logs for any OAuth errors
pm2 logs --lines 50
```

**On Local Development:**
```bash
# Restart development servers
npm run dev
```

---

### Step 8: Verify OAuth Works (5 minutes)

1. **Test Google Sign-In:**
   - Go to: https://fluxstudio.art
   - Click "Sign in with Google"
   - Complete the OAuth flow
   - Verify you can log in successfully

2. **Test on Development:**
   - Go to: http://localhost:5173
   - Click "Sign in with Google"
   - Verify OAuth works locally

3. **Check for errors:**
   ```bash
   # On production
   pm2 logs server-auth

   # Look for OAuth-related errors
   ```

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Solution:** Check that redirect URIs in Google Cloud Console match exactly:
```
https://fluxstudio.art/api/auth/google/callback
```

**Common mistakes:**
- Missing `/callback`
- HTTP instead of HTTPS
- Wrong port number
- Trailing slash

### Error: "invalid_client"

**Solution:** Check that Client ID and Secret are correctly copied:
- No extra spaces
- No newlines
- Complete value copied

### Users Can't Log In

**Expected behavior after rotation:**
- Existing sessions will be invalidated
- Users need to log in again with Google
- No data is lost

**If users still can't log in:**
1. Check OAuth consent screen is published
2. Verify authorized domains include `fluxstudio.art`
3. Check redirect URIs are correct

---

## Security Checklist

After rotation, verify:

- [ ] Old OAuth Client ID deleted from Google Cloud Console
- [ ] New credentials in .env.production
- [ ] New credentials in .env.local (if applicable)
- [ ] Production services restarted
- [ ] Google Sign-In works on production
- [ ] Google Sign-In works on development
- [ ] No OAuth errors in logs
- [ ] Old Client ID removed from git history (next step)

---

## Next Step: Remove from Git History

After OAuth rotation is complete and verified, proceed to:

```bash
cd /Users/kentino/FluxStudio
./scripts/remove-env-from-git.sh
```

**⚠️ WARNING:** This rewrites git history - coordinate with team first!

---

## Credentials Reference

**New Credentials Location:**
- Production: `/Users/kentino/FluxStudio/.env.production`
- Backup: `/Users/kentino/FluxStudio/security/backups/.env.production.backup.[timestamp]`

**New Credentials Generated:**
```
JWT_SECRET: 720630e2126867ec9663bfffbd643595ea20d10133bf880659f8ad6bbaf611af473feb47b04e9f8a124c43d301bba06697c5fae5a13b8dec0932f0319cc3b2d2
DB_PASSWORD: s9XlLhIX0QhBH1WJVrj5zsaJX4w372V+
REDIS_PASSWORD: pQGGljnTBtAGzky1RkuUSkiS3p8J5I0uV2QltV9Tcpw=
GRAFANA_PASSWORD: dQfZ863CUNCgtHQo+W79GQ==
SMTP_PASSWORD: kXtUB47/Zd3gQjJloOKTxw==
```

**Google OAuth:**
- Client ID: [TO BE FILLED AFTER ROTATION]
- Client Secret: [TO BE FILLED AFTER ROTATION]

---

## Timeline

| Step | Duration | Status |
|------|----------|--------|
| Access Google Cloud Console | 2 min | Pending |
| Delete old OAuth client | 3 min | Pending |
| Create new OAuth client | 5 min | Pending |
| Copy new credentials | 2 min | Pending |
| Update .env.production | 3 min | Pending |
| Update dev environment | 3 min | Pending |
| Restart services | 5 min | Pending |
| Verify OAuth works | 5 min | Pending |
| **TOTAL** | **28 min** | 0% |

---

## Emergency Rollback

If OAuth rotation causes issues:

1. **Restore from backup:**
   ```bash
   cp security/backups/.env.production.backup.[timestamp] .env.production
   ```

2. **Recreate old OAuth client in Google Cloud Console:**
   - Use the old Client ID if possible (may not be available)
   - Or create new one and update .env.production

3. **Restart services:**
   ```bash
   pm2 restart all
   ```

⚠️ **Note:** Old OAuth Client ID was already exposed, so rollback should only be temporary!

---

## Support

**Questions?** Contact:
- Security Lead: [Assign]
- Infrastructure: [Assign]
- Google Cloud Admin: [Assign]

**Google Cloud Support:**
- Documentation: https://developers.google.com/identity/protocols/oauth2
- Support Console: https://console.cloud.google.com/support

---

**Document Version:** 1.0
**Created:** October 14, 2025
**Status:** 📋 READY TO EXECUTE
**Estimated Time:** 30 minutes
