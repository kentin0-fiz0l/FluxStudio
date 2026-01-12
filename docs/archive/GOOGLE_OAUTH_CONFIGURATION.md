# Google OAuth Configuration Guide

## Current Status
- **Client ID**: `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com`
- **Domain**: `fluxstudio.art`
- **Error**: 403 - Client ID not authorized for this domain

## Configuration Steps

### 1. Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one if needed)
3. Navigate to **APIs & Services** → **Credentials**

### 2. Locate Your OAuth 2.0 Client ID
1. Find the client ID: `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb`
2. Click on it to edit

### 3. Configure Authorized JavaScript Origins
Add the following origins:

```
https://fluxstudio.art
https://www.fluxstudio.art
```

**Important**: Do NOT include trailing slashes

### 4. Configure Authorized Redirect URIs (if using redirect flow)
Add the following redirect URIs:

```
https://fluxstudio.art/api/auth/google/callback
https://www.fluxstudio.art/api/auth/google/callback
```

### 5. Configure OAuth Consent Screen
1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Ensure the following are configured:
   - **Application type**: External (or Internal if for workspace users only)
   - **Application name**: FluxStudio
   - **User support email**: Your email
   - **Authorized domains**: Add `fluxstudio.art`
   - **Developer contact information**: Your email

### 6. Add Test Users (if in Testing mode)
If your OAuth consent screen is in "Testing" status:
1. Go to **OAuth consent screen**
2. Scroll to **Test users**
3. Add your email addresses to allow testing

### 7. Verify Configuration
After saving:
1. Wait 5-10 minutes for changes to propagate
2. Clear browser cache
3. Test the Google Sign-In button at https://fluxstudio.art/login

## Current Implementation

### Frontend Configuration
- **Location**: `/Users/kentino/FluxStudio/src/pages/ModernLogin.tsx:6`
- **Client ID**: Uses `VITE_GOOGLE_CLIENT_ID` environment variable
- **Flow**: Google Identity Services (One Tap) - popup flow, not redirect

### Backend Endpoint
- **Location**: `/Users/kentino/FluxStudio/server-auth.js:613`
- **Route**: `POST /api/auth/google`
- **Function**: Receives JWT credential from Google and validates it

### Environment Variables
Production environment needs:
```bash
VITE_GOOGLE_CLIENT_ID=65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com
```

## Troubleshooting

### Error: "The given client ID is not found" (403)
**Cause**: Domain not authorized in Google Cloud Console
**Solution**: Add `fluxstudio.art` to Authorized JavaScript origins

### Error: 404 when clicking Sign in with Google
**Cause**: Google is trying to redirect to a callback URL that doesn't exist
**Solution**:
- Ensure you're using the popup flow (GSI)
- Add redirect URIs if you switch to redirect flow

### Error: "This app hasn't been verified"
**Cause**: OAuth consent screen is in testing mode
**Solution**:
- Add your email as a test user
- OR submit app for verification (for production)

### Error: "Access blocked: This app's request is invalid"
**Cause**: Multiple possible causes:
- Redirect URI mismatch
- JavaScript origin not authorized
- OAuth consent screen not properly configured
**Solution**: Double-check all configuration steps above

## Alternative: Create New Client ID

If you don't have access to the existing Client ID, create a new one:

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Web application**
4. Name: `FluxStudio Production`
5. Add Authorized JavaScript origins:
   - `https://fluxstudio.art`
   - `https://www.fluxstudio.art`
6. Add Authorized redirect URIs:
   - `https://fluxstudio.art/api/auth/google/callback`
7. Click **CREATE**
8. Copy the new Client ID
9. Update `.env.production` with the new Client ID
10. Rebuild and redeploy the application

## Security Notes

- Never commit Client ID to public repositories (it's already public in your case, which is OK for Client IDs)
- Keep Client Secret secure (only stored on backend, never exposed to frontend)
- Use HTTPS for all authorized origins and redirect URIs
- Regularly review OAuth consent screen settings
- Monitor Google Cloud Console for any security alerts

## Current Build Configuration

The Client ID is baked into the production build. After updating in Google Cloud Console:
1. Changes should work immediately (no rebuild needed)
2. But if you change the Client ID itself, you must:
   ```bash
   npm run build
   rsync -avz --delete --exclude=node_modules build/ root@167.172.208.61:/var/www/fluxstudio/
   ```

## Contact Information

If you need help accessing the Google Cloud Console:
- Project Owner email is needed
- Or create a new project and generate new credentials
