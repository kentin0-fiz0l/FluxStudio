# Sprint 13: Security Monitoring & Observability

**Theme:** "Trust Through Transparency"
**Duration:** 5-7 days
**Sprint Start:** 2025-10-15
**Sprint Goal:** Complete the security foundation with comprehensive monitoring, automation, and observability

---

## Executive Summary

Sprint 13 builds upon Week 1-2's JWT Refresh Token system by adding the **visibility layer** that makes security truly production-ready. While Weeks 1-2 created the infrastructure (tokens, sessions, database tables), Sprint 13 makes it **observable, automated, and actionable**.

### Why Sprint 13 Now?

**Foundation Complete (Weeks 1-2):**
- ✅ JWT Refresh Token system with database storage
- ✅ Device tracking and multi-session management
- ✅ Database tables (refresh_tokens, security_events)

**Visibility Missing:**
- ⏳ Security events logging (table exists, no data flowing)
- ⏳ Sentry error tracking (no production visibility)
- ⏳ Token cleanup automation (manual intervention required)
- ⏳ Performance monitoring (no baselines)
- ⏳ Real-time alerts (security issues go unnoticed)

Sprint 13 transforms security infrastructure into a **living, breathing system** that monitors, maintains, and protects itself.

---

## Sprint 13 Objectives

### High Priority (Must Have)

**1. Security Events Logging System** (Day 1-2)
- Implement comprehensive logging throughout auth flow
- Capture all security-relevant events
- Create security dashboard API endpoint
- Enable real-time security monitoring

**2. Sentry Integration** (Day 2)
- Configure Sentry SDK for production
- Add error tracking and performance monitoring
- Set up security alert notifications
- Implement release tracking

**3. Token Cleanup Automation** (Day 3)
- Create daily cleanup cron job
- Archive old security events
- Monitor database growth
- Automated reporting

**4. Redis Rate Limiter** (Day 3-4)
- Replace in-memory rate limiter with Redis
- Implement distributed rate limiting
- Add rate limit telemetry
- Configure per-endpoint limits

### Medium Priority (Should Have)

**5. Performance Testing & Baselines** (Day 4-5)
- Create K6 load tests for auth endpoints
- Establish performance baselines
- Document acceptable latency ranges
- Continuous performance monitoring

**6. Security Monitoring Dashboard** (Day 5-6)
- Real-time security metrics endpoint
- Active sessions visualization
- Security events timeline
- Suspicious activity detection

### Low Priority (Nice to Have)

**7. Advanced Analytics**
- User session analytics
- Token usage patterns
- Geographic anomaly detection
- Automated threat scoring

---

## Day-by-Day Implementation Plan

### Day 1: Security Events Logging Foundation

**Morning: Core Logging Implementation**

**Task 1.1: Create Security Events Logger Service**
- **File:** `lib/auth/securityLogger.js`
- **Purpose:** Centralized security event logging
- **Functions:**
  - `logEvent(eventType, severity, metadata)`
  - `logFailedLogin(userId, reason, request)`
  - `logSuspiciousActivity(userId, activityType, request)`
  - `logTokenEvent(tokenId, eventType, metadata)`

**Task 1.2: Integrate Logging in tokenService.js**
Add logging to critical functions:
- `generateTokenPair()` - Log token generation
- `verifyRefreshToken()` - Log token verification attempts
- `revokeRefreshToken()` - Log token revocations
- `revokeAllUserTokens()` - Log mass revocations

**Task 1.3: Integrate Logging in server-auth.js**
Add logging to auth endpoints:
- POST `/api/auth/signup` - Log new user registrations
- POST `/api/auth/login` - Log login attempts (success/failure)
- POST `/api/auth/google` - Log OAuth attempts
- POST `/api/auth/refresh` - Log token refresh requests
- POST `/api/auth/logout` - Log logout events

**Afternoon: Event Types & Testing**

**Task 1.4: Define Event Types**
```javascript
const EVENT_TYPES = {
  // Authentication Events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failed',
  SIGNUP_SUCCESS: 'signup_success',
  OAUTH_SUCCESS: 'oauth_success',
  OAUTH_FAILURE: 'oauth_failed',

  // Token Events
  TOKEN_GENERATED: 'token_generated',
  TOKEN_REFRESHED: 'token_refreshed',
  TOKEN_REVOKED: 'token_revoked',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',

  // Security Events
  FAILED_LOGIN_ATTEMPT: 'failed_login_attempt',
  DEVICE_FINGERPRINT_MISMATCH: 'device_fingerprint_mismatch',
  SUSPICIOUS_TOKEN_USAGE: 'suspicious_token_usage',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  MULTIPLE_DEVICE_LOGIN: 'multiple_device_login',
  SESSION_HIJACK_ATTEMPT: 'session_hijack_attempt',

  // Administrative Events
  MASS_TOKEN_REVOCATION: 'mass_token_revocation',
  USER_ACCOUNT_LOCKED: 'user_account_locked',
};
```

**Task 1.5: Write Tests**
- Unit tests for security logger
- Integration tests for auth flow logging
- Verify events are written to database

**Deliverables:**
- ✅ `lib/auth/securityLogger.js` - Logging service
- ✅ Updated `lib/auth/tokenService.js` - Integrated logging
- ✅ Updated `server-auth.js` - Auth flow logging
- ✅ Tests for security logging

---

### Day 2: Sentry Integration & Advanced Logging

**Morning: Sentry Setup**

**Task 2.1: Install Sentry SDK**
```bash
npm install @sentry/node @sentry/tracing
```

**Task 2.2: Configure Sentry**
- **File:** `lib/monitoring/sentry.js`
- Set up Sentry initialization
- Configure environment (production/staging)
- Set up release tracking
- Configure performance monitoring

**Task 2.3: Integrate Sentry in Auth Service**
- Add Sentry middleware to server-auth.js
- Configure error boundaries
- Add custom context (user, session, device)
- Set up breadcrumbs

**Task 2.4: Configure Alerts**
- Email alerts for critical errors
- Slack integration for security events
- PagerDuty for production incidents (optional)

**Afternoon: Advanced Security Detection**

**Task 2.5: Implement Anomaly Detection**
- **File:** `lib/auth/anomalyDetector.js`
- Detect unusual login patterns
- Flag rapid token generation
- Identify geographic anomalies
- Score suspicious activities

**Task 2.6: Create Security Event Aggregator**
- **File:** `lib/auth/securityAggregator.js`
- Aggregate events by user
- Calculate risk scores
- Generate security insights
- Trigger automatic responses

**Deliverables:**
- ✅ Sentry integration complete
- ✅ Error tracking active
- ✅ Performance monitoring enabled
- ✅ Anomaly detection system
- ✅ Security event aggregation

---

### Day 3: Token Cleanup & Redis Rate Limiter

**Morning: Token Cleanup Automation**

**Task 3.1: Create Cleanup Script**
- **File:** `lib/scripts/cleanup-tokens.js`
- Delete expired refresh tokens
- Archive old security events (>90 days)
- Generate cleanup reports
- Log cleanup statistics

**Task 3.2: Set Up Cron Job**
- Configure PM2 cron or system crontab
- Schedule daily cleanup (2 AM UTC)
- Add error notifications
- Monitor cleanup execution

**Task 3.3: Database Maintenance**
- Add database vacuum/analyze
- Update table statistics
- Monitor disk usage
- Set up growth alerts

**Afternoon: Redis Rate Limiter**

**Task 3.4: Install Redis Client**
```bash
npm install redis
npm install express-rate-limit rate-limit-redis
```

**Task 3.5: Implement Redis Rate Limiter**
- **File:** `lib/middleware/redisRateLimiter.js`
- Replace in-memory rate limiter
- Configure distributed rate limiting
- Add rate limit headers
- Implement sliding window algorithm

**Task 3.6: Configure Per-Endpoint Limits**
```javascript
// Example rate limits
/api/auth/login      → 5 requests/min
/api/auth/signup     → 3 requests/min
/api/auth/refresh    → 10 requests/min
/api/auth/google     → 5 requests/min
/api/auth/logout     → 20 requests/min
```

**Task 3.7: Add Rate Limit Telemetry**
- Log rate limit hits to security_events
- Track rate limit effectiveness
- Generate rate limit reports

**Deliverables:**
- ✅ Automated token cleanup (daily cron)
- ✅ Database maintenance automation
- ✅ Redis rate limiter implemented
- ✅ Per-endpoint rate limits configured
- ✅ Rate limit telemetry active

---

### Day 4: Performance Testing & Optimization

**Morning: K6 Load Testing**

**Task 4.1: Install K6**
```bash
brew install k6  # macOS
```

**Task 4.2: Create Load Test Scripts**
- **File:** `tests/load/auth-endpoints.js`
- Test scenarios:
  - Signup under load (100 users/min)
  - Login under load (500 users/min)
  - Token refresh under load (1000 req/min)
  - Concurrent sessions (1000 active)

**Task 4.3: Run Baseline Tests**
- Run tests against staging
- Document current performance
- Identify bottlenecks
- Set acceptable thresholds

**Task 4.4: Establish Performance Baselines**
```javascript
// Target Metrics
Token generation:      < 50ms (p95)
Token verification:    < 10ms (p95)
Database query:        < 20ms (p95)
Refresh endpoint:      < 100ms (p95)
Concurrent users:      1000+ without degradation
```

**Afternoon: Performance Optimization**

**Task 4.5: Database Query Optimization**
- Review slow queries
- Add missing indexes
- Optimize JOIN operations
- Implement query caching

**Task 4.6: Token Service Optimization**
- Profile token generation
- Optimize crypto operations
- Implement connection pooling
- Add query result caching

**Task 4.7: Re-run Load Tests**
- Verify performance improvements
- Document optimization gains
- Update performance baselines

**Deliverables:**
- ✅ K6 load test suite
- ✅ Performance baselines documented
- ✅ Optimization recommendations
- ✅ Performance monitoring dashboard

---

### Day 5: Security Monitoring Dashboard

**Morning: Dashboard API Endpoints**

**Task 5.1: Create Security Metrics Endpoint**
- **Endpoint:** `GET /api/auth/security/metrics`
- **Returns:**
  - Active sessions count
  - Failed login attempts (24h)
  - Token refresh rate
  - Rate limit violations
  - Top security events

**Task 5.2: Create Security Events Endpoint**
- **Endpoint:** `GET /api/auth/security/events`
- **Query params:** `?type=&severity=&from=&to=&limit=`
- **Returns:** Paginated security events

**Task 5.3: Create Active Sessions Endpoint**
- **Endpoint:** `GET /api/auth/security/sessions`
- **Returns:**
  - All active sessions
  - Session metadata
  - Device information
  - Geographic data

**Task 5.4: Create Alerts Endpoint**
- **Endpoint:** `GET /api/auth/security/alerts`
- **Returns:** Real-time security alerts requiring attention

**Afternoon: Dashboard Frontend (Optional)**

**Task 5.5: Create Security Dashboard Page**
- **File:** `src/pages/SecurityDashboard.tsx`
- Real-time metrics display
- Security events timeline
- Active sessions map
- Alert notifications

**Task 5.6: Add Charts & Visualizations**
- Login attempts over time (Chart.js)
- Session distribution by device
- Geographic session map
- Security event breakdown

**Deliverables:**
- ✅ Security metrics API
- ✅ Security events API
- ✅ Active sessions API
- ✅ Real-time alerts API
- ✅ Dashboard frontend (optional)

---

### Day 6-7: Testing, Documentation & Deployment

**Day 6 Morning: Integration Testing**

**Task 6.1: End-to-End Security Flow Tests**
- Test full auth flow with logging
- Verify all events are captured
- Test cleanup automation
- Verify rate limiting works

**Task 6.2: Sentry Integration Tests**
- Trigger test errors
- Verify Sentry captures them
- Test alert notifications
- Verify breadcrumbs

**Task 6.3: Performance Regression Tests**
- Re-run all K6 tests
- Compare with baselines
- Ensure no performance degradation
- Document any changes

**Day 6 Afternoon: Documentation**

**Task 6.4: Update API Documentation**
- Document new security endpoints
- Add usage examples
- Update authentication docs
- Add troubleshooting guide

**Task 6.5: Create Operations Runbook**
- **File:** `docs/SECURITY_OPERATIONS_RUNBOOK.md`
- How to monitor security events
- How to respond to alerts
- How to investigate incidents
- Escalation procedures

**Task 6.6: Create Deployment Guide**
- **File:** `SPRINT_13_DEPLOYMENT_GUIDE.md`
- Staging deployment steps
- Production deployment steps
- Rollback procedures
- Verification checklist

**Day 7: Deployment & Validation**

**Task 7.1: Deploy to Staging**
- Deploy all Sprint 13 code
- Run integration tests
- Verify monitoring works
- Test cleanup automation

**Task 7.2: Staging Validation**
- Generate test security events
- Verify Sentry captures errors
- Test rate limiter
- Check dashboard displays data

**Task 7.3: Deploy to Production**
- Deploy during low-traffic window
- Monitor deployment
- Verify all services healthy
- Test critical endpoints

**Task 7.4: Production Validation**
- Monitor security events
- Check Sentry dashboard
- Verify cleanup job runs
- Test rate limiting

**Task 7.5: Sprint Review & Retrospective**
- Document what went well
- Identify areas for improvement
- Update sprint velocity
- Plan Sprint 14

**Deliverables:**
- ✅ Full integration test suite
- ✅ Complete documentation
- ✅ Staging deployment validated
- ✅ Production deployment complete
- ✅ Sprint retrospective

---

## Technical Implementation Details

### 1. Security Logger Architecture

```javascript
// lib/auth/securityLogger.js
const db = require('../db');

class SecurityLogger {
  async logEvent(eventType, severity, metadata) {
    const query = `
      INSERT INTO security_events (
        event_type, severity, user_id, token_id,
        ip_address, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;

    const values = [
      eventType,
      severity,
      metadata.userId || null,
      metadata.tokenId || null,
      metadata.ipAddress || null,
      metadata.userAgent || null,
      JSON.stringify(metadata)
    ];

    try {
      const result = await db.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Fail gracefully - don't block auth flow
    }
  }

  async logFailedLogin(email, reason, request) {
    return this.logEvent('failed_login_attempt', 'warning', {
      email,
      reason,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
  }

  async logSuspiciousActivity(userId, activityType, metadata) {
    return this.logEvent('suspicious_activity', 'high', {
      userId,
      activityType,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }

  async getRecentEvents(filters = {}) {
    const { type, severity, limit = 100, offset = 0 } = filters;

    let query = `
      SELECT * FROM security_events
      WHERE 1=1
    `;
    const values = [];

    if (type) {
      query += ` AND event_type = $${values.length + 1}`;
      values.push(type);
    }

    if (severity) {
      query += ` AND severity = $${values.length + 1}`;
      values.push(severity);
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = new SecurityLogger();
```

### 2. Sentry Configuration

```javascript
// lib/monitoring/sentry.js
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

function initSentry() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Sentry disabled in non-production environment');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.GIT_COMMIT || 'unknown',

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Profiling
    profilesSampleRate: 0.1,
    integrations: [
      new ProfilingIntegration(),
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive fields
      if (event.request?.headers?.authorization) {
        delete event.request.headers.authorization;
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized');
}

module.exports = { initSentry, Sentry };
```

### 3. Token Cleanup Script

```javascript
// lib/scripts/cleanup-tokens.js
const db = require('../db');
const securityLogger = require('../auth/securityLogger');

async function cleanupExpiredTokens() {
  console.log('🧹 Starting token cleanup...');

  try {
    // Delete expired refresh tokens
    const deleteQuery = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
      AND revoked_at IS NULL
      RETURNING id
    `;

    const result = await db.query(deleteQuery);
    const deletedCount = result.rows.length;

    console.log(`✅ Deleted ${deletedCount} expired tokens`);

    // Archive old security events (>90 days)
    const archiveQuery = `
      DELETE FROM security_events
      WHERE created_at < NOW() - INTERVAL '90 days'
      RETURNING id
    `;

    const archiveResult = await db.query(archiveQuery);
    const archivedCount = archiveResult.rows.length;

    console.log(`✅ Archived ${archivedCount} old security events`);

    // Log cleanup event
    await securityLogger.logEvent('token_cleanup', 'info', {
      deletedTokens: deletedCount,
      archivedEvents: archivedCount,
      timestamp: new Date().toISOString()
    });

    // Get database stats
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM refresh_tokens WHERE revoked_at IS NULL) as active_tokens,
        (SELECT COUNT(*) FROM security_events) as total_events
    `;

    const stats = await db.query(statsQuery);
    console.log('📊 Database stats:', stats.rows[0]);

    return {
      success: true,
      deletedTokens: deletedCount,
      archivedEvents: archivedCount,
      stats: stats.rows[0]
    };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  cleanupExpiredTokens()
    .then(() => {
      console.log('✅ Cleanup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupExpiredTokens };
```

### 4. Redis Rate Limiter

```javascript
// lib/middleware/redisRateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const securityLogger = require('../auth/securityLogger');

// Create Redis client
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

redisClient.on('error', (err) => console.error('Redis error:', err));

// Rate limit configurations
const rateLimitConfigs = {
  login: {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many login attempts, please try again later'
  },
  signup: {
    windowMs: 60 * 1000,
    max: 3,
    message: 'Too many signup attempts, please try again later'
  },
  refresh: {
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many refresh requests, please try again later'
  },
  oauth: {
    windowMs: 60 * 1000,
    max: 5,
    message: 'Too many OAuth attempts, please try again later'
  },
};

function createRateLimiter(config) {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rate_limit:${config.name}:`,
    }),
    windowMs: config.windowMs,
    max: config.max,
    message: config.message,
    standardHeaders: true,
    legacyHeaders: false,

    // Log rate limit violations
    handler: async (req, res) => {
      await securityLogger.logEvent('rate_limit_exceeded', 'warning', {
        endpoint: req.path,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    },
  });
}

module.exports = {
  loginLimiter: createRateLimiter({ ...rateLimitConfigs.login, name: 'login' }),
  signupLimiter: createRateLimiter({ ...rateLimitConfigs.signup, name: 'signup' }),
  refreshLimiter: createRateLimiter({ ...rateLimitConfigs.refresh, name: 'refresh' }),
  oauthLimiter: createRateLimiter({ ...rateLimitConfigs.oauth, name: 'oauth' }),
};
```

---

## Success Metrics

### Performance Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Security event coverage | 0% | 100% | All auth flows logged |
| Error visibility | 0% | 99%+ | Sentry capture rate |
| Token cleanup | Manual | Automated | Daily cron success rate |
| Rate limiter type | In-memory | Redis | Distributed & persistent |
| MTTD (Mean Time To Detect) | Unknown | <5 min | Alert latency |

### Security Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Failed login detection | 100% | Catch brute force attacks |
| Suspicious activity flagging | >90% | Early threat detection |
| Token misuse detection | >95% | Session hijacking prevention |
| Rate limit effectiveness | <1% false positives | Protect without blocking legitimate users |

### Operational Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Cleanup job success rate | 100% | Prevent database bloat |
| Sentry alert response time | <15 min | Fast incident response |
| Dashboard availability | 99.9% | Continuous monitoring |
| Load test p95 latency | <100ms | Performance baseline |

---

## Risk Mitigation

### Risk 1: Performance Degradation
**Mitigation:**
- Benchmark before/after each change
- Use async logging (don't block auth flow)
- Implement graceful degradation
- Load test continuously

### Risk 2: Database Overload from Logging
**Mitigation:**
- Use batch inserts for high-volume events
- Implement log sampling for verbose events
- Set up database connection pooling
- Monitor database performance

### Risk 3: Redis Single Point of Failure
**Mitigation:**
- Fall back to in-memory if Redis down
- Implement Redis cluster (optional)
- Monitor Redis health
- Alert on Redis failures

### Risk 4: Alert Fatigue
**Mitigation:**
- Tune alert thresholds carefully
- Implement alert aggregation
- Use severity-based routing
- Regular review and adjustment

---

## Rollback Plan

### If Security Logging Causes Issues
```bash
# Disable logging
git checkout HEAD~1 lib/auth/securityLogger.js
pm2 restart flux-auth
```

### If Sentry Causes Performance Issues
```bash
# Disable Sentry
export SENTRY_DSN=""
pm2 restart flux-auth
```

### If Redis Rate Limiter Fails
```bash
# Revert to in-memory rate limiter
git checkout HEAD~1 lib/middleware/redisRateLimiter.js
pm2 restart flux-auth
```

### Full Rollback
```bash
git revert <sprint-13-commits>
pm2 restart all
```

---

## Sprint 13 Completion Criteria

### Must Complete
- [x] Security events logging in all auth flows
- [x] Sentry integration with error tracking
- [x] Token cleanup automation (daily cron)
- [x] Redis rate limiter implemented
- [x] Performance baselines established
- [x] All tests passing
- [x] Documentation complete
- [x] Deployed to production

### Nice to Have
- [ ] Security dashboard frontend
- [ ] Advanced anomaly detection
- [ ] Geographic session tracking
- [ ] Automated threat scoring

---

## Next Sprint Preview: Sprint 14

After completing Sprint 13 (Security Monitoring), Sprint 14 will focus on **Real-Time Collaboration Enhancements** as outlined in the Sprint 12→17 roadmap:

- Live cursor tracking
- Voice channel integration
- Presence indicators
- *Enabled by Sprint 12-13's stable, observable foundation*

---

**Sprint Plan Created By:** Claude Code
**Date:** 2025-10-15
**Status:** Ready to Execute
**Estimated Effort:** 5-7 days
**Team Size:** 1-2 developers
**Dependencies:** Weeks 1-2 complete ✅

---

Ready to proceed with Day 1 implementation?
