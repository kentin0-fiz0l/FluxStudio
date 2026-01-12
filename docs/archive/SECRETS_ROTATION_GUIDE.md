# 🔒 FluxStudio Production Secrets Rotation Guide

**CRITICAL**: This guide must be followed carefully to secure production secrets.
**Status**: The .env.production file is NOT in git (good!), but secrets need proper management.

## Prerequisites

1. Access to DigitalOcean Console: https://cloud.digitalocean.com/
2. Ability to restart the app after changes
3. Keep this guide handy - you'll need to update multiple places

## Step 1: Generate New Secrets Locally

Run these commands in your terminal to generate secure secrets:

```bash
# Generate new JWT_SECRET (256-bit)
openssl rand -base64 32

# Generate new session secret (256-bit)
openssl rand -base64 32

# Generate new Redis password (32 characters)
openssl rand -base64 24

# Generate new Postgres password (32 characters)
openssl rand -base64 24
```

Save these values temporarily in a secure location (password manager).

## Step 2: Update Secrets in DigitalOcean App Platform

### A. Navigate to Your App
1. Go to https://cloud.digitalocean.com/apps
2. Click on `fluxstudio-uy2k4` (or your app name)
3. Click on the **Settings** tab

### B. Update Environment Variables
1. Scroll to **Environment Variables** section
2. Click **Edit** button
3. Update the following variables with your new values:

   - `JWT_SECRET` = [paste new JWT secret from step 1]
   - `SESSION_SECRET` = [paste new session secret from step 1]
   - `REDIS_PASSWORD` = [paste new Redis password from step 1]
   - `POSTGRES_PASSWORD` = [paste new Postgres password from step 1]

4. Keep these the same (unless compromised):
   - `GOOGLE_CLIENT_ID` = [keep existing]
   - `GOOGLE_CLIENT_SECRET` = [only change if you suspect compromise]

5. Click **Save**

### C. Update Database Component Password
1. In the same Settings page, find the **Database** component
2. Click on it to expand settings
3. Update the root password to match your new `POSTGRES_PASSWORD`
4. Click **Save**

### D. Deploy Changes
1. Click **Deploy** button at the top of the page
2. Wait for deployment to complete (5-10 minutes)
3. Monitor the deployment logs for any errors

## Step 3: Update Local .env Files (Development Only)

Update your local `.env.development` file with matching secrets for consistency:

```bash
# In /Users/kentino/FluxStudio/.env.development
JWT_SECRET=your_new_jwt_secret_here
SESSION_SECRET=your_new_session_secret_here
# Local Redis/Postgres can use different passwords
```

## Step 4: Ensure .env.production is Never Committed

### A. Verify .gitignore
```bash
# Check that .env.production is in .gitignore
grep "\.env\.production" .gitignore

# If not found, add it:
echo ".env.production" >> .gitignore
```

### B. Double-Check Git Status
```bash
# This should show "nothing to commit" or not list .env.production
git status

# Verify it's not tracked
git ls-files | grep -i "\.env"
# Should NOT show .env.production
```

## Step 5: Verify Production Application

### A. Test Authentication
1. Go to https://fluxstudio-uy2k4.ondigitalocean.app
2. Try logging out and logging back in
3. Verify Google OAuth still works
4. Check that existing sessions are invalidated (users need to re-login)

### B. Check Application Logs
In DigitalOcean console:
1. Go to **Runtime Logs** tab
2. Look for any authentication errors
3. Verify no "invalid signature" or JWT errors

### C. Test Core Functionality
1. Create a new project
2. Upload a file
3. Verify real-time updates work
4. Check that existing data is still accessible

## Step 6: Document the Rotation

Create a record of the rotation:

```bash
# In DigitalOcean App Platform
# Add a deployment note:
"Security: Rotated all production secrets - [current date]"
```

## Step 7: Update Team Password Manager

Store the new secrets in your team's password manager:
- Vault/1Password/Bitwarden entry: "FluxStudio Production Secrets"
- Include all new values
- Add rotation date
- Remove old values

## Security Best Practices Going Forward

1. **Never commit .env files**
   - Always use DigitalOcean's environment variables
   - Keep .env.production in .gitignore

2. **Rotate secrets regularly**
   - Every 90 days minimum
   - Immediately if any suspicion of compromise

3. **Use DigitalOcean's Secrets Management**
   - All secrets should be in DigitalOcean console
   - Never hardcode secrets in code

4. **Monitor for exposed secrets**
   - Use GitHub's secret scanning
   - Regular security audits
   - Set up alerts for auth failures

## Troubleshooting

### If deployment fails after updating secrets:

1. **Check Runtime Logs** in DigitalOcean for specific errors
2. **Verify Database Connection**:
   - Ensure Postgres password matches in both app and database settings
3. **Redis Connection Issues**:
   - Verify Redis password is updated in app settings
4. **JWT Errors**:
   - All services must use the same JWT_SECRET
   - Users will need to re-authenticate

### If you accidentally commit secrets:

1. **Immediately** rotate all secrets following this guide
2. Contact security team
3. Use `git filter-repo` to remove from history (see below)

## Emergency: Removing Secrets from Git History

**Only if secrets were accidentally committed:**

```bash
# Install git-filter-repo if needed
brew install git-filter-repo

# Remove the file from all history
git filter-repo --path .env.production --invert-paths

# Force push (coordinate with team first!)
git push origin --force --all
git push origin --force --tags
```

## Completion Checklist

- [ ] New secrets generated locally
- [ ] Secrets updated in DigitalOcean console
- [ ] Application redeployed successfully
- [ ] Authentication tested and working
- [ ] .env.production confirmed NOT in git
- [ ] Team password manager updated
- [ ] Rotation documented

## Contact for Issues

- **DevOps Lead**: For deployment issues
- **Security Team**: For suspected compromise
- **Project Manager**: For coordination with team

---

**Remember**: Security is everyone's responsibility. When in doubt, rotate the secrets!