# Git History Cleanup - Quick Reference Guide

## Emergency Contact

- **Security Lead**: [NAME] - [CONTACT]
- **Technical Lead**: [NAME] - [CONTACT]
- **24/7 Hotline**: [PHONE]

---

## Quick Status Check

```bash
# Am I on the correct git history?
git log --oneline -5

# Is .env.production in my history? (Should be NO)
git log --all --full-history --oneline -- .env.production

# Is my repo in sync with remote?
git status

# Run full verification
./scripts/verify-credentials-removed.sh
```

---

## For Security Lead: Execute Cleanup

### Pre-Flight Checklist

```bash
# 1. Rotate ALL credentials first
./scripts/rotate-credentials.sh

# 2. Notify team
# [Send Template 1 from TEAM_COMMUNICATION_TEMPLATE.md]

# 3. Create backup
mkdir -p security/git-backups
git bundle create security/git-backups/pre-cleanup-$(date +%Y%m%d_%H%M%S).bundle --all
git bundle verify security/git-backups/pre-cleanup-*.bundle

# 4. Verify .env.production is in history
git log --all --full-history --oneline -- .env.production
```

### Execute (Choose One Method)

**Method 1: git-filter-repo (Recommended)**
```bash
brew install git-filter-repo
git-filter-repo --path .env.production --invert-paths --force
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Method 2: Existing Script**
```bash
./scripts/remove-env-from-git.sh
```

### Post-Cleanup

```bash
# 1. Verify
./scripts/verify-credentials-removed.sh

# 2. Force push
git push origin --force --all
git push origin --force --tags

# 3. Notify team
# [Send Template 3 from TEAM_COMMUNICATION_TEMPLATE.md]
```

---

## For Developers: Sync After Cleanup

### Option 1: Reset (Fast - 2 minutes)

```bash
# Save uncommitted work
git stash save "Pre-sync-backup"

# Fetch new history
git fetch --all

# Hard reset to remote
git reset --hard origin/master

# Clean up
git clean -fdx

# Reinstall dependencies
npm install

# Verify
git log --all --full-history -- .env.production  # Should be empty
```

### Option 2: Fresh Clone (Safe - 5 minutes)

```bash
# Backup current directory
cd /Users/[your-username]
mv FluxStudio FluxStudio.old

# Clone fresh
git clone [REPO_URL] FluxStudio
cd FluxStudio

# Install
npm install

# Test
npm test

# Remove backup when confirmed working
rm -rf FluxStudio.old
```

---

## Common Issues

### Issue: "refusing to merge unrelated histories"

```bash
# Don't merge - reset instead
git fetch --all
git reset --hard origin/master
```

### Issue: "Your local changes would be overwritten"

```bash
# Stash first
git stash save "backup"
git reset --hard origin/master
git stash pop  # Apply changes back
```

### Issue: Can't push my changes

```bash
# Your changes are on old history
# Create patch and reapply
git diff > my-changes.patch
git reset --hard origin/master
git apply my-changes.patch
```

### Issue: Pre-commit hook blocks my commit

```bash
# GOOD - it's working!
# Remove sensitive file from staging
git reset HEAD .env.production

# Verify what you're committing
git diff --cached

# Never use --no-verify unless absolutely necessary
```

---

## Emergency Rollback

### If cleanup goes wrong

```bash
# Stop everything
Ctrl+C

# Restore from backup bundle
cd /Users/kentino/FluxStudio
git fetch security/git-backups/pre-cleanup-*.bundle
git reset --hard FETCH_HEAD

# Or restore from mirror backup
cd /Users/kentino
rm -rf FluxStudio
mv FluxStudio-backup-*.git FluxStudio
cd FluxStudio
```

---

## Prevention Checklist

### Before Committing

- [ ] Review staged files: `git diff --cached`
- [ ] Check for sensitive files: `git status`
- [ ] No `.env.*` files except `.env.example`
- [ ] No hardcoded credentials in code
- [ ] Pre-commit hook is executable

### Best Practices

✅ **DO**:
- Use `.env.local` for local development
- Use environment variables for all secrets
- Commit `.env.example` with dummy values
- Add sensitive files to `.gitignore`

❌ **DON'T**:
- Commit `.env.production` or any file with real credentials
- Hardcode API keys or passwords
- Use `--no-verify` to bypass hooks
- Share credentials via email/Slack

---

## Files and Locations

### Critical Files

```
FluxStudio/
├── .env.production                    # NEVER COMMIT
├── .env.local                         # NEVER COMMIT
├── .env.example                       # SAFE TO COMMIT
├── .gitignore                         # Must include .env.*
├── .git/hooks/pre-commit              # Prevention hook
├── docs/
│   ├── GIT_HISTORY_CLEANUP.md         # Full guide
│   ├── GIT_CLEANUP_QUICK_REFERENCE.md # This file
│   └── TEAM_COMMUNICATION_TEMPLATE.md # Email templates
├── scripts/
│   ├── verify-credentials-removed.sh  # Verification
│   ├── rotate-credentials.sh          # Credential rotation
│   └── remove-env-from-git.sh         # Cleanup script
└── security/
    └── git-backups/                   # Backup bundles
```

### Backup Locations

- Bundle backups: `security/git-backups/`
- Mirror backups: `/Users/kentino/FluxStudio-backup-*.git`

---

## Commands Cheat Sheet

### Verification

```bash
# Quick check
git log --all --full-history --oneline -- .env.production

# Full verification
./scripts/verify-credentials-removed.sh

# Check what's staged
git diff --cached

# Check .gitignore
git check-ignore .env.production
```

### Cleanup

```bash
# Using git-filter-repo
git-filter-repo --path .env.production --invert-paths --force

# Using existing script
./scripts/remove-env-from-git.sh

# Cleanup
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Force Push

```bash
# Push all branches
git push origin --force --all

# Push all tags
git push origin --force --tags

# Verify remote
git ls-remote origin
```

### Sync

```bash
# Fetch and reset
git fetch --all
git reset --hard origin/master

# Clean working directory
git clean -fdx

# Verify sync
git status
```

---

## Timeline Template

Use this for planning your cleanup:

| Time | Action | Owner |
|------|--------|-------|
| T-24h | Rotate credentials | Security |
| T-24h | Send notification | PM |
| T-4h | Second reminder | PM |
| T-1h | Final warning | PM |
| T-30m | Development freeze | All |
| T-0 | Execute cleanup | Security |
| T+15m | Verify cleanup | Security |
| T+20m | Force push | Security |
| T+25m | Notify team | PM |
| T+1h | Team syncs | All Devs |
| T+4h | Verify all synced | PM |
| T+4h | Resume development | All |

---

## Test Pre-Commit Hook

```bash
# Test 1: Try to commit .env.production (should fail)
git add .env.production
git commit -m "Test"
# Expected: ERROR - commit blocked

# Reset
git reset HEAD .env.production

# Test 2: Verify hook is executable
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x

# Test 3: Run hook manually
.git/hooks/pre-commit
# Should run security checks
```

---

## Success Criteria

### Cleanup is successful when:

- [ ] `git log --all --full-history -- .env.production` returns empty
- [ ] `./scripts/verify-credentials-removed.sh` passes all checks
- [ ] All team members have synced
- [ ] Tests pass: `npm test`
- [ ] Pre-commit hook is installed and working
- [ ] All credentials have been rotated
- [ ] No suspicious activity in logs

### Development can resume when:

- [ ] All team members confirmed sync
- [ ] Repository integrity verified
- [ ] CI/CD pipeline is green
- [ ] At least 80% of team ready to work
- [ ] Documentation updated

---

## Support Resources

### Documentation

- **Full Guide**: `docs/GIT_HISTORY_CLEANUP.md`
- **Quick Reference**: `docs/GIT_CLEANUP_QUICK_REFERENCE.md` (this file)
- **Communication Templates**: `docs/TEAM_COMMUNICATION_TEMPLATE.md`
- **Security Audit**: `PHASE_2_SECURITY_AUDIT.md`

### Tools

- **git-filter-repo**: https://github.com/newren/git-filter-repo
- **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/
- **Git Documentation**: https://git-scm.com/docs/git-filter-branch

### Scripts

```bash
# Verification
./scripts/verify-credentials-removed.sh

# Cleanup
./scripts/remove-env-from-git.sh

# Credential rotation
./scripts/rotate-credentials.sh
```

---

## Decision Tree

```
Is .env.production in git history?
│
├─ YES (Security Issue)
│  │
│  ├─ Have credentials been rotated?
│  │  ├─ NO → STOP! Rotate credentials first
│  │  └─ YES → Continue
│  │
│  ├─ Have you notified the team?
│  │  ├─ NO → STOP! Notify team first (Template 1)
│  │  └─ YES → Continue
│  │
│  ├─ Have you created backups?
│  │  ├─ NO → STOP! Create backups first
│  │  └─ YES → Continue
│  │
│  ├─ Is development frozen?
│  │  ├─ NO → STOP! Wait for freeze
│  │  └─ YES → Execute cleanup
│  │
│  └─ Cleanup complete?
│     ├─ NO → Troubleshoot
│     └─ YES → Verify → Force Push → Notify Team
│
└─ NO (All Clear)
   │
   ├─ Is pre-commit hook installed?
   │  ├─ NO → Install it now
   │  └─ YES → Good!
   │
   └─ Regular development - follow best practices
```

---

## Red Flags (Stop and Get Help)

🚨 **STOP IMMEDIATELY if you see**:

- "fatal: repository corrupt"
- Losing commits that should exist
- Can't restore from backup
- Team member reports data loss
- Suspicious activity in production logs
- Unable to verify cleanup success

**Action**: Contact emergency hotline immediately.

---

## Post-Cleanup Checklist

24 hours after cleanup:

- [ ] All team members synced and working
- [ ] No issues reported
- [ ] CI/CD pipeline healthy
- [ ] Production services running normally
- [ ] No suspicious authentication attempts
- [ ] Post-incident review scheduled
- [ ] Documentation updated
- [ ] Lessons learned documented

---

## Remember

> **"Prevention is better than cleanup"**

- Always review staged files before committing
- Never commit files with actual credentials
- Use environment variables
- Test the pre-commit hook
- When in doubt, ask!

---

**Last Updated**: 2025-10-17
**Version**: 1.0
**Maintained by**: FluxStudio Security Team
