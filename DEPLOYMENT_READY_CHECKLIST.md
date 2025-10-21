# 🚀 Security Fixes Deployment Checklist

**Status**: ✅ Ready for Deployment
**Date**: 2025-10-13
**Priority**: CRITICAL - P0

---

## ✅ Completed Tasks

### 1. ✅ Install Dependencies
```bash
npm list cookie-parser
# Output: cookie-parser@1.4.7 ✓
```

### 2. ✅ Frontend CSRF Integration
- **File**: `src/services/apiService.ts`
  - Added CSRF token caching and automatic inclusion
  - Automatic retry on CSRF token expiration
  - Supports all state-changing methods (POST, PUT, DELETE, PATCH)

- **File**: `src/App.tsx`
  - Initialize CSRF token on app startup
  - Token fetched once and cached for performance

### 3. ✅ Helper Scripts Created
- `scripts/generate-secrets.sh` - Generate all secure credentials
- `scripts/test-auth-security.sh` - Test security implementation

---

## 📋 Pre-Deployment Steps

### Step 1: Generate New Credentials (⏱️ 5 minutes)

```bash
cd /Users/kentino/FluxStudio
./scripts/generate-secrets.sh
```

This will:
- Generate new JWT secret (64 bytes)
- Generate new database password (32 bytes)
- Generate new Redis password (32 bytes)
- Generate new Grafana password (32 bytes)
- Create `.env.production.new` file

**Manual Actions Required**:
1. **Rotate Google OAuth Credentials**:
   - Go to https://console.cloud.google.com/apis/credentials
   - Delete exposed Client ID: `65518208813-9ipe2nakc6sind9tbdppl6kr3dnh2gjb`
   - Create new OAuth 2.0 Client ID
   - Add authorized origins: `https://fluxstudio.art`, `https://www.fluxstudio.art`
   - Copy new Client ID and Secret to `.env.production.new`

2. **Update Email SMTP Password**:
   - Get new password from your email provider
   - Update `SMTP_PASS` in `.env.production.new`

---

### Step 2: Build Frontend with CSRF Support (⏱️ 2 minutes)

```bash
cd /Users/kentino/FluxStudio
npm run build
```

Expected output: Frontend built with CSRF token integration

---

### Step 3: Deploy to Production Server (⏱️ 10 minutes)

```bash
# 1. Backup current .env.production
ssh root@167.172.208.61 "cd /var/www/fluxstudio && cp .env.production .env.production.backup-$(date +%Y%m%d)"

# 2. Upload new environment file
scp .env.production.new root@167.172.208.61:/var/www/fluxstudio/.env.production

# 3. Upload new middleware
scp middleware/csrf.js root@167.172.208.61:/var/www/fluxstudio/middleware/

# 4. Upload updated server files
scp server-auth.js server-messaging.js root@167.172.208.61:/var/www/fluxstudio/

# 5. Upload updated database config
scp database/config.js root@167.172.208.61:/var/www/fluxstudio/database/

# 6. Upload built frontend
rsync -avz --delete build/ root@167.172.208.61:/var/www/fluxstudio/build/
```

---

### Step 4: Update Database Password (⏱️ 3 minutes)

```bash
ssh root@167.172.208.61

# Connect to PostgreSQL
sudo -u postgres psql

# Update password (use password from .env.production.new)
ALTER USER fluxstudio WITH PASSWORD 'NEW_PASSWORD_FROM_ENV';

# Verify
\du fluxstudio

# Exit
\q
exit
```

---

### Step 5: Update Redis Password (⏱️ 2 minutes)

```bash
ssh root@167.172.208.61

# Edit Redis config
sudo nano /etc/redis/redis.conf

# Find and update:
requirepass NEW_REDIS_PASSWORD

# Save and restart Redis
sudo systemctl restart redis

# Verify
redis-cli
AUTH NEW_REDIS_PASSWORD
PING  # Should return PONG

# Exit
exit
```

---

### Step 6: Restart Services (⏱️ 1 minute)

```bash
ssh root@167.172.208.61

cd /var/www/fluxstudio

# Restart all PM2 services
pm2 restart all

# Check status
pm2 status

# Monitor logs
pm2 logs --lines 50
```

---

### Step 7: Verify Deployment (⏱️ 5 minutes)

#### A. Health Check
```bash
curl -f https://fluxstudio.art/health
# Expected: {"status":"UP",...}
```

#### B. CSRF Token Endpoint
```bash
curl -c /tmp/cookies.txt https://fluxstudio.art/api/csrf-token
# Expected: {"csrfToken":"..."}
```

#### C. Run Security Tests
```bash
cd /Users/kentino/FluxStudio
./scripts/test-auth-security.sh https://fluxstudio.art
```

Expected output:
```
✓ PASS: CSRF token retrieved
✓ PASS: Request blocked without CSRF token (HTTP 403)
✓ PASS: Signup successful with CSRF token
✓ PASS: Login successful
✓ PASS: Profile retrieved successfully
✓ PASS: Invalid CSRF token blocked (HTTP 403)
```

---

## 🧪 Manual Testing Checklist

### Authentication Flows

- [ ] **Signup (Email/Password)**
  1. Go to https://fluxstudio.art/signup
  2. Enter email, password, name
  3. Submit form
  4. ✓ Should redirect to dashboard
  5. ✓ No CSRF errors in console

- [ ] **Login (Email/Password)**
  1. Go to https://fluxstudio.art/login
  2. Enter credentials
  3. Submit form
  4. ✓ Should redirect to dashboard
  5. ✓ No CSRF errors in console

- [ ] **Google OAuth Login**
  1. Click "Sign in with Google"
  2. Complete OAuth flow
  3. ✓ Should redirect to dashboard
  4. ✓ No errors (OAuth exempt from CSRF)

- [ ] **Logout**
  1. Click logout button
  2. ✓ Should redirect to home page
  3. ✓ Token cleared from localStorage

### API Operations

- [ ] **Create Organization (POST)**
  1. Navigate to /dashboard/organizations/create
  2. Fill form and submit
  3. ✓ Organization created successfully
  4. ✓ No CSRF errors

- [ ] **Update Profile (PUT)**
  1. Navigate to profile settings
  2. Update name/email
  3. Save changes
  4. ✓ Profile updated successfully

- [ ] **Upload File (POST)**
  1. Navigate to project
  2. Upload a file
  3. ✓ File uploaded successfully

---

## 🔍 Monitoring After Deployment

Monitor these metrics for 24 hours:

### 1. Error Logs
```bash
ssh root@167.172.208.61
pm2 logs --err --lines 100

# Watch for:
# - CSRF errors (should see if frontend not updated)
# - Authentication failures
# - Database connection errors
# - Redis connection errors
```

### 2. Application Metrics
- Authentication success rate (should remain ~98%)
- API response times (should not increase significantly)
- CSRF token fetch rate (should be low - cached on client)

### 3. Security Alerts
- No SQL injection attempts logged
- No CSRF bypass attempts
- No authentication bypass attempts

---

## ⚠️ Rollback Plan

If critical issues occur:

```bash
ssh root@167.172.208.61
cd /var/www/fluxstudio

# 1. Restore old environment
mv .env.production .env.production.new-failed
mv .env.production.backup-YYYYMMDD .env.production

# 2. Restore old server files
git checkout HEAD -- server-auth.js server-messaging.js database/config.js

# 3. Remove CSRF middleware
rm middleware/csrf.js

# 4. Restart services
pm2 restart all

# 5. Verify
curl https://fluxstudio.art/health
```

---

## 📊 Success Criteria

Deployment is successful when:

- ✅ All health checks pass
- ✅ Authentication flows work (signup, login, OAuth)
- ✅ CSRF protection blocks requests without tokens
- ✅ No errors in production logs
- ✅ API response times < 50ms (p95)
- ✅ No user-reported authentication issues
- ✅ Security tests pass 100%

---

## 📞 Support

**Issues During Deployment?**

1. Check PM2 logs: `pm2 logs --err`
2. Check nginx logs: `tail -f /var/log/nginx/error.log`
3. Review this checklist for missed steps
4. Execute rollback plan if needed

**After Deployment:**

- Monitor logs for 24 hours
- Run security tests daily for first week
- Schedule next credential rotation in 90 days

---

## 📚 Related Documentation

- `PHASE_1_SECURITY_FIXES_COMPLETE.md` - Detailed security fixes
- `SECURITY_CREDENTIAL_ROTATION.md` - Credential rotation procedures
- `middleware/csrf.js` - CSRF implementation details
- `scripts/generate-secrets.sh` - Secret generation tool
- `scripts/test-auth-security.sh` - Security test suite

---

**Estimated Total Time**: 30-40 minutes
**Critical Path**: Credential rotation → Database/Redis updates → Service restart
**Risk Level**: Medium (rollback plan available)
