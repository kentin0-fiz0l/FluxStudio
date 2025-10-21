# Git Credential Cleanup - Master Checklist

## Quick Status

**Current Phase**: ⏳ Phase 2 - Preparation Complete
**Next Action**: Credential Rotation
**Blocker**: None
**Ready to Execute**: ✅ Yes

---

## Phase 1: Discovery & Documentation ✅ COMPLETE

- [x] Security issue identified
- [x] Incident scope assessed
- [x] Affected credentials catalogued
- [x] Monitoring enabled
- [x] Comprehensive documentation created
- [x] Verification scripts developed
- [x] Rollback procedures documented
- [x] Prevention measures implemented
- [x] Team communication templates prepared

**Status**: ✅ All documentation and tooling in place

---

## Phase 2: Credential Rotation ⏳ PENDING

**CRITICAL**: Must be completed BEFORE git history cleanup

### Database Credentials

- [ ] **PostgreSQL**
  - [ ] Generate new password
  - [ ] Update `POSTGRES_PASSWORD` in `.env.production`
  - [ ] Update database server
  - [ ] Test connection
  - [ ] Update all services using PostgreSQL
  - [ ] Verify all services operational

- [ ] **MongoDB**
  - [ ] Generate new password
  - [ ] Update `MONGODB_PASSWORD` in `.env.production`
  - [ ] Update MongoDB connection string
  - [ ] Update database server
  - [ ] Test connection
  - [ ] Update all services using MongoDB
  - [ ] Verify all services operational

- [ ] **Redis**
  - [ ] Generate new password
  - [ ] Update `REDIS_PASSWORD` in `.env.production`
  - [ ] Update Redis server
  - [ ] Test connection
  - [ ] Update all services using Redis
  - [ ] Verify all services operational

### Authentication Secrets

- [ ] **JWT Secrets**
  - [ ] Generate new `JWT_SECRET` (256-bit random)
  - [ ] Generate new `JWT_REFRESH_SECRET` (256-bit random)
  - [ ] Update `.env.production`
  - [ ] Update authentication service
  - [ ] **IMPORTANT**: Invalidates all existing tokens
  - [ ] Notify users they may need to re-login
  - [ ] Verify authentication flow works

- [ ] **Session Secrets**
  - [ ] Generate new session secret
  - [ ] Update `.env.production`
  - [ ] Update session management
  - [ ] Test session creation
  - [ ] Verify session validation

### OAuth Credentials

- [ ] **Google OAuth**
  - [ ] Go to https://console.cloud.google.com/apis/credentials
  - [ ] Navigate to your OAuth 2.0 Client ID
  - [ ] Click "ROTATE SECRET" button
  - [ ] Copy new client secret
  - [ ] Update `GOOGLE_CLIENT_SECRET` in `.env.production`
  - [ ] **IMPORTANT**: Keep old secret active for 24h for token refresh
  - [ ] Test Google OAuth login flow
  - [ ] After 24h, revoke old secret

- [ ] **GitHub OAuth**
  - [ ] Go to https://github.com/settings/developers
  - [ ] Select your OAuth App
  - [ ] Click "Generate a new client secret"
  - [ ] Copy new client secret
  - [ ] Update `GITHUB_CLIENT_SECRET` in `.env.production`
  - [ ] Test GitHub OAuth login flow
  - [ ] Revoke old secret

### Email & Notifications

- [ ] **SMTP Credentials**
  - [ ] Access email provider dashboard
  - [ ] Generate new SMTP password
  - [ ] Update `SMTP_PASSWORD` in `.env.production`
  - [ ] Update email service configuration
  - [ ] Send test email
  - [ ] Verify email delivery

### Monitoring & Analytics

- [ ] **Grafana**
  - [ ] Generate new admin password
  - [ ] Update `GRAFANA_ADMIN_PASSWORD` in `.env.production`
  - [ ] Update Grafana configuration
  - [ ] Test Grafana access
  - [ ] Verify dashboards accessible

### Third-Party API Keys

- [ ] **OpenAI API**
  - [ ] Go to https://platform.openai.com/api-keys
  - [ ] Revoke old API key
  - [ ] Generate new API key
  - [ ] Update `OPENAI_API_KEY` in `.env.production`
  - [ ] Update AI services
  - [ ] Test AI functionality

- [ ] **Stripe**
  - [ ] Go to Stripe Dashboard → Developers → API Keys
  - [ ] Roll secret key
  - [ ] Update `STRIPE_SECRET_KEY` in `.env.production`
  - [ ] Update payment services
  - [ ] Test payment flow (use test mode)

- [ ] **Other API Keys**
  - [ ] List all other API keys in `.env.production`
  - [ ] Rotate each according to provider documentation
  - [ ] Update `.env.production`
  - [ ] Test functionality

### Infrastructure

- [ ] **AWS Credentials** (if applicable)
  - [ ] Access AWS IAM
  - [ ] Deactivate old access key
  - [ ] Create new access key
  - [ ] Update `AWS_SECRET_ACCESS_KEY` in `.env.production`
  - [ ] Update services using AWS
  - [ ] Test AWS operations
  - [ ] Delete old access key

### Verification

- [ ] **All Services Operational**
  - [ ] All services start successfully
  - [ ] All database connections work
  - [ ] Authentication flow functional
  - [ ] OAuth providers working
  - [ ] Email sending works
  - [ ] API integrations functional
  - [ ] No error logs related to credentials

- [ ] **Credential Storage**
  - [ ] All new credentials in `.env.production`
  - [ ] `.env.production` is NOT staged for git
  - [ ] `.env.production` in `.gitignore`
  - [ ] Backup of new credentials in secure location (password manager)

**Command to run**:
```bash
./scripts/rotate-credentials.sh
```

**Estimated Time**: 2-4 hours

---

## Phase 3: Team Coordination ⏳ PENDING

### Timeline Planning

- [ ] **Set Cleanup Date & Time**
  - [ ] Choose date/time with minimal impact
  - [ ] Consider team timezones
  - [ ] Allow 24h notice minimum
  - [ ] Block 4 hours for full process
  - [ ] Schedule during business hours for support

- [ ] **Reserve Time Blocks**
  - [ ] T-24h: First announcement
  - [ ] T-4h: Reminder
  - [ ] T-1h: Final warning & freeze
  - [ ] T: Cleanup execution
  - [ ] T+2h: Team sync support window
  - [ ] T+24h: Post-incident review

### Team Notification (T-24h)

- [ ] **Send Initial Announcement**
  - [ ] Use Template 1 from `docs/TEAM_COMMUNICATION_TEMPLATE.md`
  - [ ] Send via Email AND Slack
  - [ ] Include exact timeline
  - [ ] Include preparation instructions
  - [ ] Request acknowledgment

- [ ] **Track Acknowledgments**
  - [ ] Create spreadsheet of team members
  - [ ] Track who has acknowledged
  - [ ] Follow up with non-responders
  - [ ] Ensure 100% acknowledgment

### Pre-Cleanup Verification (T-4h)

- [ ] **Send Reminder**
  - [ ] Use Template 2 from `docs/TEAM_COMMUNICATION_TEMPLATE.md`
  - [ ] Remind to commit and push work
  - [ ] Verify team readiness
  - [ ] Answer any questions

- [ ] **Check Team Status**
  - [ ] All team members have pushed work
  - [ ] No one is in middle of critical work
  - [ ] Everyone understands the process
  - [ ] Support team standing by

### Development Freeze (T-30m)

- [ ] **Announce Freeze**
  - [ ] Clear announcement in all channels
  - [ ] All git operations must stop
  - [ ] No new commits
  - [ ] No pushes to remote
  - [ ] Wait for cleanup completion

**Freeze Verification**:
```bash
# Check no recent pushes
git log --all --oneline --since="30 minutes ago"
```

---

## Phase 4: Pre-Cleanup Preparation ⏳ PENDING

### Backup Creation

- [ ] **Create Mirror Backup**
  ```bash
  cd /Users/kentino
  git clone --mirror FluxStudio FluxStudio-backup-$(date +%Y%m%d_%H%M%S).git
  ```
  - [ ] Verify backup created
  - [ ] Check backup size (should be similar to .git folder)
  - [ ] Note backup location

- [ ] **Create Bundle Backup**
  ```bash
  cd /Users/kentino/FluxStudio
  mkdir -p security/git-backups
  git bundle create security/git-backups/pre-cleanup-$(date +%Y%m%d_%H%M%S).bundle --all
  ```
  - [ ] Verify bundle integrity:
  ```bash
  git bundle verify security/git-backups/pre-cleanup-*.bundle
  ```
  - [ ] Expected output: "bundle is okay"

- [ ] **Backup External Storage** (Optional but recommended)
  - [ ] Copy bundle to external drive
  - [ ] Copy bundle to cloud storage
  - [ ] Copy bundle to another machine
  - [ ] Verify external backups

### Environment Verification

- [ ] **Repository State**
  ```bash
  # Working directory should be clean
  git status

  # Verify .env.production in history
  git log --all --full-history --oneline -- .env.production

  # Should show commit 398c287
  ```

- [ ] **Git Configuration**
  ```bash
  # Check remote URLs
  git remote -v

  # Check current branch
  git branch

  # Check for uncommitted changes
  git status
  ```

- [ ] **Tool Installation**
  - [ ] Install git-filter-repo:
  ```bash
  brew install git-filter-repo
  git-filter-repo --version
  ```
  - [ ] OR download BFG:
  ```bash
  brew install bfg
  ```

### Final Verification

- [ ] All credentials rotated and verified
- [ ] All backups created and verified
- [ ] Team in development freeze
- [ ] Cleanup tools installed
- [ ] Security Lead ready to execute
- [ ] Support team standing by

---

## Phase 5: Cleanup Execution ⏳ PENDING

**IMPORTANT**: Only Security Lead should execute this phase

### Method Selection

Choose ONE method:

**Option A: git-filter-repo** (Recommended)
- Fastest
- Most reliable
- Best for large repositories

**Option B: Existing Script**
- Uses git filter-branch
- Interactive confirmations
- Familiar workflow

### Execution (Method A: git-filter-repo)

- [ ] **Navigate to Repository**
  ```bash
  cd /Users/kentino/FluxStudio
  ```

- [ ] **Execute Cleanup**
  ```bash
  git-filter-repo --path .env.production --invert-paths --force
  ```
  - [ ] Wait for completion
  - [ ] Check for errors
  - [ ] Review output

- [ ] **Cleanup References**
  ```bash
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
  ```

### Execution (Method B: Script)

- [ ] **Run Script**
  ```bash
  ./scripts/remove-env-from-git.sh
  ```
  - [ ] Follow interactive prompts
  - [ ] Confirm when asked
  - [ ] Wait for completion

### Post-Execution Checks

- [ ] Script/command completed without errors
- [ ] No crash or interruption
- [ ] Repository still accessible
- [ ] Git operations work (e.g., `git status`)

**Estimated Time**: 15-30 minutes

---

## Phase 6: Verification ⏳ PENDING

### Automated Verification

- [ ] **Run Verification Script**
  ```bash
  ./scripts/verify-credentials-removed.sh
  ```
  - [ ] All tests PASS
  - [ ] Zero FAIL results
  - [ ] Review any WARNINGS
  - [ ] Save output for records

### Manual Verification

- [ ] **File Removed from History**
  ```bash
  git log --all --full-history --oneline -- .env.production
  ```
  - [ ] Expected: Empty output or error

- [ ] **Search for Credential Patterns**
  ```bash
  git log --all --source --full-history -S "JWT_SECRET" --oneline
  git log --all --source --full-history -S "POSTGRES_PASSWORD" --oneline
  git log --all --source --full-history -S "GOOGLE_CLIENT_SECRET" --oneline
  ```
  - [ ] Expected: All empty

- [ ] **Repository Integrity**
  ```bash
  git fsck --full --strict
  ```
  - [ ] Expected: No errors (dangling commits OK)

- [ ] **Branch Verification**
  ```bash
  for branch in $(git branch -a | grep remotes); do
    echo "Checking $branch"
    git log $branch --full-history --oneline -- .env.production
  done
  ```
  - [ ] Expected: All empty

### Test Clone

- [ ] **Clone to Temp Directory**
  ```bash
  cd /tmp
  git clone /Users/kentino/FluxStudio test-fluxstudio
  cd test-fluxstudio
  git log --all --full-history -- .env.production
  ```
  - [ ] Expected: Empty
  - [ ] Cleanup: `rm -rf /tmp/test-fluxstudio`

**Estimated Time**: 15 minutes

---

## Phase 7: Force Push to Remote ⏳ PENDING

**WARNING**: This permanently changes remote history

### Pre-Push Checks

- [ ] Verification script passed
- [ ] Manual verification passed
- [ ] Test clone successful
- [ ] Backup confirmed safe
- [ ] Team in freeze (no one pushing)

### Force Push Execution

- [ ] **Push All Branches**
  ```bash
  git push origin --force --all
  ```
  - [ ] Wait for completion
  - [ ] Check for errors

- [ ] **Push All Tags**
  ```bash
  git push origin --force --tags
  ```
  - [ ] Wait for completion
  - [ ] Check for errors

### Remote Verification

- [ ] **Verify Remote Clean**
  ```bash
  git ls-remote origin | grep -i env.production
  ```
  - [ ] Expected: Empty output

- [ ] **Check Remote History**
  ```bash
  git log origin/master --oneline -- .env.production
  ```
  - [ ] Expected: Empty output

**Estimated Time**: 5-10 minutes

---

## Phase 8: Team Synchronization ⏳ PENDING

### Team Notification

- [ ] **Send Sync Instructions**
  - [ ] Use Template 3 from `docs/TEAM_COMMUNICATION_TEMPLATE.md`
  - [ ] Send immediately after force push
  - [ ] Include both sync methods
  - [ ] Provide troubleshooting section
  - [ ] Open support channel

### Support Window

- [ ] **Open Support Channels**
  - [ ] Slack channel: #git-sync-support
  - [ ] Email monitoring
  - [ ] Phone support available
  - [ ] Screen sharing ready

- [ ] **Track Team Progress**
  - [ ] Create tracking spreadsheet
  - [ ] Team members report completion
  - [ ] Follow up with stragglers
  - [ ] Help with issues

### Individual Team Member Checklist

Each developer must complete:

**Option 1: Reset (Recommended)**
```bash
git stash save "pre-sync-backup"
git fetch --all
git reset --hard origin/master
git clean -fdx
npm install
git log --all --full-history -- .env.production  # Verify
```

**Option 2: Fresh Clone**
```bash
cd ..
mv FluxStudio FluxStudio.old
git clone [REPO_URL] FluxStudio
cd FluxStudio
npm install
git log --all --full-history -- .env.production  # Verify
```

### Tracking

- [ ] Track each team member's status:
  - [ ] Name 1: ⏳ In Progress
  - [ ] Name 2: ⏳ In Progress
  - [ ] Name 3: ⏳ In Progress
  - [ ] Name 4: ⏳ In Progress

- [ ] Verify 100% completion before closing incident

**Estimated Time**: 2-4 hours

---

## Phase 9: Development Resume ⏳ PENDING

### Final Verification

- [ ] **All Team Members Synced**
  - [ ] 100% confirmed synced
  - [ ] All can commit locally
  - [ ] All can push to remote
  - [ ] No sync issues reported

- [ ] **System Health**
  - [ ] CI/CD pipeline green
  - [ ] All tests passing
  - [ ] Production services healthy
  - [ ] No error spikes in logs

### Resume Development

- [ ] **Send All-Clear Message**
  - [ ] Use Template 5 from `docs/TEAM_COMMUNICATION_TEMPLATE.md`
  - [ ] Announce development resumed
  - [ ] Thank team for cooperation
  - [ ] Remind of new security measures

- [ ] **Monitor First Hour**
  - [ ] Watch for git issues
  - [ ] Monitor error logs
  - [ ] Be available for questions
  - [ ] Track first commits/pushes

**Estimated Time**: 1 hour

---

## Phase 10: Post-Incident Activities ⏳ PENDING

### Immediate Follow-Up (Within 24h)

- [ ] **Verify No Issues**
  - [ ] No git problems reported
  - [ ] No authentication issues
  - [ ] No API failures
  - [ ] No service disruptions

- [ ] **Documentation**
  - [ ] Update incident log
  - [ ] Document actual timeline
  - [ ] Note any deviations from plan
  - [ ] Record lessons learned

### Short-Term Follow-Up (Within 1 week)

- [ ] **Post-Incident Review Meeting**
  - [ ] Schedule meeting
  - [ ] All key personnel attend
  - [ ] Review what went well
  - [ ] Identify improvements
  - [ ] Create action items

- [ ] **Security Training**
  - [ ] Schedule training session
  - [ ] Cover git security best practices
  - [ ] Demonstrate pre-commit hook
  - [ ] Q&A session

- [ ] **Process Documentation**
  - [ ] Update security playbook
  - [ ] Document this incident
  - [ ] Share lessons learned
  - [ ] Update onboarding materials

### Long-Term Follow-Up (Within 1 month)

- [ ] **Security Enhancements**
  - [ ] Implement CI/CD credential scanning
  - [ ] Evaluate secrets management solution
  - [ ] Set up automated security audits
  - [ ] Enable GitHub secret scanning

- [ ] **Process Improvements**
  - [ ] Update development workflow
  - [ ] Enhance code review process
  - [ ] Implement security checklist
  - [ ] Regular security audits

- [ ] **Team Capabilities**
  - [ ] Security champions program
  - [ ] Regular security training
  - [ ] Incident response drills
  - [ ] Security awareness culture

---

## Success Metrics

### Technical Success

- [ ] .env.production removed from all commits
- [ ] No credential patterns in git history
- [ ] All credentials rotated
- [ ] All services operational
- [ ] Repository integrity intact
- [ ] All team members synced
- [ ] Pre-commit hook preventing future issues

### Process Success

- [ ] Zero service downtime
- [ ] < 4 hours total team impact
- [ ] 100% team coordination
- [ ] Clear communication throughout
- [ ] No data loss
- [ ] No developer confusion

### Security Success

- [ ] No evidence of credential exploitation
- [ ] All exposed credentials invalidated
- [ ] Prevention measures in place
- [ ] Team educated on security
- [ ] No similar incidents for 90 days

---

## Emergency Procedures

### If Cleanup Fails

1. **STOP IMMEDIATELY**
2. **DO NOT FORCE PUSH**
3. **Run rollback script**:
   ```bash
   ./scripts/rollback-git-cleanup.sh
   ```
4. **Notify team**
5. **Investigate failure**
6. **Replan cleanup**

### If Force Push Fails

1. **STOP**
2. **Check remote status**
3. **Verify local repository integrity**
4. **Consult with team**
5. **DO NOT retry without investigation**

### If Team Sync Fails

1. **Provide 1-on-1 support**
2. **Use Template 6** for individual help
3. **Screen share if needed**
4. **Fresh clone as last resort**
5. **Document issues for process improvement**

---

## Checklist Summary

**Total Phases**: 10
**Completed**: ✅ 1/10
**In Progress**: ⏳ 1/10
**Pending**: ⏳ 8/10

**Estimated Total Time**: 12-20 hours (across multiple days)
**Critical Path**: Credential Rotation → Cleanup → Verification → Force Push → Team Sync

**Current Status**: Ready to begin Phase 2 (Credential Rotation)
**Blocker**: None
**Risk Level**: Medium (well-documented, tools in place)

---

## Document Control

**Version**: 1.0
**Last Updated**: 2025-10-17
**Next Review**: After each phase completion
**Owner**: Security Lead
**Distribution**: Security Team, Technical Lead, PM

---

## Quick Reference

### Key Commands

```bash
# Verify credentials in history
git log --all --full-history --oneline -- .env.production

# Run full verification
./scripts/verify-credentials-removed.sh

# Execute cleanup (method 1)
git-filter-repo --path .env.production --invert-paths --force

# Execute cleanup (method 2)
./scripts/remove-env-from-git.sh

# Verify removal
git log --all --full-history -- .env.production  # Should be empty

# Force push
git push origin --force --all
git push origin --force --tags

# Rollback if needed
./scripts/rollback-git-cleanup.sh
```

### Key Files

- Full Guide: `docs/GIT_HISTORY_CLEANUP.md`
- Quick Reference: `docs/GIT_CLEANUP_QUICK_REFERENCE.md`
- Communication: `docs/TEAM_COMMUNICATION_TEMPLATE.md`
- This Checklist: `docs/CREDENTIAL_CLEANUP_CHECKLIST.md`
- Incident Summary: `SECURITY_INCIDENT_GIT_CREDENTIALS.md`

### Emergency Contacts

- Security Lead: [NAME] - [PHONE]
- Technical Lead: [NAME] - [PHONE]
- Project Manager: [NAME] - [PHONE]
