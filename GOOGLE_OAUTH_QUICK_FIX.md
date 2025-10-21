# Google OAuth Quick Fix - fluxstudio.art

## The Issue
Google Sign-In button redirects to 404 page because the Client ID is not authorized for your domain.

## Quick Fix Steps (5 minutes)

### Step 1: Access Google Cloud Console
🔗 https://console.cloud.google.com/apis/credentials

### Step 2: Find Your OAuth Client
Search for: `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb`

### Step 3: Edit Authorized JavaScript Origins
Click "Edit" and add:
```
https://fluxstudio.art
https://www.fluxstudio.art
```

### Step 4: Edit Authorized Redirect URIs
Add these (if needed):
```
https://fluxstudio.art/api/auth/google/callback
https://www.fluxstudio.art/api/auth/google/callback
```

### Step 5: Configure OAuth Consent Screen
Go to: OAuth consent screen → Edit
- Add authorized domain: `fluxstudio.art`
- Verify app name is set: `FluxStudio`

### Step 6: Save and Wait
- Click **SAVE**
- Wait 5-10 minutes for propagation
- Clear browser cache
- Test at: https://fluxstudio.art/login

## If You Don't Have Access

### Option A: Get Access
Ask the Google Cloud project owner to add you as a user with Editor role

### Option B: Create New Client ID
1. Create new OAuth 2.0 Client ID in Google Cloud Console
2. Configure with the domains above
3. Update `.env.production`:
   ```
   VITE_GOOGLE_CLIENT_ID=your-new-client-id
   ```
4. Rebuild and redeploy:
   ```bash
   cd /Users/kentino/FluxStudio
   npm run build
   rsync -avz --delete --exclude=node_modules build/ root@167.172.208.61:/var/www/fluxstudio/
   ```

## Verification

After configuration, you should see:
- ✅ Google Sign-In button loads without errors
- ✅ Clicking button shows Google account selector popup
- ✅ No 403 or 404 errors in browser console
- ✅ Successful authentication redirects to /home

## Troubleshooting

### Still getting 403?
- Wait 10 more minutes (propagation can be slow)
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Try incognito/private browsing mode

### Still getting 404?
- Check that redirect URIs are exactly correct (no typos)
- Verify nginx is running: `ssh root@167.172.208.61 "systemctl status nginx"`

### "App not verified" warning?
- This is normal for apps in testing mode
- Add your email as a test user in OAuth consent screen
- OR submit for Google verification (takes several days)

## Current Status
- ✅ React bundling error: FIXED
- ✅ Application loading: WORKING
- ✅ Email/password login: WORKING
- ⚠️ Google OAuth: NEEDS CONFIGURATION (this guide)

## Support
For detailed information, see: `GOOGLE_OAUTH_CONFIGURATION.md`
