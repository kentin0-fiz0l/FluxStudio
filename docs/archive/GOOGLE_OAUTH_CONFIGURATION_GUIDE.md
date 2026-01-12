# Google OAuth Configuration Guide for FluxStudio

**Date:** 2025-10-15
**Status:** Configuration Required
**Issue:** "[GSI_LOGGER]: The given client ID is not found"

## Current Configuration

### Environment Variables (Production)
```bash
GOOGLE_CLIENT_ID=65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret  # ⚠️ Placeholder value
VITE_GOOGLE_CLIENT_ID=65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com
```

### Frontend Configuration
- **File:** `src/config/environment.ts`
- **Hardcoded Fallback:** `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com`
- **Hook:** `src/hooks/useGoogleOAuth.ts`
- **Manager:** `src/services/GoogleOAuthManager.ts`

## Problem Analysis

The error "[GSI_LOGGER]: The given client ID is not found" indicates one or more of these issues:

### 1. Client ID Doesn't Exist
- The OAuth client may have been deleted from Google Cloud Console
- The client ID might be from a different GCP project
- The project might have been deleted or suspended

### 2. Domain Not Authorized
The following domains must be authorized in Google Cloud Console:

**Required JavaScript Origins:**
- `https://fluxstudio.art`
- `https://www.fluxstudio.art`
- `https://staging.fluxstudio.art` (if using staging)

**Required Redirect URIs:**
- `https://fluxstudio.art`
- `https://fluxstudio.art/login`
- `https://fluxstudio.art/signup`

### 3. OAuth Consent Screen Not Configured
- App name, support email, and developer contact must be configured
- User type (Internal vs External) must be selected
- Scopes must be configured (email, profile)

### 4. API Not Enabled
- Google Identity Services API must be enabled
- OAuth 2.0 API must be enabled

## Step-by-Step Fix

### Step 1: Access Google Cloud Console

1. Go to https://console.cloud.google.com
2. Sign in with the Google account that manages FluxStudio
3. Select the correct project (or create a new one)

### Step 2: Verify OAuth Client Exists

1. Navigate to: **APIs & Services** → **Credentials**
2. Look for OAuth 2.0 Client ID with ID: `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb`

**If found:**
- Click on the client ID to edit
- Continue to Step 3

**If not found:**
- Create a new OAuth 2.0 Client ID
- Type: Web application
- Name: FluxStudio Production
- Continue to Step 3

### Step 3: Configure Authorized JavaScript Origins

Add the following origins:
```
https://fluxstudio.art
https://www.fluxstudio.art
```

For staging/development (optional):
```
https://staging.fluxstudio.art
http://localhost:5173
http://localhost:3000
```

### Step 4: Configure Authorized Redirect URIs

Add the following redirect URIs:
```
https://fluxstudio.art
https://fluxstudio.art/login
https://fluxstudio.art/signup
https://fluxstudio.art/auth/callback
```

### Step 5: Configure OAuth Consent Screen

1. Navigate to: **APIs & Services** → **OAuth consent screen**
2. Configure the following:

**App Information:**
- App name: `FluxStudio`
- User support email: [your email]
- App logo: Upload FluxStudio logo
- App domain: `fluxstudio.art`
- Authorized domains: `fluxstudio.art`

**Developer Contact:**
- Email addresses: [your email]

**Scopes:**
- `/auth/userinfo.email`
- `/auth/userinfo.profile`
- `openid`

**Publishing Status:**
- For production: Click "Publish App"
- For testing: Add test users

### Step 6: Enable Required APIs

1. Navigate to: **APIs & Services** → **Library**
2. Search for and enable:
   - Google Identity Services API
   - Google OAuth2 API
   - Google Sign-In API (if available)

### Step 7: Update Environment Variables

If you created a new OAuth client, update the production `.env`:

```bash
ssh root@167.172.208.61
cd /var/www/fluxstudio
nano .env
```

Update:
```bash
GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_NEW_CLIENT_SECRET
VITE_GOOGLE_CLIENT_ID=YOUR_NEW_CLIENT_ID
```

Restart services:
```bash
pm2 restart flux-auth
```

### Step 8: Test Google OAuth

1. Clear browser cache
2. Navigate to https://fluxstudio.art/login
3. Click "Sign in with Google"
4. Verify the sign-in flow works

## Alternative: Create New OAuth Client

If the existing client ID is problematic, create a fresh one:

### Create New OAuth Client

1. **Navigate to Credentials**
   - Go to: APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"

2. **Configure Web Application**
   ```
   Application type: Web application
   Name: FluxStudio Production OAuth

   Authorized JavaScript origins:
   - https://fluxstudio.art
   - https://www.fluxstudio.art

   Authorized redirect URIs:
   - https://fluxstudio.art
   - https://fluxstudio.art/login
   - https://fluxstudio.art/signup
   ```

3. **Save and Copy Credentials**
   - Copy Client ID
   - Copy Client Secret
   - Download JSON (backup)

4. **Update Production Environment**
   ```bash
   # SSH to production
   ssh root@167.172.208.61

   # Update .env
   cd /var/www/fluxstudio
   nano .env
   # Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

   # Restart services
   pm2 restart flux-auth
   ```

5. **Update Frontend Code** (Optional)

   If you want to remove the hardcoded fallback:

   Edit `src/config/environment.ts` line 33:
   ```typescript
   GOOGLE_CLIENT_ID: getEnvVar('VITE_GOOGLE_CLIENT_ID', 'YOUR_NEW_CLIENT_ID'),
   ```

   Rebuild and deploy:
   ```bash
   npm run build
   rsync -avz build/ root@167.172.208.61:/var/www/fluxstudio/build/
   ```

## Verification Checklist

After configuration, verify:

- [ ] Client ID exists in Google Cloud Console
- [ ] `https://fluxstudio.art` is in Authorized JavaScript origins
- [ ] Redirect URIs include production URLs
- [ ] OAuth consent screen is configured
- [ ] App is published (or test users added)
- [ ] Required APIs are enabled
- [ ] Environment variables are updated
- [ ] Services restarted
- [ ] Browser cache cleared
- [ ] Google Sign-In button appears on login page
- [ ] Sign-in flow completes successfully
- [ ] User data is returned correctly

## Troubleshooting

### Error: "The given client ID is not found"

**Possible causes:**
1. Client ID doesn't exist → Create new client
2. Wrong GCP project selected → Switch to correct project
3. Client ID typo in environment → Verify exact match
4. API not enabled → Enable Google Identity Services API

### Error: "Invalid origin for the client"

**Solution:**
- Add `https://fluxstudio.art` to Authorized JavaScript origins
- Remove trailing slashes from origins
- Wait 5-10 minutes for changes to propagate

### Error: "Access blocked: FluxStudio has not completed..."

**Solution:**
- Configure OAuth consent screen completely
- Add all required information
- Publish the app (or add test users)

### Error: "redirect_uri_mismatch"

**Solution:**
- Add the exact redirect URI to the OAuth client
- URIs must match exactly (including protocol and path)
- No trailing slashes

### Button doesn't appear

**Debug steps:**
1. Open browser console
2. Check for errors
3. Verify Google GSI library loaded: `window.google`
4. Check client ID in network requests
5. Verify API enabled in GCP

## Security Best Practices

### 1. Use Environment Variables
Never hardcode credentials in source code (except as fallbacks).

### 2. Separate Clients for Environments
```
Development: [dev-client-id].apps.googleusercontent.com
Staging:     [staging-client-id].apps.googleusercontent.com
Production:  [prod-client-id].apps.googleusercontent.com
```

### 3. Restrict Origins
Only add necessary origins. Don't add wildcard domains.

### 4. Rotate Secrets Regularly
Change OAuth client secret periodically.

### 5. Monitor Usage
Enable Google Cloud audit logs for OAuth activity.

### 6. Limit Scopes
Only request necessary OAuth scopes (email, profile, openid).

## Testing Commands

### Test OAuth Endpoint
```bash
# Test auth endpoint
curl https://fluxstudio.art/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"credential":"test"}'
```

### Check Environment Variables
```bash
ssh root@167.172.208.61 "cd /var/www/fluxstudio && grep GOOGLE .env"
```

### Verify Google GSI Script Loads
```bash
curl -I https://accounts.google.com/gsi/client
```

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity/gsi/web)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth Consent Screen Configuration](https://support.google.com/cloud/answer/10311615)
- [Troubleshooting Google Sign-In](https://developers.google.com/identity/sign-in/web/troubleshooting)

## Contact for Help

If you need assistance:
1. Check Google Cloud Console for project access
2. Verify you have Owner or Editor role
3. Review Google Cloud audit logs for OAuth errors
4. Contact Google Cloud Support if needed

---

**Status:** ⚠️ Action Required
**Next Step:** Access Google Cloud Console and verify OAuth client configuration
**Priority:** High (blocks user authentication)
**Estimated Time:** 15-30 minutes
