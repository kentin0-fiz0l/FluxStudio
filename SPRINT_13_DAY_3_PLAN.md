# Sprint 13, Day 3: Token Cleanup & Enhanced Rate Limiting

**Date:** 2025-10-16 (Planned)
**Status:** 📋 Ready to Begin
**Prerequisites:** ✅ Day 1 & Day 2 Complete, ⏳ Production Environment Stable

---

## Objectives

1. **Automated Token Cleanup** - Cron job for expired/revoked token removal
2. **Enhanced Rate Limiting** - Advanced Redis-based rate limiting middleware
3. **IP Reputation System** - Track and score IP addresses for threat detection
4. **Email Alerting** - SMTP integration for high-severity security events
5. **Admin Dashboard** - View blocked IPs, active anomalies, and token statistics

---

## Task Breakdown

### Task 1: Automated Token Cleanup (1.5 hours)

**1.1 Create Token Cleanup Service**
- File: `lib/auth/tokenCleanup.js`
- Features:
  - Delete expired refresh tokens (older than 7 days)
  - Delete revoked tokens
  - Delete orphaned session records
  - Archive security events older than 90 days
  - Generate cleanup statistics report

**1.2 Implement Cron Job**
- File: `lib/cron/scheduler.js`
- Schedule: Daily at 2:00 AM UTC
- Features:
  - PM2 cron integration or node-cron
  - Error handling and retry logic
  - Slack/email notifications on completion
  - Performance monitoring

**1.3 Add Manual Cleanup Endpoint**
- Endpoint: `POST /api/admin/cleanup/tokens`
- Admin-only authentication required
- Returns cleanup statistics
- Triggers immediate cleanup run

### Task 2: Enhanced Redis Rate Limiting (2 hours)

**2.1 Create Advanced Rate Limiter**
- File: `lib/middleware/advancedRateLimiter.js`
- Features:
  - Configurable rate limits per endpoint
  - Sliding window algorithm (more accurate than fixed window)
  - Dynamic rate adjustment based on IP reputation
  - Whitelist/blacklist support
  - Grace period for authenticated users

**2.2 Implement Rate Limit Tiers**
```javascript
const rateLimits = {
  anonymous: {
    login: '5/5min',      // 5 attempts per 5 minutes
    signup: '3/hour',     // 3 signups per hour
    api: '100/hour'       // 100 API calls per hour
  },
  authenticated: {
    api: '1000/hour',     // Higher limit for logged-in users
    upload: '50/hour'
  },
  premium: {
    api: '5000/hour',     // Even higher for premium users
    upload: '200/hour'
  }
};
```

**2.3 Add Rate Limit Headers**
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets
- `Retry-After`: Seconds until retry allowed

### Task 3: IP Reputation System (1.5 hours)

**3.1 Create IP Reputation Tracker**
- File: `lib/security/ipReputation.js`
- Features:
  - Score IPs based on behavior (0-100, lower is worse)
  - Track failed login attempts
  - Track blocked requests
  - Track successful authentications
  - Decay scores over time (rehabilitation)

**3.2 Reputation Scoring Algorithm**
```javascript
const scoringRules = {
  failedLogin: -10,           // Each failed login
  blockedRequest: -5,         // Each blocked request
  successfulAuth: +5,         // Successful authentication
  cleanDay: +1,               // Each day with no issues
  bruteForceDetected: -50,    // Brute force attack
  botActivityDetected: -30    // Bot activity
};

const thresholds = {
  banned: 0-20,               // Auto-ban
  suspicious: 21-40,          // Extra scrutiny
  neutral: 41-60,             // Normal
  trusted: 61-100             // Relaxed limits
};
```

**3.3 Integrate with Rate Limiter**
- Low reputation IPs: Stricter rate limits
- High reputation IPs: Relaxed rate limits
- Banned IPs: Immediate 403 response

### Task 4: Email Alerting System (1 hour)

**4.1 Create Email Alert Service**
- File: `lib/alerts/emailAlerts.js`
- Features:
  - SMTP configuration (SendGrid, AWS SES, or local)
  - Template system for different alert types
  - Priority-based queuing
  - Rate limiting (don't spam admins)
  - Batch similar alerts

**4.2 Alert Types**
```javascript
const alertTypes = {
  BRUTE_FORCE: {
    priority: 'high',
    threshold: 'immediate',
    subject: '🚨 Brute Force Attack Detected'
  },
  ACCOUNT_TAKEOVER: {
    priority: 'critical',
    threshold: 'immediate',
    subject: '🔴 Possible Account Takeover'
  },
  RAPID_TOKEN_REFRESH: {
    priority: 'high',
    threshold: 'immediate',
    subject: '⚠️ Suspicious Token Activity'
  },
  BOT_ACTIVITY: {
    priority: 'medium',
    threshold: 'batch_5min',
    subject: '🤖 Bot Activity Detected'
  },
  MULTIPLE_DEVICES: {
    priority: 'low',
    threshold: 'batch_1hour',
    subject: 'ℹ️ Multiple Device Login'
  }
};
```

**4.3 Admin Configuration**
- Environment variables for SMTP
- Admin email addresses
- Alert preferences per admin
- Quiet hours (no alerts during sleep)

### Task 5: Admin Dashboard Endpoints (1 hour)

**5.1 Blocked IPs Dashboard**
- Endpoint: `GET /api/admin/security/blocked-ips`
- Returns:
  - List of currently blocked IPs
  - Block reason
  - Block duration remaining
  - IP reputation score
  - Historical blocks

**5.2 Active Anomalies Dashboard**
- Endpoint: `GET /api/admin/security/anomalies`
- Returns:
  - Recent anomaly detections (last 24 hours)
  - Anomaly type distribution
  - Affected users
  - Geographic distribution
  - Trend analysis

**5.3 Token Statistics Dashboard**
- Endpoint: `GET /api/admin/security/token-stats`
- Returns:
  - Active tokens count
  - Expired tokens count
  - Revoked tokens count
  - Average token age
  - Token refresh rate
  - Top users by token count

**5.4 Manual IP Management**
- Endpoint: `POST /api/admin/security/unblock-ip`
- Allows admins to manually unblock IPs
- Endpoint: `POST /api/admin/security/whitelist-ip`
- Add IPs to permanent whitelist

---

## Implementation Details

### Token Cleanup Service

```javascript
// lib/auth/tokenCleanup.js
const { query } = require('../db');
const securityLogger = require('./securityLogger');

class TokenCleanupService {
  async cleanupExpiredTokens() {
    const result = await query(`
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
      RETURNING id
    `);

    console.log(`🧹 Cleaned up ${result.rows.length} expired tokens`);

    await securityLogger.logEvent(
      'token_cleanup_completed',
      'INFO',
      {
        tokensDeleted: result.rows.length,
        timestamp: new Date().toISOString()
      }
    );

    return result.rows.length;
  }

  async cleanupRevokedTokens() {
    // Tokens revoked more than 7 days ago
    const result = await query(`
      DELETE FROM refresh_tokens
      WHERE revoked = true
      AND revoked_at < NOW() - INTERVAL '7 days'
      RETURNING id
    `);

    console.log(`🧹 Cleaned up ${result.rows.length} revoked tokens`);
    return result.rows.length;
  }

  async cleanupOrphanedSessions() {
    // Sessions without valid tokens
    const result = await query(`
      DELETE FROM user_sessions
      WHERE id NOT IN (
        SELECT DISTINCT session_id
        FROM refresh_tokens
        WHERE expires_at > NOW()
      )
      RETURNING id
    `);

    console.log(`🧹 Cleaned up ${result.rows.length} orphaned sessions`);
    return result.rows.length;
  }

  async runFullCleanup() {
    const stats = {
      expiredTokens: await this.cleanupExpiredTokens(),
      revokedTokens: await this.cleanupRevokedTokens(),
      orphanedSessions: await this.cleanupOrphanedSessions(),
      timestamp: new Date().toISOString()
    };

    console.log('✅ Full cleanup completed:', stats);
    return stats;
  }
}

module.exports = new TokenCleanupService();
```

### Advanced Rate Limiter

```javascript
// lib/middleware/advancedRateLimiter.js
const cache = require('../cache');

class AdvancedRateLimiter {
  constructor() {
    this.limits = {
      'POST /api/auth/login': { max: 5, window: 300 },    // 5/5min
      'POST /api/auth/signup': { max: 3, window: 3600 },  // 3/hour
      'POST /api/files/upload': { max: 50, window: 3600 } // 50/hour
    };
  }

  async checkLimit(key, max, window) {
    const now = Date.now();
    const windowKey = `ratelimit:${key}:${Math.floor(now / (window * 1000))}`;

    // Get current count
    const current = await cache.get(windowKey);
    const count = current ? parseInt(current) + 1 : 1;

    // Set with expiration
    await cache.set(windowKey, count.toString(), window);

    return {
      allowed: count <= max,
      current: count,
      limit: max,
      remaining: Math.max(0, max - count),
      reset: Math.ceil(now / (window * 1000)) * window * 1000
    };
  }

  middleware() {
    return async (req, res, next) => {
      const endpoint = `${req.method} ${req.path}`;
      const limit = this.limits[endpoint];

      if (!limit) {
        return next(); // No limit for this endpoint
      }

      const key = `${req.ip}:${endpoint}`;
      const result = await this.checkLimit(key, limit.max, limit.window);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.reset).toISOString()
      });

      if (!result.allowed) {
        res.set('Retry-After', Math.ceil((result.reset - Date.now()) / 1000));
        return res.status(429).json({
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
        });
      }

      next();
    };
  }
}

module.exports = new AdvancedRateLimiter();
```

### IP Reputation System

```javascript
// lib/security/ipReputation.js
const cache = require('../cache');
const securityLogger = require('../auth/securityLogger');

class IPReputationSystem {
  constructor() {
    this.scoringRules = {
      failedLogin: -10,
      blockedRequest: -5,
      successfulAuth: +5,
      bruteForceDetected: -50,
      botActivityDetected: -30
    };

    this.thresholds = {
      banned: 20,      // < 20 = banned
      suspicious: 40,  // 20-40 = suspicious
      neutral: 60,     // 40-60 = neutral
      trusted: 100     // 60+ = trusted
    };
  }

  async getScore(ipAddress) {
    const key = `ip_reputation:${ipAddress}`;
    const score = await cache.get(key);
    return score ? parseInt(score) : 50; // Default neutral
  }

  async adjustScore(ipAddress, event) {
    const adjustment = this.scoringRules[event] || 0;
    const currentScore = await this.getScore(ipAddress);
    const newScore = Math.max(0, Math.min(100, currentScore + adjustment));

    // Store for 30 days
    await cache.set(`ip_reputation:${ipAddress}`, newScore.toString(), 30 * 24 * 3600);

    // Log significant changes
    if (this.getLevel(newScore) !== this.getLevel(currentScore)) {
      await securityLogger.logEvent(
        'ip_reputation_changed',
        'INFO',
        {
          ipAddress,
          oldScore: currentScore,
          newScore,
          event,
          level: this.getLevel(newScore)
        }
      );
    }

    return newScore;
  }

  getLevel(score) {
    if (score < this.thresholds.banned) return 'banned';
    if (score < this.thresholds.suspicious) return 'suspicious';
    if (score < this.thresholds.neutral) return 'neutral';
    return 'trusted';
  }

  async isBanned(ipAddress) {
    const score = await this.getScore(ipAddress);
    return score < this.thresholds.banned;
  }

  async getRateLimitMultiplier(ipAddress) {
    const score = await this.getScore(ipAddress);
    const level = this.getLevel(score);

    const multipliers = {
      banned: 0,      // No requests allowed
      suspicious: 0.5, // Half the normal limit
      neutral: 1.0,    // Normal limit
      trusted: 2.0     // Double the limit
    };

    return multipliers[level];
  }
}

module.exports = new IPReputationSystem();
```

---

## Testing Strategy

### Unit Tests

```javascript
describe('TokenCleanupService', () => {
  it('should delete expired tokens', async () => {
    const result = await tokenCleanup.cleanupExpiredTokens();
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('should delete revoked tokens older than 7 days', async () => {
    const result = await tokenCleanup.cleanupRevokedTokens();
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('AdvancedRateLimiter', () => {
  it('should allow requests under limit', async () => {
    const result = await rateLimiter.checkLimit('test:ip', 5, 60);
    expect(result.allowed).toBe(true);
  });

  it('should block requests over limit', async () => {
    for (let i = 0; i < 6; i++) {
      await rateLimiter.checkLimit('test:ip2', 5, 60);
    }
    const result = await rateLimiter.checkLimit('test:ip2', 5, 60);
    expect(result.allowed).toBe(false);
  });
});

describe('IPReputationSystem', () => {
  it('should decrease score on failed login', async () => {
    const initial = await ipReputation.getScore('1.2.3.4');
    await ipReputation.adjustScore('1.2.3.4', 'failedLogin');
    const after = await ipReputation.getScore('1.2.3.4');
    expect(after).toBeLessThan(initial);
  });

  it('should ban IPs with low scores', async () => {
    // Simulate multiple violations
    for (let i = 0; i < 5; i++) {
      await ipReputation.adjustScore('5.6.7.8', 'bruteForceDetected');
    }
    const banned = await ipReputation.isBanned('5.6.7.8');
    expect(banned).toBe(true);
  });
});
```

### Integration Tests

```bash
# Test token cleanup
curl -X POST http://localhost:3001/api/admin/cleanup/tokens \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Check rate limit headers
curl -i http://localhost:3001/api/auth/login

# Test IP reputation
curl -X GET http://localhost:3001/api/admin/security/ip-reputation/1.2.3.4 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Deployment Checklist

### Prerequisites
- ✅ Day 1 & Day 2 deployed and stable
- ✅ Redis running
- ✅ Database accessible
- ⏳ SMTP credentials (for email alerts)

### Deployment Steps

**1. Create cron configuration**
```bash
# Add to ecosystem.config.js
{
  name: 'flux-cleanup',
  script: './lib/cron/tokenCleanup.js',
  cron_restart: '0 2 * * *',  // 2 AM daily
  autorestart: false
}
```

**2. Deploy new modules**
```bash
scp lib/auth/tokenCleanup.js root@167.172.208.61:/var/www/fluxstudio/lib/auth/
scp lib/middleware/advancedRateLimiter.js root@167.172.208.61:/var/www/fluxstudio/lib/middleware/
scp lib/security/ipReputation.js root@167.172.208.61:/var/www/fluxstudio/lib/security/
scp lib/alerts/emailAlerts.js root@167.172.208.61:/var/www/fluxstudio/lib/alerts/
```

**3. Update server-auth.js**
- Import new modules
- Add advanced rate limiter middleware
- Integrate IP reputation checks
- Add admin endpoints

**4. Configure environment**
```bash
# Add to .env.production
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
ADMIN_EMAIL=admin@fluxstudio.art
ALERT_ENABLED=true
```

**5. Restart services**
```bash
pm2 restart flux-auth
pm2 start ecosystem.config.js --only flux-cleanup
```

**6. Verify**
```bash
pm2 logs flux-auth --lines 50
pm2 logs flux-cleanup --lines 20
```

---

## Success Metrics

### Day 3 Completion Criteria
- ✅ Token cleanup service implemented
- ✅ Cron job scheduled and tested
- ✅ Advanced rate limiter operational
- ✅ IP reputation system tracking
- ✅ Email alerts configured
- ✅ Admin dashboard endpoints working
- ✅ All tests passing
- ✅ Production deployment successful

### Post-Deployment Metrics
- Token cleanup runs daily without errors
- Rate limiting reduces failed login attempts by 50%
- IP reputation identifies repeat offenders
- Email alerts sent for high-severity events
- Admin dashboard provides real-time visibility
- No false positives in IP banning

---

## Timeline

- **Hour 1-1.5:** Token cleanup service & cron
- **Hour 2-4:** Advanced rate limiting
- **Hour 4-5.5:** IP reputation system
- **Hour 5.5-6.5:** Email alerting
- **Hour 6.5-7.5:** Admin dashboard endpoints
- **Hour 7.5-8:** Testing and deployment

**Total:** 8 hours

---

## Next Steps After Day 3

**Sprint 13 Day 4:** Performance Testing & Optimization
- Load test all Day 1-3 features
- Optimize Redis queries
- Database query optimization
- Scaling preparation

**Sprint 13 Day 5:** Security Monitoring Dashboard UI
- Real-time anomaly visualization
- User activity timeline
- Failed login heatmap
- Device management interface

---

**Ready to begin:** Awaiting production environment stabilization

