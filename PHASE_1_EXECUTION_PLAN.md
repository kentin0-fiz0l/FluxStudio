# Flux Studio: Phase 1 Execution Plan
## 12-Week Sprint to Production Readiness

**Goal:** Make Flux Studio secure, stable, and delightful for wide adoption
**Timeline:** Weeks 1-12
**Team:** 3 engineers (2 full-stack, 1 security contractor)
**Budget:** $202,000
**Status:** 🚀 READY TO START

---

## Overview

This document provides detailed, actionable sprint plans to transform Flux Studio from "not production-ready" to "ready for wide adoption" in 12 weeks.

### Three Parallel Tracks

**Track 1: Security Hardening (Weeks 1-2)** ⚠️ BLOCKING
- Fix 7 critical security vulnerabilities
- Achieve security score 8/10
- Third-party audit and certification

**Track 2: Technical Foundation (Weeks 3-8)**
- Implement Yjs real-time collaboration MVP
- Fix message persistence and test suite
- Deploy monitoring and observability
- Refactor monolithic code

**Track 3: UX Polish (Weeks 9-12)**
- Simplify onboarding (5 steps → 3 steps)
- Add bulk operations and file preview
- Fix critical accessibility issues
- Polish for wide adoption

---

## Week 1: Emergency Security Sprint

### Monday (Day 1): Security Audit & Planning

**Morning (4 hours) - Security Assessment**
```bash
# Run comprehensive security audit
cd /Users/kentino/FluxStudio

# 1. Check for exposed secrets
git log --all --full-history -- .env*
grep -r "API_KEY\|SECRET\|PASSWORD" . --exclude-dir=node_modules

# 2. Audit dependencies
npm audit
npm outdated

# 3. Check git history for sensitive data
git log -p | grep -i "password\|secret\|key"
```

**Afternoon (4 hours) - Emergency Fixes**
```bash
# 1. Rotate OAuth credentials
# Go to Google Cloud Console → APIs & Credentials
# Create new OAuth 2.0 Client ID
# Update .env with new credentials

# 2. Remove .env.production from git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.production" \
  --prune-empty --tag-name-filter cat -- --all

# Push with force
git push origin --force --all
git push origin --force --tags

# 3. Update .gitignore
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
git add .gitignore
git commit -m "Security: Prevent .env files from being committed"
```

**Evening (2 hours) - Deploy Emergency Protections**
```bash
# 1. Enable Web Application Firewall (Cloudflare)
# Sign up at cloudflare.com
# Add fluxstudio.art domain
# Enable WAF with OWASP ruleset

# 2. Deploy basic rate limiting
npm install express-rate-limit redis rate-limit-redis
```

Create `middleware/emergency-rate-limit.js`:
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Auth endpoints - strict limiting
const authLimiter = rateLimit({
  store: new RedisStore({ client: redisClient, prefix: 'rl:auth:' }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 min
  message: 'Too many authentication attempts, please try again later.'
});

// API endpoints - moderate limiting
const apiLimiter = rateLimit({
  store: new RedisStore({ client: redisClient, prefix: 'rl:api:' }),
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 min
  message: 'Too many requests, please try again later.'
});

module.exports = { authLimiter, apiLimiter };
```

**Deliverables:**
- [ ] OAuth credentials rotated
- [ ] .env.production removed from git history
- [ ] Cloudflare WAF enabled
- [ ] Emergency rate limiting deployed
- [ ] Security assessment document created

---

### Tuesday-Wednesday (Days 2-3): JWT Refresh Tokens

**Implementation:** `server-auth.js`

```javascript
// database/schema.sql - Add refresh tokens table
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

```javascript
// lib/auth/tokenService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../../database/config');

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const MAX_SESSIONS_PER_USER = 5;

// Generate access token (short-lived)
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: user.userType,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Generate refresh token (long-lived)
async function generateRefreshToken(user, deviceInfo = {}) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Check if user has too many active sessions
  const { rows: existingSessions } = await query(
    `SELECT COUNT(*) as count FROM refresh_tokens
     WHERE user_id = $1 AND expires_at > NOW()`,
    [user.id]
  );

  if (parseInt(existingSessions[0].count) >= MAX_SESSIONS_PER_USER) {
    // Delete oldest session
    await query(
      `DELETE FROM refresh_tokens
       WHERE id = (
         SELECT id FROM refresh_tokens
         WHERE user_id = $1
         ORDER BY last_used_at ASC
         LIMIT 1
       )`,
      [user.id]
    );
  }

  // Store refresh token in database
  await query(
    `INSERT INTO refresh_tokens
     (user_id, token, device_name, device_fingerprint, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      user.id,
      token,
      deviceInfo.deviceName || 'Unknown Device',
      deviceInfo.deviceFingerprint || null,
      deviceInfo.ipAddress || null,
      deviceInfo.userAgent || null,
      expiresAt
    ]
  );

  return token;
}

// Verify and refresh tokens
async function refreshAccessToken(refreshToken) {
  // Find refresh token in database
  const { rows } = await query(
    `SELECT rt.*, u.id, u.email, u.user_type as "userType"
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
    [refreshToken]
  );

  if (rows.length === 0) {
    throw new Error('Invalid or expired refresh token');
  }

  const tokenData = rows[0];

  // Update last_used_at
  await query(
    'UPDATE refresh_tokens SET last_used_at = NOW() WHERE token = $1',
    [refreshToken]
  );

  // Generate new access token
  const accessToken = generateAccessToken({
    id: tokenData.id,
    email: tokenData.email,
    userType: tokenData.userType
  });

  return accessToken;
}

// Revoke refresh token (logout)
async function revokeRefreshToken(token) {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}

// Revoke all user's refresh tokens (logout everywhere)
async function revokeAllUserTokens(userId) {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

// Clean up expired tokens (run daily)
async function cleanupExpiredTokens() {
  const { rowCount } = await query(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
  );
  console.log(`Cleaned up ${rowCount} expired refresh tokens`);
  return rowCount;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens
};
```

**Update auth routes:**
```javascript
// server-auth.js - Update login endpoint
const tokenService = require('./lib/auth/tokenService');

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate credentials (existing code)
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user);
    const refreshToken = await tokenService.generateRefreshToken(user, {
      deviceName: req.body.deviceName,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// New endpoint: Refresh access token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    const accessToken = await tokenService.refreshAccessToken(refreshToken);

    res.json({ accessToken });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// New endpoint: Logout (revoke refresh token)
app.post('/api/auth/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await tokenService.revokeRefreshToken(refreshToken);
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// New endpoint: Logout everywhere
app.post('/api/auth/logout-all', authenticateToken, async (req, res) => {
  try {
    await tokenService.revokeAllUserTokens(req.user.id);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout all failed' });
  }
});

// Cleanup job (run daily)
setInterval(() => {
  tokenService.cleanupExpiredTokens();
}, 24 * 60 * 60 * 1000); // Run every 24 hours
```

**Frontend Integration:**
```typescript
// src/lib/api/auth.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true // Important for cookies
});

// Request interceptor: Add access token to requests
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor: Handle token refresh
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If access token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for refresh to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {}, {
          withCredentials: true
        });

        const { accessToken } = data;
        localStorage.setItem('accessToken', accessToken);

        api.defaults.headers.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        isRefreshing = false;
        onTokenRefreshed(accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        // Refresh failed - redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

**Testing:**
```bash
# Test token refresh flow
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Wait 16 minutes (access token expired)
sleep 960

# Try authenticated request (should auto-refresh)
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

**Deliverables:**
- [ ] Refresh tokens table created
- [ ] Token service implemented
- [ ] Auth endpoints updated
- [ ] Frontend auto-refresh working
- [ ] Tested with expired tokens
- [ ] Documentation updated

---

### Thursday-Friday (Days 4-5): XSS Protection

**Implementation:** Fix all 9 vulnerable files

```bash
# Install DOMPurify
npm install dompurify
npm install --save-dev @types/dompurify
```

Create sanitization utility:
```typescript
// src/lib/sanitize.ts
import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
}

// Strict sanitization (no HTML tags)
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}

// Rich text sanitization (preserve formatting)
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'span', 'div',
      'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
      'a', 'ul', 'ol', 'li'
    ],
    ALLOWED_ATTR: {
      'a': ['href', 'title', 'target', 'rel'],
      'code': ['class'],
      '*': ['class'] // Allow class for styling
    },
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
  });
}

// Design feedback sanitization (preserve design-specific formatting)
export function sanitizeDesignFeedback(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u',
      'a', 'blockquote', 'ul', 'ol', 'li',
      'mark' // For highlighting
    ],
    ALLOWED_ATTR: {
      'a': ['href', 'title', 'target'],
      'mark': ['data-color'] // Design annotations
    }
  });
}

// Markdown-to-HTML sanitization
export function sanitizeMarkdown(markdown: string): string {
  // Simple markdown parsing (can use a library like marked + DOMPurify)
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/\n/g, '<br>');

  return sanitizeRichText(html);
}
```

**Fix vulnerable files:**

1. **CollaborativeEditor.tsx (Line 339)**
```typescript
// BEFORE (VULNERABLE)
<div
  className="flex-1 p-6 text-white overflow-y-auto"
  dangerouslySetInnerHTML={{ __html: formatContent() }}
/>

// AFTER (SECURE)
import { sanitizeMarkdown } from '@/lib/sanitize';

<div
  className="flex-1 p-6 text-white overflow-y-auto"
  dangerouslySetInnerHTML={{
    __html: sanitizeMarkdown(content)
  }}
/>
```

2. **All other vulnerable files** - Apply same pattern:
```typescript
import { sanitizeRichText, sanitizeText } from '@/lib/sanitize';

// For user-generated HTML content
dangerouslySetInnerHTML={{ __html: sanitizeRichText(userContent) }}

// For plain text (safest)
{sanitizeText(userInput)}
```

**Testing:**
```typescript
// tests/sanitize.test.ts
import { sanitizeRichText, sanitizeText } from '../src/lib/sanitize';

describe('XSS Protection', () => {
  test('should block script tags', () => {
    const malicious = '<script>alert("XSS")</script>';
    const result = sanitizeRichText(malicious);
    expect(result).not.toContain('<script>');
  });

  test('should block event handlers', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const result = sanitizeRichText(malicious);
    expect(result).not.toContain('onerror');
  });

  test('should preserve safe formatting', () => {
    const safe = '<strong>Bold</strong> <em>Italic</em>';
    const result = sanitizeRichText(safe);
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  test('should allow safe links', () => {
    const safe = '<a href="https://example.com">Link</a>';
    const result = sanitizeRichText(safe);
    expect(result).toContain('<a href="https://example.com"');
  });

  test('should block javascript: protocol', () => {
    const malicious = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeRichText(malicious);
    expect(result).not.toContain('javascript:');
  });
});
```

**Deliverables:**
- [ ] DOMPurify installed
- [ ] Sanitization utilities created
- [ ] All 9 vulnerable files fixed
- [ ] Tests pass (no XSS vulnerabilities)
- [ ] Rich text formatting preserved
- [ ] Security review passed

---

## Week 2: Security Hardening

### Monday-Tuesday (Days 6-7): MFA Implementation

**Database migration:**
```sql
-- database/schema.sql
CREATE TABLE user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  secret TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes TEXT[], -- Array of hashed backup codes
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_mfa_user_id ON user_mfa(user_id);
```

**Install dependencies:**
```bash
npm install speakeasy qrcode
```

**MFA Service:**
```javascript
// lib/auth/mfaService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { query } = require('../../database/config');

const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY; // 32-byte key
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Encrypt TOTP secret
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

// Decrypt TOTP secret
function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Generate MFA setup
async function setupMFA(userId, userEmail) {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `Flux Studio (${userEmail})`,
    length: 32
  });

  // Encrypt secret before storing
  const encryptedSecret = encrypt(secret.base32);

  // Generate backup codes (10 codes)
  const backupCodes = Array.from({ length: 10 }, () => {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  });

  // Hash backup codes before storing
  const hashedBackupCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, 10))
  );

  // Store in database
  await query(
    `INSERT INTO user_mfa (user_id, secret, backup_codes, enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id)
     DO UPDATE SET
       secret = $2,
       backup_codes = $3,
       enabled = $4,
       verified_at = NULL,
       updated_at = NOW()`,
    [
      userId,
      JSON.stringify(encryptedSecret),
      hashedBackupCodes,
      false
    ]
  );

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    qrCode: qrCodeUrl,
    secret: secret.base32, // Return unencrypted for initial setup
    backupCodes // Return unhashed for user to save
  };
}

// Verify TOTP code
async function verifyTOTP(userId, token) {
  // Get user's MFA settings
  const { rows } = await query(
    'SELECT secret, enabled FROM user_mfa WHERE user_id = $1',
    [userId]
  );

  if (rows.length === 0) {
    return { valid: false, error: 'MFA not set up' };
  }

  const { secret: encryptedSecretJSON, enabled } = rows[0];
  const encryptedSecret = JSON.parse(encryptedSecretJSON);

  // Decrypt secret
  const secret = decrypt(
    encryptedSecret.encrypted,
    encryptedSecret.iv,
    encryptedSecret.authTag
  );

  // Verify token
  const valid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow 2 time steps (~60 seconds) of clock skew
  });

  return { valid, enabled };
}

// Enable MFA (after successful verification)
async function enableMFA(userId) {
  await query(
    `UPDATE user_mfa
     SET enabled = TRUE, verified_at = NOW(), updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

// Verify backup code
async function verifyBackupCode(userId, code) {
  const { rows } = await query(
    'SELECT backup_codes FROM user_mfa WHERE user_id = $1 AND enabled = TRUE',
    [userId]
  );

  if (rows.length === 0) {
    return false;
  }

  const hashedCodes = rows[0].backup_codes;

  // Check each backup code
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(code, hashedCodes[i]);

    if (match) {
      // Remove used backup code
      hashedCodes.splice(i, 1);
      await query(
        'UPDATE user_mfa SET backup_codes = $1 WHERE user_id = $2',
        [hashedCodes, userId]
      );
      return true;
    }
  }

  return false;
}

// Disable MFA
async function disableMFA(userId) {
  await query(
    'UPDATE user_mfa SET enabled = FALSE, updated_at = NOW() WHERE user_id = $1',
    [userId]
  );
}

module.exports = {
  setupMFA,
  verifyTOTP,
  enableMFA,
  verifyBackupCode,
  disableMFA
};
```

**Auth endpoints:**
```javascript
// server-auth.js - MFA endpoints
const mfaService = require('./lib/auth/mfaService');

// Setup MFA
app.post('/api/auth/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const { id: userId, email } = req.user;

    const mfaData = await mfaService.setupMFA(userId, email);

    res.json({
      qrCode: mfaData.qrCode,
      secret: mfaData.secret,
      backupCodes: mfaData.backupCodes
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

// Verify and enable MFA
app.post('/api/auth/mfa/verify', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    const { valid } = await mfaService.verifyTOTP(userId, token);

    if (!valid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await mfaService.enableMFA(userId);

    res.json({ message: 'MFA enabled successfully' });
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// Login with MFA
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, mfaToken } = req.body;

    // ... existing password verification ...

    // Check if user has MFA enabled
    const { rows: mfaRows } = await query(
      'SELECT enabled FROM user_mfa WHERE user_id = $1',
      [user.id]
    );

    if (mfaRows.length > 0 && mfaRows[0].enabled) {
      // MFA is enabled - require token
      if (!mfaToken) {
        return res.status(200).json({
          requiresMFA: true,
          userId: user.id
        });
      }

      // Verify MFA token
      const { valid } = await mfaService.verifyTOTP(user.id, mfaToken);

      if (!valid) {
        // Try backup code
        const backupValid = await mfaService.verifyBackupCode(user.id, mfaToken);

        if (!backupValid) {
          return res.status(401).json({ error: 'Invalid MFA code' });
        }
      }
    }

    // Generate tokens and complete login
    // ... existing token generation ...

    res.json({ accessToken, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

**Frontend MFA Setup Component:**
```typescript
// src/components/auth/MFASetup.tsx
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';

export default function MFASetup() {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');

  const handleSetup = async () => {
    const { data } = await api.post('/api/auth/mfa/setup');
    setQrCode(data.qrCode);
    setSecret(data.secret);
    setBackupCodes(data.backupCodes);
    setStep('verify');
  };

  const handleVerify = async () => {
    try {
      await api.post('/api/auth/mfa/verify', { token: verifyCode });
      alert('MFA enabled successfully!');
    } catch (error) {
      alert('Invalid code. Please try again.');
    }
  };

  return (
    <div className="mfa-setup">
      {step === 'setup' && (
        <div>
          <h2>Enable Two-Factor Authentication</h2>
          <p>Add an extra layer of security to your account</p>
          <button onClick={handleSetup}>Get Started</button>
        </div>
      )}

      {step === 'verify' && (
        <div>
          <h2>Scan QR Code</h2>
          <p>Use Google Authenticator or Authy to scan this code:</p>

          <div className="qr-code">
            <img src={qrCode} alt="QR Code" />
          </div>

          <p>Or enter this secret manually:</p>
          <code>{secret}</code>

          <h3>Backup Codes</h3>
          <p>Save these codes in a safe place. Each can be used once:</p>
          <ul>
            {backupCodes.map((code, i) => (
              <li key={i}><code>{code}</code></li>
            ))}
          </ul>

          <h3>Verify Setup</h3>
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            maxLength={6}
          />
          <button onClick={handleVerify}>Verify & Enable</button>
        </div>
      )}
    </div>
  );
}
```

**Deliverables:**
- [ ] MFA database table created
- [ ] MFA service implemented with encryption
- [ ] Auth endpoints updated
- [ ] Frontend MFA setup component
- [ ] Tested with Google Authenticator
- [ ] Backup codes working
- [ ] Documentation for users

---

### Wednesday (Day 8): Password Policy Enhancement

**Update password validation middleware:**
```javascript
// middleware/security.js
const zxcvbn = require('zxcvbn');

const PASSWORD_HISTORY_LIMIT = 5;

// Enhanced password validation
async function validatePassword(req, res, next) {
  const { password, email } = req.body;

  // Minimum length: 12 characters
  if (password.length < 12) {
    return res.status(400).json({
      error: 'Password must be at least 12 characters long'
    });
  }

  // Require uppercase, lowercase, number, and special character
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return res.status(400).json({
      error: 'Password must contain uppercase, lowercase, number, and special character'
    });
  }

  // Check password strength with zxcvbn
  const strength = zxcvbn(password, [email]);

  if (strength.score < 3) {
    return res.status(400).json({
      error: 'Password is too weak',
      suggestions: strength.feedback.suggestions,
      warning: strength.feedback.warning
    });
  }

  // Check against common passwords (zxcvbn does this automatically)
  // Check against password history (if updating password)
  if (req.user?.id) {
    const isReused = await checkPasswordHistory(req.user.id, password);
    if (isReused) {
      return res.status(400).json({
        error: 'Cannot reuse one of your last 5 passwords'
      });
    }
  }

  next();
}

// Check password history
async function checkPasswordHistory(userId, newPassword) {
  const { rows } = await query(
    `SELECT password_hash FROM password_history
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, PASSWORD_HISTORY_LIMIT]
  );

  for (const row of rows) {
    const matches = await bcrypt.compare(newPassword, row.password_hash);
    if (matches) {
      return true;
    }
  }

  return false;
}

// Save password to history
async function savePasswordHistory(userId, passwordHash) {
  await query(
    'INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)',
    [userId, passwordHash]
  );

  // Clean up old password history
  await query(
    `DELETE FROM password_history
     WHERE user_id = $1
     AND id NOT IN (
       SELECT id FROM password_history
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2
     )`,
    [userId, PASSWORD_HISTORY_LIMIT]
  );
}

module.exports = {
  validatePassword,
  savePasswordHistory
};
```

**Add password history table:**
```sql
-- database/schema.sql
CREATE TABLE password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created_at ON password_history(created_at);
```

**Install zxcvbn:**
```bash
npm install zxcvbn
```

**Update signup/password change endpoints:**
```javascript
// server-auth.js
const { validatePassword, savePasswordHistory } = require('./middleware/security');

app.post('/api/auth/signup', validatePassword, async (req, res) => {
  // ... existing signup code ...

  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const { rows } = await query(/*...*/);

  // Save to password history
  await savePasswordHistory(rows[0].id, passwordHash);

  // ... rest of signup ...
});

app.post('/api/auth/change-password', authenticateToken, validatePassword, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Verify current password
    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Save to history
    await savePasswordHistory(userId, newPasswordHash);

    // Revoke all refresh tokens (logout everywhere)
    await tokenService.revokeAllUserTokens(userId);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});
```

**Deliverables:**
- [ ] zxcvbn installed
- [ ] Password validation enhanced
- [ ] Password history table created
- [ ] Password history checking implemented
- [ ] Change password endpoint secured
- [ ] Tests pass

---

### Thursday-Friday (Days 9-10): Final Security Hardening

**Tasks:**
1. WebSocket authentication (server-collaboration.js)
2. Dependency vulnerability fixes
3. Third-party security audit
4. Security documentation

**WebSocket Authentication:**
```javascript
// server-collaboration.js
const jwt = require('jsonwebtoken');
const { query } = require('./database/config');

wss.on('connection', async (ws, req) => {
  try {
    // Extract token from URL query or authorization header
    const url = new URL(req.url, `ws://${req.headers.host}`);
    const token = url.searchParams.get('token') ||
                  req.headers.authorization?.split(' ')[1];

    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Get room name from URL
    const roomName = url.pathname.slice(1);

    if (!roomName) {
      ws.close(1008, 'Room name required');
      return;
    }

    // Verify user has access to this room/project
    const { rows } = await query(
      `SELECT pm.role
       FROM project_members pm
       JOIN projects p ON pm.project_id = p.id
       WHERE pm.user_id = $1 AND p.id = $2`,
      [userId, roomName]
    );

    if (rows.length === 0) {
      ws.close(1008, 'Access denied to this room');
      return;
    }

    // Attach user info to WebSocket
    ws.userId = userId;
    ws.userName = decoded.email;
    ws.roomName = roomName;

    console.log(`User ${ws.userName} joined room ${roomName}`);

    // ... rest of WebSocket handling ...

  } catch (error) {
    console.error('WebSocket auth error:', error);
    ws.close(1008, 'Authentication failed');
  }
});
```

**Frontend WebSocket connection:**
```typescript
// src/lib/collaboration/websocket.ts
export function connectToCollaboration(projectId: string) {
  const accessToken = localStorage.getItem('accessToken');

  const ws = new WebSocket(
    `ws://localhost:4000/${projectId}?token=${accessToken}`
  );

  ws.onopen = () => {
    console.log('Connected to collaboration server');
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = (event) => {
    if (event.code === 1008) {
      console.error('Authentication failed:', event.reason);
      // Redirect to login
      window.location.href = '/login';
    }
  };

  return ws;
}
```

**Fix Dependency Vulnerabilities:**
```bash
# 1. Replace validator with Joi
npm uninstall validator
npm install joi

# 2. Update Vite
npm update vite

# 3. Run audit fix
npm audit fix

# 4. Check for remaining vulnerabilities
npm audit
```

**Replace validator with Joi:**
```javascript
// middleware/validation.js
const Joi = require('joi');

// Email validation schema
const emailSchema = Joi.string().email().required();

// Password validation schema
const passwordSchema = Joi.string()
  .min(12)
  .pattern(/[A-Z]/, 'uppercase')
  .pattern(/[a-z]/, 'lowercase')
  .pattern(/[0-9]/, 'number')
  .pattern(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'special character')
  .required();

// Validate request body
function validateRequest(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({ errors });
    }

    req.validatedBody = value;
    next();
  };
}

// Example usage
const signupSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  name: Joi.string().min(2).max(100).required()
});

module.exports = {
  validateRequest,
  signupSchema,
  emailSchema,
  passwordSchema
};
```

**Third-Party Security Audit:**
Schedule audit with:
- [Cobalt.io](https://cobalt.io) ($5,000)
- [HackerOne](https://www.hackerone.com) ($3,000-$8,000)
- Or local penetration testing firm

**Audit Focus Areas:**
1. Authentication & session management
2. XSS and injection vulnerabilities
3. CSRF protection
4. API security
5. WebSocket security
6. Data encryption
7. GDPR compliance gaps

**Deliverables:**
- [ ] WebSocket authentication implemented
- [ ] All dependencies updated
- [ ] validator replaced with Joi
- [ ] npm audit shows 0 critical/high issues
- [ ] Third-party audit scheduled
- [ ] Security documentation complete

---

## Week 3-4: Message Persistence & Monitoring

### Implementation: Message Persistence

**Update server-messaging.js:**
```javascript
// server-messaging.js
const { query } = require('./database/config');

io.on('connection', (socket) => {
  // ... existing authentication ...

  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content, attachments } = data;
      const userId = socket.userId;

      // Validate user has access to conversation
      const { rows: accessCheck } = await query(
        `SELECT 1 FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (accessCheck.length === 0) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Save message to database
      const { rows } = await query(
        `INSERT INTO messages
         (conversation_id, sender_id, content, attachments, type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, conversation_id, sender_id, content, attachments, created_at`,
        [conversationId, userId, content, JSON.stringify(attachments || []), 'text']
      );

      const message = rows[0];

      // Update conversation last_message_at
      await query(
        'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
        [conversationId]
      );

      // Broadcast to all participants in the room
      io.to(`conversation_${conversationId}`).emit('new_message', {
        ...message,
        sender: {
          id: userId,
          name: socket.userName,
          email: socket.userEmail
        }
      });

      // Update unread counts for participants
      await query(
        `UPDATE conversation_participants
         SET unread_count = unread_count + 1
         WHERE conversation_id = $1 AND user_id != $2`,
        [conversationId, userId]
      );

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Load message history
  socket.on('load_messages', async (data) => {
    try {
      const { conversationId, limit = 50, offset = 0 } = data;
      const userId = socket.userId;

      // Validate access
      const { rows: accessCheck } = await query(
        `SELECT 1 FROM conversation_participants
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

      if (accessCheck.length === 0) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Load messages from database
      const { rows: messages } = await query(
        `SELECT
           m.id,
           m.content,
           m.attachments,
           m.created_at,
           u.id as sender_id,
           u.name as sender_name,
           u.email as sender_email
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset]
      );

      socket.emit('messages_loaded', {
        conversationId,
        messages: messages.reverse(),
        hasMore: messages.length === limit
      });

      // Mark messages as read
      await query(
        `UPDATE conversation_participants
         SET unread_count = 0, last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );

    } catch (error) {
      console.error('Load messages error:', error);
      socket.emit('error', { message: 'Failed to load messages' });
    }
  });
});
```

**Frontend message handling:**
```typescript
// src/contexts/MessagingContext.tsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function MessagingProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');

    const newSocket = io('http://localhost:3004', {
      auth: { token: accessToken }
    });

    newSocket.on('connect', () => {
      console.log('Connected to messaging server');
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => ({
        ...prev,
        [message.conversation_id]: [
          ...(prev[message.conversation_id] || []),
          message
        ]
      }));
    });

    newSocket.on('messages_loaded', ({ conversationId, messages: loadedMessages }) => {
      setMessages(prev => ({
        ...prev,
        [conversationId]: loadedMessages
      }));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const loadMessages = (conversationId: string) => {
    socket?.emit('load_messages', { conversationId });
  };

  const sendMessage = (conversationId: string, content: string, attachments?: any[]) => {
    socket?.emit('send_message', { conversationId, content, attachments });
  };

  return (
    <MessagingContext.Provider value={{ messages, loadMessages, sendMessage }}>
      {children}
    </MessagingContext.Provider>
  );
}
```

### Implementation: Monitoring & Observability

**Install Grafana Cloud (free tier):**
```bash
# Sign up at grafana.com
# Get API key and connection info

# Install Prometheus client
npm install prom-client

# Install Winston for logging
npm install winston winston-daily-rotate-file
```

**Create metrics service:**
```javascript
// lib/monitoring/metrics.js
const promClient = require('prom-client');

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const websocketConnections = new promClient.Gauge({
  name: 'websocket_connections_total',
  help: 'Total number of active WebSocket connections'
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Number of currently active users'
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(websocketConnections);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeUsers);

// Middleware to track HTTP metrics
function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });

  next();
}

// Metrics endpoint
function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}

module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    websocketConnections,
    databaseQueryDuration,
    activeUsers
  }
};
```

**Add to server:**
```javascript
// server-production.js
const { metricsMiddleware, metricsEndpoint } = require('./lib/monitoring/metrics');

// Add metrics middleware
app.use(metricsMiddleware);

// Metrics endpoint (for Prometheus scraping)
app.get('/metrics', metricsEndpoint);
```

**Configure logging:**
```javascript
// lib/monitoring/logger.js
const winston = require('winston');
require('winston-daily-rotate-file');

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    fileRotateTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

module.exports = logger;
```

**Install Sentry:**
```bash
npm install @sentry/node
```

**Configure Sentry:**
```javascript
// server-production.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app })
  ]
});

// Add Sentry request handler (must be before routes)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... routes ...

// Add Sentry error handler (must be before other error handlers)
app.use(Sentry.Handlers.errorHandler());
```

**Create Grafana dashboard:**
Connect to Grafana Cloud and import dashboard JSON:
```json
{
  "dashboard": {
    "title": "Flux Studio Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Request Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Active WebSocket Connections",
        "targets": [
          {
            "expr": "websocket_connections_total"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

**Deliverables:**
- [ ] Message persistence implemented
- [ ] Frontend loads message history
- [ ] Prometheus metrics exposed
- [ ] Grafana dashboard created
- [ ] Winston logging configured
- [ ] Sentry error tracking active
- [ ] Alerts configured for critical metrics

---

## Weeks 5-8: Yjs Real-Time Collaboration

*(Due to length constraints, I'll provide the Week 5-8 implementation guide in a separate document)*

**Quick Overview:**
- Week 5: Yjs cursor tracking MVP
- Week 6: Canvas element synchronization
- Week 7: Offline support (IndexedDB)
- Week 8: Comments, annotations, testing

---

## Weeks 9-12: UX Polish for Wide Adoption

*(Also provided separately due to length)*

**Quick Overview:**
- Week 9: Simplified onboarding (5 → 3 steps)
- Week 10: Bulk operations + file preview
- Week 11: Accessibility fixes (WCAG 2.1 Level AA)
- Week 12: Final polish, beta testing, launch prep

---

## Success Criteria

### Week 2 Checklist (Security Complete)
- [ ] Security score: 8/10 (from 5/10)
- [ ] All 7 critical vulnerabilities fixed
- [ ] Third-party audit passed
- [ ] Zero critical npm vulnerabilities
- [ ] JWT refresh tokens working
- [ ] XSS protection deployed
- [ ] MFA available to users
- [ ] Rate limiting active

### Week 4 Checklist (Technical Foundation)
- [ ] Message persistence working (no data loss)
- [ ] Monitoring active (Grafana + Sentry)
- [ ] Test suite fixed (no infinite loops)
- [ ] Server.js refactored (3 microservices)
- [ ] Production uptime >99%

### Week 8 Checklist (Collaboration MVP)
- [ ] Yjs cursor tracking working
- [ ] 2+ users can edit simultaneously
- [ ] No conflicts or data loss
- [ ] Offline edits sync correctly
- [ ] 50+ concurrent users tested

### Week 12 Checklist (Production Ready)
- [ ] Onboarding <5 minutes
- [ ] Onboarding completion >80%
- [ ] Bulk operations working
- [ ] File preview implemented
- [ ] WCAG 2.1 Level A complete
- [ ] 50 beta users actively using platform
- [ ] NPS >40

---

## Next Steps

1. **TODAY:** Review this plan with team
2. **Day 1:** Start emergency security sprint
3. **Week 1:** Complete critical security fixes
4. **Week 2:** Security hardening + third-party audit
5. **Week 3-4:** Message persistence + monitoring
6. **Week 5-8:** Yjs implementation
7. **Week 9-12:** UX polish + beta launch

---

**Document Status:** ✅ READY FOR EXECUTION
**Next Document:** `/Users/kentino/FluxStudio/YJS_IMPLEMENTATION_GUIDE.md`
**Contact:** Tech Lead for questions

Let's ship it! 🚀
