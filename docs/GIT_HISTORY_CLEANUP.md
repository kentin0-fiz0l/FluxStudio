# Git History Cleanup Guide - Remove Exposed Credentials

## Executive Summary

**CRITICAL SECURITY ISSUE**: The file `.env.production` containing production credentials was committed to git history in commit `398c28746eea1ae2bbcd7d37ed3fe5527c56ebeb` on October 11, 2025.

**Exposed Credentials Include**:
- Database passwords (PostgreSQL, MongoDB)
- JWT secrets (JWT_SECRET, JWT_REFRESH_SECRET)
- OAuth client secrets (Google, GitHub)
- Redis passwords
- SMTP credentials
- Grafana admin passwords
- API keys for external services

**Status**:
- Commit is in local repository history
- Risk Level: HIGH - Credentials must be rotated AND removed from history

---

## Table of Contents

1. [Pre-Cleanup Checklist](#pre-cleanup-checklist)
2. [Method 1: git-filter-repo (Recommended)](#method-1-git-filter-repo-recommended)
3. [Method 2: BFG Repo-Cleaner (Alternative)](#method-2-bfg-repo-cleaner-alternative)
4. [Method 3: git filter-branch (Legacy)](#method-3-git-filter-branch-legacy)
5. [Post-Cleanup Verification](#post-cleanup-verification)
6. [Team Synchronization](#team-synchronization)
7. [Rollback Procedure](#rollback-procedure)
8. [Prevention Measures](#prevention-measures)

---

## Pre-Cleanup Checklist

Complete ALL steps before proceeding:

### Step 1: Credential Rotation (CRITICAL)

**Assume ALL exposed credentials are compromised. Rotate immediately:**

```bash
# Run the credential rotation script
cd /Users/kentino/FluxStudio
./scripts/rotate-credentials.sh
```

**Manual Rotation Checklist**:
- [ ] Database passwords (PostgreSQL, MongoDB, Redis)
- [ ] JWT secrets (generate new random strings)
- [ ] OAuth credentials (revoke and regenerate in provider consoles)
- [ ] SMTP credentials
- [ ] Grafana admin password
- [ ] All API keys (OpenAI, Stripe, etc.)

**Provider-Specific Instructions**:

**Google OAuth**:
```
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your project
3. Click on OAuth 2.0 Client ID
4. Click "ROTATE SECRET" button
5. Update GOOGLE_CLIENT_SECRET in .env.production
```

**GitHub OAuth**:
```
1. Go to https://github.com/settings/developers
2. Select your OAuth App
3. Click "Generate a new client secret"
4. Revoke old secret
5. Update GITHUB_CLIENT_SECRET in .env.production
```

### Step 2: Team Coordination

**CRITICAL**: This operation rewrites git history. All team members must be coordinated.

**Send this message to ALL team members**:

```
🚨 URGENT: Git History Rewrite Scheduled

We are removing exposed credentials from git history.

ACTION REQUIRED:
1. ✅ COMMIT and PUSH all your work NOW
2. ✅ PAUSE all development work
3. ✅ DO NOT push after [TIMESTAMP]
4. ✅ WAIT for confirmation email before resuming
5. ✅ FOLLOW the repository reset instructions you will receive

Timeline:
- Work pause: [TIMESTAMP]
- Rewrite execution: [TIMESTAMP]
- Completion notification: [TIMESTAMP + 30min]
- Work resume: [TIMESTAMP + 1hr]

Reply to confirm you've received this message.
```

### Step 3: Create Backup

**CRITICAL**: Create a full repository backup before ANY changes:

```bash
# Create backup directory
mkdir -p /Users/kentino/FluxStudio/security/git-backups

# Create mirror clone (includes all refs, tags, branches)
cd /Users/kentino
git clone --mirror FluxStudio FluxStudio-backup-$(date +%Y%m%d_%H%M%S).git

# Create bundle backup
cd /Users/kentino/FluxStudio
git bundle create security/git-backups/pre-cleanup-$(date +%Y%m%d_%H%M%S).bundle --all

# Verify bundle integrity
git bundle verify security/git-backups/pre-cleanup-*.bundle
```

**Expected output**: "security/git-backups/pre-cleanup-*.bundle is okay"

### Step 4: Verify Current State

```bash
# Check if .env.production exists in history
git log --all --full-history --oneline -- .env.production

# Count how many commits contain the file
git log --all --full-history --oneline -- .env.production | wc -l

# Check if file is in .gitignore
git check-ignore .env.production
```

**Expected output**: Should show commit 398c287 and confirm file is in .gitignore

### Step 5: Verify Working Directory

```bash
# Ensure working directory is clean
git status

# Stash any uncommitted changes
git stash save "Pre-cleanup stash $(date +%Y%m%d_%H%M%S)"

# Verify all remotes
git remote -v
```

---

## Method 1: git-filter-repo (Recommended)

**Advantages**:
- Fastest performance (10-100x faster than filter-branch)
- Better handling of complex histories
- Officially recommended by Git project
- Safer (more error checking)

**Disadvantages**:
- Requires separate installation
- Less widely known

### Installation

```bash
# macOS with Homebrew
brew install git-filter-repo

# Verify installation
git-filter-repo --version
```

**Expected output**: `git-filter-repo 2.x.x`

### Execution

```bash
# Navigate to repository
cd /Users/kentino/FluxStudio

# Perform the cleanup
git-filter-repo --path .env.production --invert-paths --force

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Verification

```bash
# Run verification script
./scripts/verify-credentials-removed.sh

# Manual verification
git log --all --full-history --oneline -- .env.production
# Expected: Empty output or "fatal: ambiguous argument"

# Check for any remaining secrets
git log --all --source --full-history -S "JWT_SECRET" --oneline
# Expected: Empty output
```

---

## Method 2: BFG Repo-Cleaner (Alternative)

**Advantages**:
- Very fast
- Simple command syntax
- Good for bulk operations
- Excellent documentation

**Disadvantages**:
- Requires Java
- Separate download

### Installation

```bash
# macOS with Homebrew
brew install bfg

# OR download directly
curl -L https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar -o ~/bfg.jar
```

### Execution

```bash
# Navigate to repository parent
cd /Users/kentino

# Create a fresh mirror clone
git clone --mirror FluxStudio FluxStudio-bfg.git

# Run BFG (using Homebrew version)
cd FluxStudio-bfg.git
bfg --delete-files .env.production

# OR using downloaded JAR
java -jar ~/bfg.jar --delete-files .env.production

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push to original repository
cd /Users/kentino/FluxStudio
git remote add bfg-clean /Users/kentino/FluxStudio-bfg.git
git fetch bfg-clean
git reset --hard bfg-clean/master
git remote remove bfg-clean
```

### Verification

```bash
# Run verification script
./scripts/verify-credentials-removed.sh

# Manual check
git log --all --full-history -- .env.production
# Expected: Empty output
```

---

## Method 3: git filter-branch (Legacy)

**Advantages**:
- Built into Git (no installation)
- Well-documented online

**Disadvantages**:
- Slow on large repositories
- Deprecated by Git project
- More error-prone

### Execution

```bash
# Navigate to repository
cd /Users/kentino/FluxStudio

# Run filter-branch (this is what the existing script uses)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Note**: You can also use the existing script:
```bash
./scripts/remove-env-from-git.sh
```

---

## Post-Cleanup Verification

### Automated Verification

```bash
# Run comprehensive verification
./scripts/verify-credentials-removed.sh

# Expected output: All checks should PASS
```

### Manual Verification

```bash
# 1. Verify file is removed from history
git log --all --full-history --oneline -- .env.production
# Expected: Empty output or error

# 2. Search for JWT_SECRET in history
git log --all --source --full-history -S "JWT_SECRET" --oneline
# Expected: Empty output

# 3. Search for database passwords
git log --all --source --full-history -S "POSTGRES_PASSWORD" --oneline
# Expected: Empty output

# 4. Search for OAuth secrets
git log --all --source --full-history -S "GOOGLE_CLIENT_SECRET" --oneline
# Expected: Empty output

# 5. Verify .gitignore still includes .env.production
git check-ignore .env.production
# Expected: .env.production

# 6. Check repository size (should be smaller)
du -sh .git
# Compare with backup size

# 7. Verify all branches are clean
for branch in $(git branch -a | grep remotes | grep -v HEAD); do
  echo "Checking $branch"
  git log $branch --full-history --oneline -- .env.production
done
# Expected: All empty

# 8. Check reflog is clean
git reflog --all | grep -i "env.production"
# Expected: Empty output
```

### Integrity Checks

```bash
# Verify repository integrity
git fsck --full --strict

# Expected output: No errors (dangling commits are okay)

# Verify all commits are reachable
git rev-list --all --count
# Should show total number of commits

# Test cloning
cd /tmp
git clone /Users/kentino/FluxStudio test-clone
cd test-clone
git log --all --oneline -- .env.production
# Expected: Empty output
cd /Users/kentino
rm -rf /tmp/test-clone
```

---

## Team Synchronization

### Step 1: Force Push to Remote

**CRITICAL**: Only do this AFTER verification is complete.

```bash
# Push all branches
git push origin --force --all

# Push all tags
git push origin --force --tags

# Verify remote
git ls-remote origin | grep -i env.production
# Expected: Empty output
```

### Step 2: Notify Team

**Send this message immediately after force push**:

```
🚨 GIT HISTORY REWRITE COMPLETE - IMMEDIATE ACTION REQUIRED

The .env.production file has been successfully removed from git history
for security reasons. All exposed credentials have been rotated.

YOU MUST take action NOW to sync your local repository:

═══════════════════════════════════════════════════════════════

OPTION 1: Reset Your Local Repository (Faster)
──────────────────────────────────────────────

Prerequisites:
- Ensure all your work is committed and pushed
- Or back up uncommitted changes

Commands:
  cd /Users/kentino/FluxStudio

  # Save uncommitted work (if any)
  git stash save "Pre-history-rewrite-backup"

  # Fetch new history
  git fetch --all

  # Hard reset to remote (DESTRUCTIVE)
  git reset --hard origin/master

  # Clean any leftover files
  git clean -fdx

  # Restore your stashed work (if applicable)
  git stash pop

═══════════════════════════════════════════════════════════════

OPTION 2: Fresh Clone (Safest)
────────────────────────────────

Commands:
  # Back up your current directory
  cd /Users/kentino
  mv FluxStudio FluxStudio.old

  # Clone fresh copy
  git clone <your-repo-url> FluxStudio
  cd FluxStudio

  # Reinstall dependencies
  npm install

  # Copy any local config files
  cp ../FluxStudio.old/.env.local .env.local

  # Test the application
  npm test

  # Once confirmed working, delete backup
  rm -rf FluxStudio.old

═══════════════════════════════════════════════════════════════

IMPORTANT NOTES:

⚠️  DO NOT attempt to merge or pull - it WILL fail
⚠️  DO NOT use old commit SHAs - they are invalid now
⚠️  All credentials have been rotated - get new .env from team lead
⚠️  If you have open Pull Requests, they will need to be recreated

VERIFICATION:
After syncing, run this command to verify:
  git log --all --full-history --oneline -- .env.production

Expected result: Empty output or error message

SUPPORT:
If you encounter issues:
1. Do NOT force push or use --force
2. Contact the team lead immediately
3. Share the exact error message

Reply to this message once you've successfully synced.
```

### Step 3: Update Documentation

```bash
# Update SECURITY.md
cat >> /Users/kentino/FluxStudio/SECURITY.md << 'EOF'

## Git History Cleanup - October 2025

**Date**: October 17, 2025
**Reason**: Removal of exposed credentials from .env.production
**Action**: Complete git history rewrite
**Files Removed**: .env.production (from all commits)
**Credentials Rotated**: All production secrets and keys

**Commit Range Affected**: All commits up to 398c287
**New Commit SHAs**: All commits after cleanup have new identifiers

**Team Impact**: All team members required to reset or re-clone repositories.

EOF
```

---

## Rollback Procedure

If something goes wrong during cleanup:

### Immediate Rollback

```bash
# Stop any in-progress operations
Ctrl+C

# Navigate to backup directory
cd /Users/kentino

# Restore from mirror backup
rm -rf FluxStudio
mv FluxStudio-backup-YYYYMMDD_HHMMSS.git FluxStudio

# OR restore from bundle
cd FluxStudio
git bundle unbundle security/git-backups/pre-cleanup-*.bundle
git reset --hard origin/master
```

### Partial Rollback (Specific Branches)

```bash
# List bundle contents
git bundle list-heads security/git-backups/pre-cleanup-*.bundle

# Restore specific branch
git fetch security/git-backups/pre-cleanup-*.bundle refs/heads/master:refs/heads/master-recovered

# Compare with cleaned version
git diff master master-recovered
```

### Verification After Rollback

```bash
# Verify original commit exists
git log --oneline | grep 398c287

# Verify .env.production is back in history
git log --all --full-history --oneline -- .env.production

# If rollback successful, decide on next steps:
# - Attempt cleanup again with different method
# - Investigate what went wrong
# - Consult with team
```

---

## Prevention Measures

### Pre-Commit Hook

The repository now includes a pre-commit hook at `.git/hooks/pre-commit` that prevents committing environment files.

**Test the hook**:
```bash
# Try to commit .env.production (should fail)
git add .env.production
git commit -m "Test commit"
# Expected: Error message and commit blocked
```

### Git Attributes

Add to `.gitattributes`:
```bash
cat >> /Users/kentino/FluxStudio/.gitattributes << 'EOF'
# Prevent accidentally committing sensitive files
.env.production diff=blacklist
.env.local diff=blacklist
*.key diff=blacklist
*.pem diff=blacklist
EOF
```

### GitHub Secret Scanning

If using GitHub:
```bash
# Enable secret scanning in repository settings
# GitHub → Repository → Settings → Security & analysis
# Enable: Dependency graph, Dependabot alerts, Secret scanning
```

### Environment File Template

```bash
# Create example template (safe to commit)
cd /Users/kentino/FluxStudio
cp .env.production .env.production.example

# Remove all sensitive values
sed -i '' 's/=.*/=YOUR_VALUE_HERE/g' .env.production.example

# Commit the template
git add .env.production.example
git commit -m "Add environment template for documentation"
git push
```

### Git Ignore Verification

```bash
# Add automated check to CI/CD
cat >> /Users/kentino/FluxStudio/.github/workflows/security-check.yml << 'EOF'
name: Security Check

on: [push, pull_request]

jobs:
  check-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check for sensitive files
        run: |
          if git log --all --full-history -- .env.production | grep -q .; then
            echo "ERROR: .env.production found in history"
            exit 1
          fi
EOF
```

---

## Risk Assessment

### Before Cleanup

**Risk Level**: CRITICAL
- Exposed: Database passwords, JWT secrets, OAuth credentials
- Impact: Complete system compromise possible
- Likelihood: HIGH (credentials in git history)

### After Cleanup

**Risk Level**: MEDIUM (until all team members sync)
- Exposed: Historical credentials (now rotated)
- Impact: Old credentials may still exist in local clones
- Likelihood: MEDIUM (depends on team synchronization)

### After Team Sync

**Risk Level**: LOW
- Exposed: None (credentials rotated and removed)
- Impact: Historical exposure mitigated
- Likelihood: LOW (prevention measures in place)

---

## Support and Troubleshooting

### Common Issues

**Issue 1: "fatal: bad object" after cleanup**
```bash
# Solution: Cleanup orphaned refs
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Issue 2: "refusing to merge unrelated histories"**
```bash
# This means you need to hard reset, not merge
git reset --hard origin/master
```

**Issue 3: Pre-commit hook not working**
```bash
# Make hook executable
chmod +x .git/hooks/pre-commit

# Verify it runs
.git/hooks/pre-commit
```

**Issue 4: Push rejected after cleanup**
```bash
# You MUST use force push after history rewrite
git push origin --force --all
```

**Issue 5: Large repository size after cleanup**
```bash
# Aggressive garbage collection
git gc --prune=now --aggressive

# Or use git repack
git repack -a -d --depth=250 --window=250
```

### Getting Help

If you encounter issues not covered here:

1. **Check verification script output**: `./scripts/verify-credentials-removed.sh`
2. **Review git logs**: Look for error messages in terminal output
3. **Contact team lead**: Provide full error message and context
4. **Do not force push** until issue is resolved

---

## Timeline

**Recommended execution timeline**:

| Time | Action | Owner | Status |
|------|--------|-------|--------|
| T-24h | Rotate all credentials | Security Lead | ⏳ |
| T-4h | Notify team of upcoming rewrite | PM | ⏳ |
| T-1h | All developers commit and push work | All Devs | ⏳ |
| T-30m | Development freeze begins | PM | ⏳ |
| T-15m | Create backups | Ops Lead | ⏳ |
| T-0 | Execute git history cleanup | Security Lead | ⏳ |
| T+15m | Verify cleanup | Security Lead | ⏳ |
| T+20m | Force push to remote | Security Lead | ⏳ |
| T+25m | Notify team to sync | PM | ⏳ |
| T+1h | Verify all team members synced | PM | ⏳ |
| T+2h | Development freeze lifted | PM | ⏳ |
| T+24h | Post-incident review | All | ⏳ |

---

## References

- Git Filter-Repo: https://github.com/newren/git-filter-repo
- BFG Repo-Cleaner: https://rtyley.github.io/bfg-repo-cleaner/
- GitHub Secret Scanning: https://docs.github.com/en/code-security/secret-scanning
- Git Security Best Practices: https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History

---

## Sign-Off

**Security Lead**: _________________ Date: _______

**Technical Lead**: _________________ Date: _______

**Team Notified**: Yes ☐ No ☐

**Backups Created**: Yes ☐ No ☐

**Verification Complete**: Yes ☐ No ☐

**Team Synced**: Yes ☐ No ☐
