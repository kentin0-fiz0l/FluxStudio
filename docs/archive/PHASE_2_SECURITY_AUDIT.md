# FluxStudio Phase 2+ Security Audit Report

**Date:** October 13, 2025
**Auditor:** Security Reviewer, Flux Studio
**Scope:** Comprehensive security assessment following Phase 1 security hardening
**Environment:** Production-ready deployment assessment

---

## Executive Summary

This audit identifies **23 security concerns** across 6 categories requiring attention in Phase 2 and beyond. While Phase 1 successfully addressed critical infrastructure vulnerabilities (CSRF, SSL, SQL injection prevention), significant gaps remain in authentication mechanisms, secret management, API security, and data protection.

**Critical Findings:** 3
**High Priority:** 8
**Medium Priority:** 7
**Low Priority:** 5

**Recommendation:** Address all Critical and High priority items before production deployment. Medium priority items should be scheduled for Phase 2, and Low priority items for Phase 3.

---

## 1. Authentication & Authorization

### CRITICAL: JWT Tokens Lack Refresh Mechanism (P0)
**Severity:** CRITICAL
**Risk Exposure:** Users must re-authenticate every 7 days. No token rotation. Compromised tokens remain valid for full duration.

**Current Implementation:**
```javascript
// server-auth.js:326-330
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, userType: user.userType },
    JWT_SECRET,
    { expiresIn: '7d' } // Fixed 7-day expiration, no refresh
  );
}
```

**Issues:**
- No refresh token mechanism
- Long-lived access tokens (7 days) increase attack window
- No token revocation capability
- Compromised tokens cannot be invalidated server-side

**Recommended Mitigation:**
```javascript
// Implement dual-token system
function generateTokenPair(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, userType: user.userType },
    JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  // Store refresh token in database with user_id, expires_at, revoked flag
  await storeRefreshToken(user.id, refreshToken);

  return { accessToken, refreshToken };
}

// Add token refresh endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  // Validate refresh token, check if revoked, issue new access token
});

// Add token revocation endpoint
app.post('/api/auth/revoke', authenticateToken, async (req, res) => {
  // Mark refresh tokens as revoked in database
  await revokeUserTokens(req.user.id);
});
```

**Implementation Effort:** 8 hours
**Priority:** P0 - Must complete before production

---

### CRITICAL: Weak Default Credentials Exposed (P0)
**Severity:** CRITICAL
**Risk Exposure:** Default admin credentials and weak secrets committed to repository.

**Exposed Credentials (.env file):**
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=flux-studio-secret-key-2025
DB_PASSWORD=postgres
```

**Issues:**
- Weak, predictable credentials in development environment
- `.env` file partially gitignored but `.env.production` was modified (git status shows it)
- JWT secret is weak and predictable
- Default PostgreSQL password used

**Recommended Mitigation:**
1. **Immediate Actions:**
   - Generate cryptographically secure secrets: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - Rotate all production credentials immediately
   - Remove all credentials from git history: `git filter-branch --index-filter "git rm --cached --ignore-unmatch .env .env.production"`
   - Update `.gitignore` (already correct, but verify enforcement)

2. **Long-term Solutions:**
   - Implement secrets management (AWS Secrets Manager, HashiCorp Vault, or Doppler)
   - Use environment-specific secrets
   - Enforce password complexity policy server-side
   - Implement mandatory password change on first login

**Implementation Effort:** 4 hours
**Priority:** P0 - Complete immediately

---

### HIGH: No Multi-Factor Authentication (P1)
**Severity:** HIGH
**Risk Exposure:** Account takeover via compromised passwords. No second factor protection.

**Current State:**
- Email/password authentication only
- Google OAuth (no MFA enforcement)
- No TOTP, SMS, or hardware key support

**Recommended Mitigation:**
```javascript
// Add MFA schema
CREATE TABLE user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mfa_type VARCHAR(20) NOT NULL, -- 'totp', 'sms', 'backup_codes'
  mfa_secret TEXT NOT NULL, -- Encrypted TOTP secret or phone
  is_enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  backup_codes TEXT[], -- Hashed backup codes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Implement TOTP with speakeasy/otplib
const speakeasy = require('speakeasy');

app.post('/api/auth/mfa/setup', authenticateToken, async (req, res) => {
  const secret = speakeasy.generateSecret({ name: 'FluxStudio' });
  // Store encrypted secret, return QR code
});

app.post('/api/auth/mfa/verify', authenticateToken, async (req, res) => {
  const { token } = req.body;
  // Verify TOTP token, enable MFA
});

app.post('/api/auth/login', async (req, res) => {
  // After password validation
  if (user.mfa_enabled) {
    return res.json({ requiresMFA: true, tempToken: generateTempToken(user.id) });
  }
  // Otherwise proceed with login
});
```

**Implementation Effort:** 16 hours
**Priority:** P1 - Phase 2 requirement

---

### HIGH: Password Policy Insufficient (P1)
**Severity:** HIGH
**Risk Exposure:** Weak passwords can be brute-forced.

**Current Implementation:**
```javascript
// middleware/security.js:105-117
if (password.length < 8) {
  return res.status(400).json({ error: 'Password must be at least 8 characters long' });
}
if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
  return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and number' });
}
```

**Issues:**
- No special character requirement
- Minimum length of 8 is weak (NIST recommends 12+)
- No password complexity scoring (zxcvbn)
- No check against common password lists
- No rate limiting on password validation endpoint
- No prevention of password reuse

**Recommended Mitigation:**
```javascript
const zxcvbn = require('zxcvbn');

function validatePasswordStrength(password, userInputs = []) {
  // Enhanced validation
  const errors = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(password)) {
    errors.push('Password must contain uppercase, lowercase, number, and special character');
  }

  // Use zxcvbn for advanced strength checking
  const strength = zxcvbn(password, userInputs);
  if (strength.score < 3) {
    errors.push(`Password is too weak: ${strength.feedback.warning || 'Try a more complex password'}`);
  }

  // Check against common password list (have-i-been-pwned API)
  const isCompromised = await checkPwnedPassword(password);
  if (isCompromised) {
    errors.push('This password has been exposed in data breaches. Choose a different password.');
  }

  return { isValid: errors.length === 0, errors, score: strength.score };
}

// Add password history check
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Prevent password reuse (last 5 passwords)
async function checkPasswordHistory(userId, newPassword) {
  const history = await query(
    'SELECT password_hash FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
    [userId]
  );

  for (const record of history.rows) {
    if (await bcrypt.compare(newPassword, record.password_hash)) {
      throw new Error('Cannot reuse recent passwords');
    }
  }
}
```

**Implementation Effort:** 6 hours
**Priority:** P1 - Phase 2 requirement

---

### HIGH: Session Management Weaknesses (P1)
**Severity:** HIGH
**Risk Exposure:** No session timeout, no concurrent session limits, no device tracking.

**Current Implementation:**
```javascript
// AuthContext.tsx:52-73 - localStorage only, no server-side session management
const token = localStorage.getItem('auth_token');
```

**Issues:**
- JWT stored in localStorage (vulnerable to XSS)
- No server-side session tracking
- No concurrent session limits
- No device fingerprinting
- No session invalidation on password change
- No "logout everywhere" functionality

**Recommended Mitigation:**
```javascript
// Store tokens in httpOnly cookies (more secure than localStorage)
app.post('/api/auth/login', async (req, res) => {
  const { accessToken, refreshToken } = generateTokenPair(user);

  // Set tokens in httpOnly cookies
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Track session in database
  await createSession({
    userId: user.id,
    refreshToken: hashToken(refreshToken),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  return res.json({ user });
});

// Add session management schema
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

// Implement concurrent session limits
const MAX_SESSIONS_PER_USER = 5;

async function enforceSessionLimit(userId) {
  const sessions = await query(
    'SELECT id FROM user_sessions WHERE user_id = $1 AND is_active = true ORDER BY last_activity DESC',
    [userId]
  );

  if (sessions.rows.length >= MAX_SESSIONS_PER_USER) {
    // Revoke oldest sessions
    const sessionsToRevoke = sessions.rows.slice(MAX_SESSIONS_PER_USER - 1);
    await query(
      'UPDATE user_sessions SET is_active = false WHERE id = ANY($1)',
      [sessionsToRevoke.map(s => s.id)]
    );
  }
}

// Add "logout everywhere" endpoint
app.post('/api/auth/logout-all', authenticateToken, async (req, res) => {
  await query(
    'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
    [req.user.id]
  );
  res.json({ message: 'Logged out from all devices' });
});
```

**Implementation Effort:** 12 hours
**Priority:** P1 - Phase 2 requirement

---

### MEDIUM: OAuth Implementation Incomplete (P2)
**Severity:** MEDIUM
**Risk Exposure:** Apple Sign In not implemented. Google OAuth lacks state parameter for CSRF protection.

**Current Implementation:**
```javascript
// server-auth.js:478-557 - Google OAuth implemented
// server-auth.js:998-1015 - Apple OAuth returns 501 Not Implemented
```

**Issues:**
- Apple Sign In returns HTTP 501 (not implemented)
- No OAuth state parameter validation (CSRF vulnerability)
- No nonce validation for ID tokens
- OAuth tokens not stored for API access
- No OAuth account linking mechanism

**Recommended Mitigation:**
```javascript
// Add OAuth state/nonce management
const oauthStates = new Map(); // Use Redis in production

app.get('/api/auth/google/init', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(32).toString('hex');

  oauthStates.set(state, { nonce, createdAt: Date.now() });

  // Return state to client for OAuth redirect
  res.json({ state, nonce });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential, state } = req.body;

  // Validate state parameter
  const savedState = oauthStates.get(state);
  if (!savedState || Date.now() - savedState.createdAt > 600000) {
    return res.status(403).json({ error: 'Invalid or expired OAuth state' });
  }
  oauthStates.delete(state);

  // Verify token with nonce
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID,
    nonce: savedState.nonce
  });

  // Continue with user creation/login
});

// Implement Apple Sign In
const appleSignin = require('apple-signin-auth');

app.post('/api/auth/apple', async (req, res) => {
  const { code, state } = req.body;

  // Verify state parameter
  const savedState = oauthStates.get(state);
  if (!savedState) {
    return res.status(403).json({ error: 'Invalid OAuth state' });
  }

  try {
    const appleUser = await appleSignin.verifyIdToken(code, {
      audience: APPLE_CLIENT_ID,
      nonce: savedState.nonce
    });

    // Process Apple user data (similar to Google flow)
  } catch (error) {
    return res.status(401).json({ error: 'Apple authentication failed' });
  }
});
```

**Implementation Effort:** 10 hours
**Priority:** P2 - Phase 2 enhancement

---

### LOW: Account Lockout Not Implemented (P3)
**Severity:** LOW
**Risk Exposure:** Unlimited login attempts allow brute force attacks (partially mitigated by rate limiting).

**Current State:**
- Rate limiting implemented (5 attempts per 15 minutes)
- No account-level lockout after repeated failures
- No CAPTCHA after failed attempts

**Recommended Mitigation:**
```javascript
// Add login attempt tracking
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  ip_address INET,
  success BOOLEAN,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Implement account lockout
async function checkAccountLockout(email) {
  const recentFailures = await query(`
    SELECT COUNT(*) as failures
    FROM login_attempts
    WHERE email = $1
    AND success = false
    AND attempted_at > NOW() - INTERVAL '1 hour'
  `, [email]);

  if (recentFailures.rows[0].failures >= 10) {
    throw new Error('Account temporarily locked due to multiple failed login attempts. Try again in 1 hour.');
  }
}

// Add CAPTCHA after 3 failed attempts
if (recentFailures >= 3) {
  return res.json({ requiresCaptcha: true });
}
```

**Implementation Effort:** 4 hours
**Priority:** P3 - Phase 3 enhancement

---

## 2. API Security

### HIGH: Rate Limiting Configuration Weak (P1)
**Severity:** HIGH
**Risk Exposure:** Current rate limits may not prevent sophisticated attacks. No distributed rate limiting.

**Current Implementation:**
```javascript
// middleware/security.js:14-31
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100, // 100 requests per 15 minutes

// Auth endpoints
max: 5, // 5 login attempts per 15 minutes
```

**Issues:**
- Uses in-memory rate limiting (resets on server restart)
- No distributed rate limiting across multiple server instances
- Rate limits applied per IP only (can be bypassed with proxy/VPN)
- No user-based rate limiting
- No adaptive rate limiting based on behavior

**Recommended Mitigation:**
```javascript
// Use Redis for distributed rate limiting
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

const apiRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// Implement user-based rate limiting
const userRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:user:'
  }),
  keyGenerator: (req) => req.user?.id || req.ip,
  windowMs: 15 * 60 * 1000,
  max: async (req) => {
    // Adaptive limits based on user tier
    if (req.user?.userType === 'admin') return 500;
    if (req.user?.isPremium) return 200;
    return 100;
  }
});

// Add endpoint-specific rate limits
const fileUploadLimiter = rateLimit({
  store: new RedisStore({ client: redisClient, prefix: 'rl:upload:' }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  skipSuccessfulRequests: false
});

app.use('/api/files/upload', fileUploadLimiter);

// Monitor rate limit violations
app.use((req, res, next) => {
  if (req.rateLimit && req.rateLimit.remaining === 0) {
    logSecurityEvent('rate_limit_exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      endpoint: req.path,
      userAgent: req.get('user-agent')
    });
  }
  next();
});
```

**Implementation Effort:** 6 hours
**Priority:** P1 - Required for production scale

---

### HIGH: Input Validation Gaps (P1)
**Severity:** HIGH
**Risk Exposure:** NoSQL injection, path traversal, prototype pollution risks.

**Current Implementation:**
```javascript
// middleware/security.js:121-129 - Basic sanitization only
sanitizeInput: (req, res, next) => {
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = validator.escape(req.body[key].trim());
    }
  }
  next();
}
```

**Issues:**
- Escape-only approach doesn't prevent NoSQL injection
- No nested object validation
- No array validation
- No file path validation
- No JSON schema validation
- Validator package has known vulnerability (GHSA-9965-vmph-33xx)

**Recommended Mitigation:**
```javascript
// Upgrade validator or switch to joi/zod for comprehensive validation
const Joi = require('joi');

// Define schemas for all endpoints
const signupSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(12).max(128).required(),
  name: Joi.string().min(2).max(100).required(),
  userType: Joi.string().valid('client', 'designer', 'admin').required()
});

const fileUploadSchema = Joi.object({
  name: Joi.string().max(255).pattern(/^[a-zA-Z0-9._-]+$/).required(),
  description: Joi.string().max(1000).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
});

// Validation middleware
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    req.validatedBody = value;
    next();
  };
}

// Apply to routes
app.post('/api/auth/signup', validateRequest(signupSchema), async (req, res) => {
  const { email, password, name, userType } = req.validatedBody;
  // Process validated input
});

// File path validation to prevent directory traversal
function validateFilePath(filePath) {
  const normalized = path.normalize(filePath);
  const uploadDir = path.resolve(UPLOADS_DIR);
  const resolved = path.resolve(uploadDir, normalized);

  if (!resolved.startsWith(uploadDir)) {
    throw new Error('Invalid file path: directory traversal detected');
  }

  return resolved;
}

// Prevent prototype pollution
function deepFreeze(obj) {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}
```

**Implementation Effort:** 12 hours
**Priority:** P1 - Phase 2 requirement

---

### MEDIUM: API Versioning Not Implemented (P2)
**Severity:** MEDIUM
**Risk Exposure:** Breaking changes impact all clients. No graceful deprecation path.

**Current State:**
- All endpoints at `/api/*` with no version prefix
- No API versioning strategy
- Breaking changes will impact all clients

**Recommended Mitigation:**
```javascript
// Implement API versioning
app.use('/api/v1', require('./routes/v1'));
app.use('/api/v2', require('./routes/v2'));

// Default to latest version
app.use('/api', (req, res, next) => {
  req.url = `/v2${req.url}`;
  next();
}, require('./routes/v2'));

// Add version header support
app.use((req, res, next) => {
  const apiVersion = req.get('X-API-Version') || '2';
  req.apiVersion = `v${apiVersion}`;
  res.setHeader('X-API-Version', apiVersion);
  next();
});

// Deprecation warnings
app.use('/api/v1', (req, res, next) => {
  res.setHeader('X-API-Deprecated', 'true');
  res.setHeader('X-API-Sunset', '2026-01-01');
  next();
});
```

**Implementation Effort:** 8 hours
**Priority:** P2 - Before v2 features

---

### MEDIUM: No Request ID Tracking (P2)
**Severity:** MEDIUM
**Risk Exposure:** Difficult to trace requests across services. Poor debugging capability.

**Current State:**
- No request correlation ID
- Logs don't track requests end-to-end
- Difficult to debug issues across microservices

**Recommended Mitigation:**
```javascript
// Add request ID middleware
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.id = req.get('X-Request-ID') || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Update all logs to include request ID
console.log(`[${req.id}] User ${req.user?.id} accessed ${req.path}`);

// Update security logging
function logSecurityEvent(event, details) {
  console.log(JSON.stringify({
    requestId: details.requestId,
    timestamp: new Date().toISOString(),
    event,
    ...details
  }));
}
```

**Implementation Effort:** 3 hours
**Priority:** P2 - Operations improvement

---

### LOW: API Documentation Missing Security Section (P3)
**Severity:** LOW
**Risk Exposure:** Developers may not understand security requirements.

**Recommended Mitigation:**
- Document authentication requirements
- Document rate limits per endpoint
- Document CSRF token requirements
- Provide security best practices guide

**Implementation Effort:** 4 hours
**Priority:** P3 - Documentation improvement

---

## 3. Data Protection

### HIGH: Sensitive Data in Logs (P1)
**Severity:** HIGH
**Risk Exposure:** Credentials, tokens, and PII may be logged.

**Current Implementation:**
```javascript
// server-auth.js:480-485 - Logs OAuth credential in error
console.error('Google OAuth error details:', {
  message: error.message,
  hasCredential: !!req.body.credential,
  credentialLength: req.body.credential ? req.body.credential.length : 0
  // Note: Credential not logged for security
});
```

**Issues:**
- Password could be logged on validation errors
- User email logged in plain text
- IP addresses logged without anonymization
- No log sanitization framework
- OAuth tokens could leak in error scenarios

**Recommended Mitigation:**
```javascript
// Implement log sanitization utility
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'credential', 'authorization'];

function sanitizeForLogging(obj, depth = 0) {
  if (depth > 5) return '[MAX_DEPTH]';
  if (obj === null || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (key === 'email') {
      sanitized[key] = maskEmail(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '[INVALID_EMAIL]';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function anonymizeIP(ip) {
  if (ip.includes('.')) {
    // IPv4
    return ip.split('.').slice(0, 3).join('.') + '.0';
  } else {
    // IPv6
    return ip.split(':').slice(0, 3).join(':') + '::';
  }
}

// Update all logging calls
console.log('Login attempt:', sanitizeForLogging({
  email: req.body.email,
  ip: anonymizeIP(req.ip),
  userAgent: req.get('user-agent')
}));

// Configure logging framework (winston/pino)
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'combined.log',
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// Add transform to sanitize all log output
logger.format.transforms.push((info) => sanitizeForLogging(info));
```

**Implementation Effort:** 6 hours
**Priority:** P1 - Required for compliance

---

### MEDIUM: No Data Encryption at Rest (P2)
**Severity:** MEDIUM
**Risk Exposure:** Database breach exposes all user data in plain text.

**Current State:**
- PostgreSQL database stores data unencrypted
- File uploads stored unencrypted on disk
- No field-level encryption for sensitive data

**Recommended Mitigation:**
```javascript
// Implement field-level encryption for sensitive data
const crypto = require('crypto');

class FieldEncryption {
  constructor(encryptionKey) {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedText) {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

const encryption = new FieldEncryption(process.env.ENCRYPTION_KEY);

// Encrypt sensitive fields before storage
async function createUser(userData) {
  if (userData.phone) {
    userData.phone = encryption.encrypt(userData.phone);
  }
  if (userData.address) {
    userData.address = encryption.encrypt(JSON.stringify(userData.address));
  }
  // Store encrypted data
}

// Enable PostgreSQL transparent data encryption (TDE)
// Or use AWS RDS encryption, Azure Disk Encryption, etc.

// Encrypt file uploads
const encryptedStorage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Encrypt file after upload
async function encryptFile(filePath) {
  const input = fs.createReadStream(filePath);
  const output = fs.createWriteStream(`${filePath}.enc`);

  const cipher = crypto.createCipheriv(
    'aes-256-ctr',
    encryption.key,
    crypto.randomBytes(16)
  );

  await pipeline(input, cipher, output);
  fs.unlinkSync(filePath); // Remove unencrypted file
}
```

**Implementation Effort:** 16 hours
**Priority:** P2 - Compliance requirement (GDPR)

---

### MEDIUM: PII Data Handling Non-Compliant (P2)
**Severity:** MEDIUM
**Risk Exposure:** GDPR/CCPA violations. No data retention policy.

**Current State:**
- No data retention policy
- No automated data deletion
- No user data export functionality
- No audit trail for data access

**Recommended Mitigation:**
```javascript
// Implement GDPR compliance features

// Right to access (data export)
app.get('/api/user/export', authenticateToken, async (req, res) => {
  const userData = await query(`
    SELECT
      u.*,
      array_agg(DISTINCT p.name) as projects,
      array_agg(DISTINCT f.name) as files
    FROM users u
    LEFT JOIN projects p ON p.created_by = u.id
    LEFT JOIN files f ON f.uploaded_by = u.id
    WHERE u.id = $1
    GROUP BY u.id
  `, [req.user.id]);

  // Return all user data as JSON download
  res.json(userData.rows[0]);
});

// Right to deletion (account deletion)
app.delete('/api/user/account', authenticateToken, async (req, res) => {
  await transaction(async (client) => {
    // Soft delete with 30-day grace period
    await client.query(`
      UPDATE users
      SET
        is_active = false,
        deletion_requested_at = NOW(),
        deletion_scheduled_at = NOW() + INTERVAL '30 days'
      WHERE id = $1
    `, [req.user.id]);

    // Log deletion request for audit
    await client.query(`
      INSERT INTO audit_log (user_id, action, details)
      VALUES ($1, 'account_deletion_requested', $2)
    `, [req.user.id, JSON.stringify({ ip: req.ip })]);
  });

  res.json({ message: 'Account deletion scheduled' });
});

// Automated data retention cleanup
const cron = require('node-cron');

cron.schedule('0 2 * * *', async () => {
  // Delete accounts past deletion date
  const result = await query(`
    DELETE FROM users
    WHERE deletion_scheduled_at < NOW()
    RETURNING id, email
  `);

  console.log(`Deleted ${result.rowCount} user accounts:`, result.rows);

  // Delete old logs (90-day retention)
  await query(`
    DELETE FROM audit_log
    WHERE created_at < NOW() - INTERVAL '90 days'
  `);
});

// Data access audit trail
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

// Log all data access
function auditDataAccess(req, action, resourceType, resourceId) {
  query(`
    INSERT INTO audit_log (user_id, action, resource_type, resource_id, ip_address, details)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    req.user?.id,
    action,
    resourceType,
    resourceId,
    req.ip,
    { userAgent: req.get('user-agent'), requestId: req.id }
  ]);
}
```

**Implementation Effort:** 20 hours
**Priority:** P2 - Legal compliance requirement

---

### LOW: Backup Security Not Addressed (P3)
**Severity:** LOW
**Risk Exposure:** Backups may not be encrypted. No secure backup storage.

**Current Implementation:**
```javascript
// database/config.js:262-306 - Basic backup without encryption
async function createBackup() {
  // Uses pg_dump without encryption
}
```

**Recommended Mitigation:**
```javascript
// Encrypt backups with GPG
const { spawn } = require('child_process');

async function createEncryptedBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-${timestamp}.sql`;
  const encryptedFile = `${backupFile}.gpg`;

  // Create backup
  const pgDump = spawn('pg_dump', ['-h', dbConfig.host, ...]);
  const gpgEncrypt = spawn('gpg', [
    '--encrypt',
    '--recipient', process.env.BACKUP_GPG_KEY,
    '--output', encryptedFile
  ]);

  pgDump.stdout.pipe(gpgEncrypt.stdin);

  // Upload to S3 with server-side encryption
  await uploadToS3(encryptedFile, {
    ServerSideEncryption: 'AES256',
    StorageClass: 'GLACIER' // Cost-effective long-term storage
  });

  // Implement 3-2-1 backup strategy
  // 3 copies, 2 different media, 1 offsite
}

// Automated backup verification
async function verifyBackup(backupFile) {
  // Attempt to restore to test database
  // Verify data integrity
}

// Backup retention policy
async function pruneOldBackups() {
  // Keep: Daily backups for 7 days, Weekly for 4 weeks, Monthly for 12 months
}
```

**Implementation Effort:** 8 hours
**Priority:** P3 - Operations improvement

---

## 4. Infrastructure Security

### MEDIUM: Database Connection Pool Misconfigured (P2)
**Severity:** MEDIUM
**Risk Exposure:** Connection exhaustion, performance degradation.

**Current Implementation:**
```javascript
// database/config.js:20-24
max: process.env.NODE_ENV === 'production' ? 30 : 20,
min: process.env.NODE_ENV === 'production' ? 5 : 2,
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 2000,
```

**Issues:**
- Connection timeout too aggressive (2 seconds)
- Pool size not tuned for load
- No connection retry logic
- Excessive logging on every connection

**Recommended Mitigation:**
```javascript
const dbConfig = {
  // Tuned for production load
  max: 50, // Increase for high concurrency
  min: 10, // Keep warm connections
  idleTimeoutMillis: 60000, // 1 minute
  connectionTimeoutMillis: 5000, // 5 seconds (more realistic)
  acquireTimeoutMillis: 30000, // 30 seconds

  // Connection health checks
  idleTransactionTimeout: 10000,
  connectionCheckInterval: 30000,

  // Retry logic
  retry: {
    max: 3,
    backoff: 1000
  }
};

// Reduce logging verbosity in production
if (process.env.NODE_ENV === 'production') {
  pool.on('connect', () => {}); // Don't log every connection
  pool.on('acquire', () => {});
  pool.on('remove', () => {});
}
```

**Implementation Effort:** 2 hours
**Priority:** P2 - Performance optimization

---

### MEDIUM: No Network Segmentation (P2)
**Severity:** MEDIUM
**Risk Exposure:** Database accessible from application tier. No defense in depth.

**Current State:**
- All services on same network
- No firewall rules between tiers
- Database exposed to application servers

**Recommended Mitigation:**
```yaml
# Use Docker networks for segmentation
version: '3.8'

services:
  nginx:
    networks:
      - frontend

  auth-service:
    networks:
      - frontend
      - backend

  postgres:
    networks:
      - backend
    # Only accessible from backend network

  redis:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true # No external access
```

**Implementation Effort:** 4 hours
**Priority:** P2 - Defense in depth

---

### LOW: Server Hardening Incomplete (P3)
**Severity:** LOW
**Risk Exposure:** OS-level vulnerabilities not addressed.

**Recommended Mitigation:**
- Disable unnecessary services
- Configure firewall (ufw/iptables)
- Enable automatic security updates
- Configure fail2ban for SSH protection
- Use non-root user for application
- Implement AppArmor/SELinux profiles

**Implementation Effort:** 6 hours
**Priority:** P3 - Operations security

---

## 5. Application Security

### HIGH: XSS Vulnerabilities in React Components (P1)
**Severity:** HIGH
**Risk Exposure:** User-controlled content rendered unsafely.

**Current Implementation:**
```javascript
// Multiple files use dangerouslySetInnerHTML
// src/components/ui/chart.tsx
dangerouslySetInnerHTML={{

// src/components/CollaborativeEditor.tsx
dangerouslySetInnerHTML={{ __html: formatContent() }}

// src/components/Logo.js
this.container.innerHTML = '';
```

**Issues:**
- 6+ instances of `dangerouslySetInnerHTML`
- 1 instance of `innerHTML` direct manipulation
- No HTML sanitization library
- User-generated content may be rendered unsafely

**Recommended Mitigation:**
```javascript
// Install DOMPurify for HTML sanitization
import DOMPurify from 'dompurify';

// Replace all dangerouslySetInnerHTML with sanitized version
<div
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(userContent, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    })
  }}
/>

// For CollaborativeEditor, use a safe markdown renderer
import ReactMarkdown from 'react-markdown';

<ReactMarkdown>{content}</ReactMarkdown>

// Audit all usages
grep -r "dangerouslySetInnerHTML\|innerHTML" src/
```

**Implementation Effort:** 8 hours
**Priority:** P1 - XSS prevention critical

---

### MEDIUM: Dependency Vulnerabilities (P2)
**Severity:** MEDIUM
**Risk Exposure:** Known vulnerabilities in dependencies.

**Current Vulnerabilities:**
```
validator@13.15.15 - MODERATE
  - URL validation bypass (GHSA-9965-vmph-33xx)
  - CVSS 6.1
  - No fix available

csurf@1.11.0 - LOW
  - Cookie accepts out of bounds characters (GHSA-pxg6-pf52-xh8x)
  - Fix available: downgrade to 1.2.2

vite@6.3.5 - LOW
  - File serving vulnerability (GHSA-g4jq-h2w9-997c)
```

**Recommended Mitigation:**
```bash
# Immediate actions
npm update csurf@1.2.2
npm audit fix

# Replace vulnerable validator
npm uninstall validator
npm install joi@17.9.0

# Monitor dependencies
npm install --save-dev snyk
npx snyk test
npx snyk monitor

# Set up automated dependency updates (Dependabot/Renovate)
# Add to .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

**Implementation Effort:** 4 hours
**Priority:** P2 - Continuous security

---

### LOW: Content Security Policy Too Permissive (P3)
**Severity:** LOW
**Risk Exposure:** Reduced XSS protection.

**Current Implementation:**
```javascript
// security-hardening.js:47-80
scriptSrc: [
  "'self'",
  "'unsafe-inline'", // RISKY
  "'unsafe-eval'",   // RISKY
  'https://accounts.google.com',
  'https://appleid.apple.com'
],
```

**Issues:**
- `unsafe-inline` allows inline scripts
- `unsafe-eval` allows eval()
- Weakens XSS protection

**Recommended Mitigation:**
```javascript
// Use nonce-based CSP
const crypto = require('crypto');

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        'https://accounts.google.com',
        'https://appleid.apple.com'
      ],
      styleSrc: [
        "'self'",
        (req, res) => `'nonce-${res.locals.cspNonce}'`,
        'https://fonts.googleapis.com'
      ],
      // Remove unsafe-eval, unsafe-inline
    }
  }
};

// Update React to inject nonce
<script nonce={cspNonce}>...</script>
```

**Implementation Effort:** 6 hours
**Priority:** P3 - Enhanced security

---

## 6. Monitoring & Response

### MEDIUM: Security Monitoring Insufficient (P2)
**Severity:** MEDIUM
**Risk Exposure:** Security incidents may go undetected.

**Current State:**
```javascript
// security-hardening.js:373-377
if (process.env.NODE_ENV === 'production') {
  this.sendToMonitoring(logEntry); // Not actually implemented
}
```

**Issues:**
- No real-time security monitoring
- No intrusion detection
- No alerting on suspicious activity
- Security events logged but not analyzed

**Recommended Mitigation:**
```javascript
// Implement security event aggregation
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Tag security events
    if (event.tags && event.tags.type === 'security') {
      event.tags.severity = 'high';
      // Send immediate alert
    }
    return event;
  }
});

// Log security events to dedicated service
const securityEventHub = {
  async logEvent(event, details) {
    const enrichedEvent = {
      ...details,
      timestamp: new Date().toISOString(),
      severity: this.getSeverity(event),
      environment: process.env.NODE_ENV
    };

    // Log to Sentry
    Sentry.captureMessage(`Security Event: ${event}`, {
      level: enrichedEvent.severity,
      tags: { type: 'security', event },
      extra: enrichedEvent
    });

    // Log to ELK/Splunk/Datadog
    await this.sendToSIEM(enrichedEvent);

    // Send alerts for high-severity events
    if (enrichedEvent.severity === 'HIGH' || enrichedEvent.severity === 'CRITICAL') {
      await this.sendAlert(enrichedEvent);
    }
  },

  async sendAlert(event) {
    // Send to PagerDuty/Opsgenie/Slack
    await fetch(process.env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `SECURITY ALERT: ${event.type}`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'User', value: event.userId || 'N/A', short: true },
            { title: 'IP', value: event.ip, short: true },
            { title: 'Details', value: JSON.stringify(event.details) }
          ]
        }]
      })
    });
  }
};

// Monitor failed login attempts
app.post('/api/auth/login', async (req, res) => {
  // ... existing login logic

  if (!validPassword) {
    await securityEventHub.logEvent('failed_login', {
      email: maskEmail(req.body.email),
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  }
});

// Anomaly detection
const recentLoginPatterns = new Map();

async function detectAnomalies(userId, loginData) {
  const userPattern = recentLoginPatterns.get(userId) || [];

  // Detect unusual location
  if (!userPattern.some(p => p.country === loginData.country)) {
    await securityEventHub.logEvent('unusual_location', {
      userId,
      newLocation: loginData.country,
      usualLocations: userPattern.map(p => p.country)
    });
  }

  // Detect unusual time
  const hour = new Date().getHours();
  const usualHours = userPattern.map(p => p.hour);
  if (usualHours.length > 5 && !usualHours.includes(hour)) {
    await securityEventHub.logEvent('unusual_time', { userId, hour });
  }
}
```

**Implementation Effort:** 12 hours
**Priority:** P2 - Operations requirement

---

### LOW: No Incident Response Plan (P3)
**Severity:** LOW
**Risk Exposure:** Slow response to security incidents.

**Recommended Mitigation:**
- Document incident response procedures
- Define escalation paths
- Create runbooks for common scenarios
- Conduct tabletop exercises
- Set up war room communication channels

**Implementation Effort:** 8 hours (documentation)
**Priority:** P3 - Operational maturity

---

## Prioritized Implementation Roadmap

### Phase 2 (Immediate - 2 weeks)
**Total Effort:** ~100 hours

**Week 1: Critical Security Fixes (P0)**
1. Implement JWT refresh token mechanism (8h)
2. Rotate and secure all production credentials (4h)
3. Fix weak default credentials (4h)
4. Remove credentials from git history (2h)
5. Implement comprehensive input validation (12h)
6. Fix XSS vulnerabilities (8h)
7. Implement log sanitization (6h)
**Subtotal:** 44 hours

**Week 2: High Priority Items (P1)**
8. Implement MFA (TOTP) (16h)
9. Enhance password policy with zxcvbn (6h)
10. Improve session management (httpOnly cookies) (12h)
11. Implement distributed rate limiting (Redis) (6h)
12. Fix rate limiting configuration (4h)
**Subtotal:** 44 hours

**Testing & Documentation (P0/P1)**
13. Security testing and verification (12h)
**Total Phase 2:** 100 hours

---

### Phase 3 (1-2 months)
**Total Effort:** ~80 hours

**Medium Priority (P2)**
1. Complete OAuth implementation (Apple Sign In) (10h)
2. Implement field-level encryption (16h)
3. GDPR/CCPA compliance features (20h)
4. API versioning (8h)
5. Request ID tracking (3h)
6. Database connection tuning (2h)
7. Network segmentation (Docker) (4h)
8. Dependency vulnerability remediation (4h)
9. Security monitoring implementation (12h)

**Total Phase 3:** 79 hours

---

### Phase 4 (Ongoing)
**Low Priority (P3)**
1. Account lockout mechanism (4h)
2. Backup encryption and verification (8h)
3. Server hardening (6h)
4. CSP hardening (nonce-based) (6h)
5. API documentation security section (4h)
6. Incident response plan documentation (8h)

**Total Phase 4:** 36 hours

---

## Compliance Impact

### GDPR Compliance
**Current Status:** Non-compliant
**Required Fixes:**
- [P1] Implement data sanitization in logs
- [P2] Field-level encryption for PII
- [P2] Data retention and deletion policies
- [P2] User data export functionality
- [P2] Audit logging for data access

**Timeline:** Phase 2-3 (6-8 weeks)

### SOC 2 Type II
**Current Status:** Not ready
**Required Fixes:**
- [P0] MFA implementation
- [P1] Session management improvements
- [P2] Security monitoring and alerting
- [P2] Incident response plan
- [P3] Regular security audits

**Timeline:** Phase 2-4 (3-4 months)

### PCI DSS (if handling payments)
**Current Status:** Not applicable yet
**Future Requirements:**
- Encrypt cardholder data (use Stripe/payment processor)
- Maintain vulnerability management program
- Implement strong access control measures
- Regularly monitor and test networks

---

## Testing Recommendations

### Security Testing Checklist
- [ ] Penetration testing by third party
- [ ] OWASP ZAP automated scanning
- [ ] Burp Suite manual testing
- [ ] SQL injection testing (SQLMap)
- [ ] XSS testing (XSSer)
- [ ] CSRF testing
- [ ] Authentication bypass testing
- [ ] Authorization testing (IDOR, privilege escalation)
- [ ] Rate limiting verification
- [ ] Session management testing
- [ ] Dependency scanning (Snyk, npm audit)
- [ ] Static code analysis (SonarQube, Semgrep)
- [ ] Secrets scanning (TruffleHog, git-secrets)

### Automated Security Pipeline
```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run OWASP Dependency Check
        run: dependency-check --scan . --format JSON

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: "p/security-audit p/owasp-top-ten"
```

---

## Conclusion

FluxStudio has a solid foundation from Phase 1 security fixes (CSRF, SSL, SQL injection prevention), but **critical gaps remain** in authentication, secret management, and data protection that must be addressed before production deployment.

**Key Recommendations:**
1. **Do Not Deploy to Production** until P0 items are resolved
2. **Prioritize Authentication Security** - implement refresh tokens and MFA
3. **Rotate All Credentials Immediately** - current secrets are weak
4. **Implement Comprehensive Monitoring** - you can't protect what you can't see
5. **Regular Security Audits** - quarterly penetration testing recommended

**Estimated Timeline:**
- **Phase 2 (P0/P1):** 2 weeks (100 hours) - **REQUIRED for production**
- **Phase 3 (P2):** 2 months (80 hours) - Compliance and enhancement
- **Phase 4 (P3):** Ongoing (36 hours) - Continuous improvement

**Total Investment:** 216 hours (~1.5 engineer-months)

For questions or clarification on any security concern, contact the Security Reviewer team.

---

**Document Version:** 1.0
**Last Updated:** October 13, 2025
**Next Review:** After Phase 2 completion
