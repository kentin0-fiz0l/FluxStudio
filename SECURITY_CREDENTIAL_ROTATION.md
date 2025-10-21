# Security Credential Rotation Guide

**CRITICAL: Action Required Immediately**

The `.env.production` file was previously committed to version control with exposed credentials. Follow these steps to secure your production environment.

## 1. Rotate All Exposed Credentials

### Google OAuth Credentials
**Status**: EXPOSED Google Client ID `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb.apps.googleusercontent.com`

**Action Required**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Delete the exposed OAuth 2.0 Client ID
3. Create a new OAuth 2.0 Client ID with these authorized origins:
   - `https://fluxstudio.art`
   - `https://www.fluxstudio.art`
4. Update `.env.production` with new credentials
5. Update frontend build with new `VITE_GOOGLE_CLIENT_ID`

### JWT Secret
**Status**: Template value exposed (assumed compromised)

**Action Required**:
```bash
# Generate new JWT secret (64 bytes)
openssl rand -base64 64

# Update .env.production with generated value
JWT_SECRET=<generated_value>
```

**Impact**: All existing user sessions will be invalidated. Users must re-login.

### Database Password
**Status**: Template value exposed

**Action Required**:
```bash
# Generate strong password
openssl rand -base64 32

# Update PostgreSQL password
psql -U postgres
ALTER USER fluxstudio WITH PASSWORD 'new_secure_password';

# Update .env.production
DATABASE_URL=postgresql://fluxstudio:new_secure_password@postgres:5432/fluxstudio
POSTGRES_PASSWORD=new_secure_password
```

### Redis Password
**Status**: Template value exposed

**Action Required**:
```bash
# Generate strong password
openssl rand -base64 32

# Update Redis configuration (/etc/redis/redis.conf)
requirepass new_secure_password

# Restart Redis
sudo systemctl restart redis

# Update .env.production
REDIS_URL=redis://:new_secure_password@redis:6379
REDIS_PASSWORD=new_secure_password
```

### SMTP Password
**Action Required**: Update email service password and update `SMTP_PASS` in `.env.production`

### Grafana Admin Password
**Action Required**:
```bash
# Generate strong password
openssl rand -base64 32

# Reset Grafana admin password
grafana-cli admin reset-admin-password <new_password>

# Update .env.production
GRAFANA_ADMIN_PASSWORD=<new_password>
```

## 2. Clean Git History (Optional but Recommended)

The exposed credentials are in Git history. Consider:

```bash
# WARNING: This rewrites history. Coordinate with team.
# Create backup first
git branch backup-before-cleanup

# Remove .env.production from all history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (after team coordination)
git push origin --force --all
```

## 3. Verify Security Configuration

After rotation:

```bash
# Verify .env.production is not tracked
git status

# Should show: .env.production
# Should NOT show in "Changes to be committed"

# Verify .gitignore
cat .gitignore | grep .env.production
# Should output: .env.production

# Test authentication
curl -X POST https://fluxstudio.art/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 4. Update Production Deployment

```bash
# SSH to production server
ssh root@167.172.208.61

# Update .env.production with new credentials
cd /var/www/fluxstudio
nano .env.production

# Restart services
pm2 restart all

# Verify services are running
pm2 status
pm2 logs --lines 50
```

## 5. Security Checklist

- [ ] Google OAuth credentials rotated
- [ ] JWT secret regenerated (64+ character)
- [ ] Database password rotated (32+ character)
- [ ] Redis password rotated (32+ character)
- [ ] SMTP password updated
- [ ] Grafana password rotated
- [ ] `.env.production` removed from Git tracking
- [ ] `.env.production.example` created with placeholders
- [ ] Git history cleaned (optional)
- [ ] Production deployment updated
- [ ] All services restarted and verified
- [ ] Test authentication flow works
- [ ] Monitor error logs for 24 hours

## 6. Prevention Measures

### Implemented:
- ✅ `.env.production` added to `.gitignore`
- ✅ `.env.production.example` template created
- ✅ Security guide documented

### Recommended:
- [ ] Set up pre-commit hooks to prevent credential commits
- [ ] Use secret management service (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable GitHub secret scanning alerts
- [ ] Implement automated credential rotation (90-day cycle)
- [ ] Set up monitoring for exposed credentials

## 7. Emergency Contact

If credentials were actively exploited:
1. Immediately disable compromised accounts
2. Review access logs for unauthorized activity
3. Notify affected users if data breach occurred
4. Consider security audit

---

**Timeline**: Complete all credential rotation within 24 hours of this guide creation.

**Priority**: CRITICAL - P0

**Estimated Time**: 2-3 hours
