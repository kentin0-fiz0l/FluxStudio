# Automatic App Spec Sync - Setup Guide

This guide explains how the automatic sync of `.do/app.yaml` to DigitalOcean works and how to configure it.

---

## How It Works

A GitHub Action (`.github/workflows/sync-app-spec.yml`) automatically syncs your `.do/app.yaml` file to DigitalOcean whenever you push changes to it on the `main` branch.

**Workflow:**
1. You edit `.do/app.yaml` locally
2. You commit and push to main
3. GitHub Action detects the change
4. Action runs `doctl apps update` with the new spec
5. DigitalOcean automatically deploys with the updated spec

---

## Initial Setup (One-Time)

### Step 1: Get Your DigitalOcean API Token

1. Go to: https://cloud.digitalocean.com/account/api/tokens
2. Click "Generate New Token"
3. Name: `FluxStudio GitHub Actions`
4. Scopes: Check "Read" and "Write"
5. Expiration: Choose your preference (90 days recommended)
6. Click "Generate Token"
7. **COPY THE TOKEN IMMEDIATELY** (you won't see it again)

### Step 2: Add Token to GitHub Secrets

1. Go to: https://github.com/kentin0-fiz0l/FluxStudio/settings/secrets/actions
2. Click "New repository secret"
3. Name: `DIGITALOCEAN_ACCESS_TOKEN`
4. Value: Paste your DO API token
5. Click "Add secret"

### Step 3: Test the Workflow

```bash
cd /Users/kentino/FluxStudio

# Make a small change to trigger the workflow
echo "# Last updated: $(date)" >> .do/app.yaml

# Commit and push
git add .do/app.yaml .github/workflows/sync-app-spec.yml
git commit -m "Setup: Enable automatic app spec sync to DigitalOcean"
git push origin main
```

### Step 4: Monitor the Action

1. Go to: https://github.com/kentin0-fiz0l/FluxStudio/actions
2. You should see "Sync App Spec to DigitalOcean" running
3. Click on it to see the logs
4. Verify it completes successfully

---

## Usage

After setup, simply edit `.do/app.yaml` and push to main:

```bash
# Edit the spec file
code .do/app.yaml

# Commit and push
git add .do/app.yaml
git commit -m "Update app spec: add new service"
git push origin main
```

The GitHub Action will automatically:
- Detect the change
- Update the spec in DigitalOcean
- Trigger a deployment

---

## Monitoring

### GitHub Actions

View workflow runs at: https://github.com/kentin0-fiz0l/FluxStudio/actions

### DigitalOcean Deployments

Monitor deployments at: https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781

---

## Troubleshooting

### Action Fails: "Error: Invalid token"

**Solution:** The `DIGITALOCEAN_ACCESS_TOKEN` secret is missing or expired.
1. Generate a new token (Step 1 above)
2. Update the GitHub secret (Step 2 above)

### Action Fails: "Error: App spec validation failed"

**Solution:** The `.do/app.yaml` file has syntax errors.
1. Check the Action logs for specific error messages
2. Fix the YAML syntax
3. Test locally if possible
4. Push the fix

### Deployment Not Triggered

**Possible causes:**
1. The workflow only triggers on changes to `.do/app.yaml`
2. Changes must be pushed to the `main` branch
3. The GitHub Action may be disabled

**Check:**
```bash
# Verify the workflow file exists
ls -la .github/workflows/sync-app-spec.yml

# Check GitHub Actions are enabled
# Visit: https://github.com/kentin0-fiz0l/FluxStudio/settings/actions
```

### Spec Updated But Service Not Deploying

This was the original issue! The automatic sync solves this by:
1. Ensuring the spec in DO matches your local file
2. Triggering a deployment whenever the spec changes

If a service still doesn't deploy:
1. Check the spec format (use `ingress:` at top level, not `routes:` in services)
2. Verify all required fields are present (build_command, environment_slug, etc.)
3. Check DigitalOcean build logs for errors

---

## Security Notes

### Token Permissions

The `DIGITALOCEAN_ACCESS_TOKEN` should have:
- ✅ Read access (to verify updates)
- ✅ Write access (to update app specs)
- ❌ Delete access (not needed, don't grant)

### Token Rotation

Rotate your DO API token every 90 days:
1. Generate new token in DigitalOcean
2. Update GitHub secret
3. Delete old token in DigitalOcean

### .env Files

**Never commit** `.env` files or secrets to the repo. The workflow uses GitHub Secrets for authentication.

---

## Advanced Configuration

### Change Target Branch

Edit `.github/workflows/sync-app-spec.yml`:

```yaml
on:
  push:
    branches:
      - main        # Change this to your branch
      - production  # Or add multiple branches
```

### Add Notifications

Add a notification step to the workflow:

```yaml
- name: Notify Success
  if: success()
  run: |
    echo "✅ Spec synced successfully!"
    # Add Slack/Discord webhook here if desired
```

### Manual Trigger

Add `workflow_dispatch` to enable manual runs:

```yaml
on:
  push:
    branches: [main]
    paths: ['.do/app.yaml']
  workflow_dispatch:  # Add this line
```

Then run manually from: https://github.com/kentin0-fiz0l/FluxStudio/actions

---

## Benefits

1. **No More Manual Dashboard Updates** - Edit in code, push, done!
2. **Version Control** - All spec changes are tracked in git
3. **Code Review** - Spec changes go through PR review process
4. **Consistency** - Ensures deployed spec matches your repo
5. **Automation** - Reduces manual errors and saves time

---

## What This Fixes

**Before:**
- Edit `.do/app.yaml` locally ❌
- Spec not synced to DigitalOcean ❌
- Manual dashboard copy-paste required ❌
- Deployments use stale spec ❌

**After:**
- Edit `.do/app.yaml` locally ✅
- Push to main ✅
- GitHub Action syncs automatically ✅
- DigitalOcean deploys with latest spec ✅

---

## Status

**Setup Status:** ✅ Workflow file created
**Next Step:** Add `DIGITALOCEAN_ACCESS_TOKEN` to GitHub Secrets
**Documentation:** This file

---

## Quick Links

- **GitHub Actions:** https://github.com/kentin0-fiz0l/FluxStudio/actions
- **GitHub Secrets:** https://github.com/kentin0-fiz0l/FluxStudio/settings/secrets/actions
- **DO API Tokens:** https://cloud.digitalocean.com/account/api/tokens
- **DO App Dashboard:** https://cloud.digitalocean.com/apps/bd400c99-683f-4d84-ac17-e7130fef0781
- **Workflow File:** `.github/workflows/sync-app-spec.yml`

---

**Generated:** 2025-10-23
**Author:** Claude Code Automation
