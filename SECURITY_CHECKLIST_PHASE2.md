# FluxStudio Phase 2 Security Implementation Checklist

## CRITICAL (P0) - Complete Before Production (20 hours)

### 1. JWT Refresh Token Implementation (8 hours)
- [ ] Create refresh_tokens database table
- [ ] Implement generateTokenPair() function
  - [ ] Access token: 15-minute expiration
  - [ ] Refresh token: 7-day expiration
- [ ] Create POST /api/auth/refresh endpoint
- [ ] Create POST /api/auth/revoke endpoint
- [ ] Update login endpoints to return token pair
- [ ] Update client to handle token refresh
- [ ] Test token refresh flow
- [ ] Test token revocation

**Files to modify:**
- `/Users/kentino/FluxStudio/server-auth.js:326-340`
- `/Users/kentino/FluxStudio/src/services/apiService.ts:92-123`
- `/Users/kentino/FluxStudio/src/contexts/AuthContext.tsx:76-89`

**Acceptance Criteria:**
- Access tokens expire in 15 minutes
- Refresh tokens stored in database
- Client automatically refreshes expired tokens
- Logout revokes all refresh tokens

---

### 2. Credential Rotation (4 hours)
- [ ] Generate new JWT_SECRET (64 bytes)
- [ ] Generate new REFRESH_TOKEN_SECRET (64 bytes)
- [ ] Generate new ENCRYPTION_KEY (32 bytes)
- [ ] Generate new DB_PASSWORD (strong)
- [ ] Generate new REDIS_PASSWORD (strong)
- [ ] Update production .env.production
- [ ] Update database password in PostgreSQL
- [ ] Update Redis password
- [ ] Remove .env from git history
- [ ] Verify .gitignore is correct
- [ ] Deploy updated credentials to production

**Commands:**
```bash
# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Remove from git
git filter-branch --index-filter "git rm --cached --ignore-unmatch .env .env.production" HEAD
git push origin --force --all
```

**Verification:**
- [ ] No weak passwords in .env files
- [ ] All secrets are 32+ characters
- [ ] .env files not in git history
- [ ] Production servers using new credentials

---

### 3. XSS Vulnerability Remediation (8 hours)
- [ ] Install DOMPurify: `npm install dompurify @types/dompurify`
- [ ] Fix chart.tsx (dangerouslySetInnerHTML)
- [ ] Fix MobileFirstLayout.tsx (dangerouslySetInnerHTML)
- [ ] Fix HomepageAuth.tsx (dangerouslySetInnerHTML)
- [ ] Fix MobileOptimizedHero.tsx (dangerouslySetInnerHTML)
- [ ] Fix LazyImage.tsx (dangerouslySetInnerHTML)
- [ ] Fix MobileOptimizedHeader.tsx (dangerouslySetInnerHTML)
- [ ] Fix CollaborativeEditor.tsx (dangerouslySetInnerHTML)
- [ ] Fix Logo.js (innerHTML)
- [ ] Fix Login.tsx (dangerouslySetInnerHTML)
- [ ] Fix Signup.tsx (dangerouslySetInnerHTML)
- [ ] Test all affected components
- [ ] Verify no user content can execute scripts

**Code Pattern:**
```typescript
// BEFORE
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// AFTER
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}} />
```

**Files to modify:**
- `/Users/kentino/FluxStudio/src/components/ui/chart.tsx`
- `/Users/kentino/FluxStudio/src/components/MobileFirstLayout.tsx`
- `/Users/kentino/FluxStudio/src/components/HomepageAuth.tsx`
- `/Users/kentino/FluxStudio/src/components/MobileOptimizedHero.tsx`
- `/Users/kentino/FluxStudio/src/components/LazyImage.tsx`
- `/Users/kentino/FluxStudio/src/components/MobileOptimizedHeader.tsx`
- `/Users/kentino/FluxStudio/src/components/CollaborativeEditor.tsx`
- `/Users/kentino/FluxStudio/src/components/Logo.js`
- `/Users/kentino/FluxStudio/src/pages/Login.tsx`
- `/Users/kentino/FluxStudio/src/pages/Signup.tsx`

**Testing:**
- [ ] Attempt XSS: `<script>alert('XSS')</script>`
- [ ] Verify script tags are stripped
- [ ] Verify legitimate HTML works (bold, italic, links)

---

## HIGH PRIORITY (P1) - Phase 2 Week 2 (80 hours)

### 4. Multi-Factor Authentication (16 hours)
- [ ] Install speakeasy: `npm install speakeasy qrcode`
- [ ] Create user_mfa database table
- [ ] Create POST /api/auth/mfa/setup endpoint
- [ ] Create POST /api/auth/mfa/verify endpoint
- [ ] Create POST /api/auth/mfa/disable endpoint
- [ ] Update login flow to check MFA status
- [ ] Create MFA setup UI component
- [ ] Create MFA verification UI component
- [ ] Generate backup codes (10 codes)
- [ ] Test MFA enrollment flow
- [ ] Test MFA login flow
- [ ] Test backup code usage
- [ ] Test MFA disable flow

**Schema:**
```sql
CREATE TABLE user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mfa_type VARCHAR(20) NOT NULL DEFAULT 'totp',
  mfa_secret TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] Users can enable TOTP MFA
- [ ] QR code generated for authenticator apps
- [ ] Backup codes generated and hashed
- [ ] Login requires MFA when enabled
- [ ] Admin users required to enable MFA

---

### 5. Password Policy Enhancement (6 hours)
- [ ] Install zxcvbn: `npm install zxcvbn`
- [ ] Update password validation middleware
- [ ] Increase minimum length to 12 characters
- [ ] Require special character
- [ ] Implement zxcvbn strength checking (score >= 3)
- [ ] Create password_history table
- [ ] Prevent password reuse (last 5)
- [ ] Update signup UI with password strength meter
- [ ] Update password change UI
- [ ] Test weak passwords are rejected
- [ ] Test strong passwords are accepted

**Updated Validation:**
```javascript
const zxcvbn = require('zxcvbn');

function validatePasswordStrength(password, userInputs = []) {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(password)) {
    return { valid: false, error: 'Must contain uppercase, lowercase, number, and special character' };
  }

  const strength = zxcvbn(password, userInputs);
  if (strength.score < 3) {
    return { valid: false, error: `Weak password: ${strength.feedback.warning}` };
  }

  return { valid: true, score: strength.score };
}
```

**Files to modify:**
- `/Users/kentino/FluxStudio/middleware/security.js:102-119`
- `/Users/kentino/FluxStudio/src/pages/ModernSignup.tsx`
- `/Users/kentino/FluxStudio/src/pages/Profile.tsx`

---

### 6. Session Management Overhaul (12 hours)
- [ ] Create user_sessions table
- [ ] Move tokens from localStorage to httpOnly cookies
- [ ] Implement createSession() function
- [ ] Implement enforceSessionLimit() (max 5 sessions)
- [ ] Update login to create session record
- [ ] Update logout to invalidate session
- [ ] Create POST /api/auth/logout-all endpoint
- [ ] Create GET /api/auth/sessions endpoint (list active sessions)
- [ ] Create DELETE /api/auth/sessions/:id endpoint
- [ ] Update client to handle cookie-based auth
- [ ] Add device/location info to sessions
- [ ] Test concurrent session limits
- [ ] Test logout all devices

**Schema:**
```sql
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_name TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Cookie Configuration:**
```javascript
res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000
});
```

**Files to modify:**
- `/Users/kentino/FluxStudio/server-auth.js:410-475`
- `/Users/kentino/FluxStudio/src/contexts/AuthContext.tsx:50-74`
- `/Users/kentino/FluxStudio/src/services/apiService.ts:92-94`

---

### 7. Distributed Rate Limiting (6 hours)
- [ ] Install rate-limit-redis: `npm install rate-limit-redis`
- [ ] Configure Redis client
- [ ] Replace in-memory rate limiter with Redis store
- [ ] Add user-based rate limiting
- [ ] Add endpoint-specific limits
- [ ] Implement adaptive limits by user type
- [ ] Monitor rate limit violations
- [ ] Test rate limiting across multiple instances
- [ ] Verify limits persist across restarts

**Implementation:**
```javascript
const RedisStore = require('rate-limit-redis');

const apiRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

**Files to modify:**
- `/Users/kentino/FluxStudio/middleware/security.js:14-43`

---

### 8. Comprehensive Input Validation (12 hours)
- [ ] Install joi: `npm install joi`
- [ ] Create validation schemas for all endpoints
- [ ] Create validateRequest() middleware
- [ ] Apply to signup endpoint
- [ ] Apply to login endpoint
- [ ] Apply to file upload endpoint
- [ ] Apply to project creation endpoint
- [ ] Apply to team endpoints
- [ ] Implement file path validation
- [ ] Implement prototype pollution prevention
- [ ] Update validator or remove (has vulnerability)
- [ ] Test with malicious inputs

**Schemas:**
```javascript
const signupSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(12).max(128).required(),
  name: Joi.string().min(2).max(100).required(),
  userType: Joi.string().valid('client', 'designer', 'admin').required()
});
```

**Files to modify:**
- `/Users/kentino/FluxStudio/middleware/security.js:90-153`
- `/Users/kentino/FluxStudio/server-auth.js` (all endpoint handlers)

---

### 9. Log Sanitization (6 hours)
- [ ] Create sanitizeForLogging() utility
- [ ] Create maskEmail() utility
- [ ] Create anonymizeIP() utility
- [ ] Install winston: `npm install winston`
- [ ] Configure winston logger
- [ ] Replace all console.log with logger
- [ ] Add log sanitization transform
- [ ] Test sensitive data is masked
- [ ] Verify logs don't contain passwords
- [ ] Verify logs don't contain tokens

**Implementation:**
```javascript
function sanitizeForLogging(obj) {
  const SENSITIVE = ['password', 'token', 'secret', 'credential'];
  // Recursively mask sensitive fields
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
```

**Files to modify:**
- `/Users/kentino/FluxStudio/server-auth.js` (all console.log statements)
- `/Users/kentino/FluxStudio/middleware/security.js:185-213`
- `/Users/kentino/FluxStudio/security/security-hardening.js:249-289`

---

## Testing & Verification (12 hours)

### Security Testing Checklist
- [ ] Run npm audit and fix issues
- [ ] Install and run Snyk: `npx snyk test`
- [ ] Run OWASP ZAP scan
- [ ] Test JWT refresh token flow
- [ ] Test MFA enrollment and login
- [ ] Test password validation with weak/strong passwords
- [ ] Test rate limiting (hit limits, verify blocking)
- [ ] Test XSS prevention (inject scripts)
- [ ] Test session management (logout all devices)
- [ ] Test input validation (malicious payloads)
- [ ] Verify logs don't contain sensitive data
- [ ] Verify credentials are rotated

### Automated Testing
```bash
# Install security tools
npm install --save-dev snyk @owasp/dependency-check

# Run tests
npm audit
npx snyk test
npm run test:security

# Manual testing
# 1. Attempt SQL injection
# 2. Attempt XSS
# 3. Attempt CSRF (should be blocked)
# 4. Attempt rate limit bypass
# 5. Attempt token replay
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All P0 items completed
- [ ] All P1 items completed
- [ ] Security tests passing
- [ ] Manual testing completed
- [ ] Code review completed
- [ ] Documentation updated

### Deployment Steps
- [ ] Backup production database
- [ ] Rotate production credentials
- [ ] Update production .env
- [ ] Deploy new code to staging
- [ ] Run security tests on staging
- [ ] Deploy to production (blue-green)
- [ ] Verify health checks
- [ ] Monitor logs for errors
- [ ] Test critical flows (login, signup, MFA)

### Post-Deployment
- [ ] Monitor security events for 24 hours
- [ ] Review logs for anomalies
- [ ] Schedule Phase 3 planning
- [ ] Update security documentation
- [ ] Notify team of new security features

---

## Phase 3 Preview (P2 - Medium Priority)

Items to schedule after Phase 2 completion:
- [ ] Apple Sign In implementation (10h)
- [ ] Field-level encryption (16h)
- [ ] GDPR compliance features (20h)
- [ ] API versioning (8h)
- [ ] Request ID tracking (3h)
- [ ] Security monitoring setup (12h)

---

## Quick Reference

### Critical Files
- `/Users/kentino/FluxStudio/server-auth.js` - Authentication logic
- `/Users/kentino/FluxStudio/middleware/security.js` - Security middleware
- `/Users/kentino/FluxStudio/src/services/apiService.ts` - API client
- `/Users/kentino/FluxStudio/src/contexts/AuthContext.tsx` - Auth context
- `/Users/kentino/FluxStudio/.env.production` - Production config

### Key Commands
```bash
# Generate secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Test security
npm audit
npx snyk test

# Check for exposed secrets
git log -p | grep -i "password\|secret\|key"

# Remove from git history
git filter-branch --index-filter "git rm --cached --ignore-unmatch .env" HEAD
```

### Emergency Contacts
- Security Reviewer: [Contact for questions]
- Tech Lead: [Contact for architecture decisions]
- DevOps: [Contact for deployment issues]

---

**Estimated Total Time:** 100 hours
**Recommended Team Size:** 2 engineers
**Timeline:** 2 weeks
**Next Review:** After Phase 2 completion

**Document Version:** 1.0
**Last Updated:** October 13, 2025
