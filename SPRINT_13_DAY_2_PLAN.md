# Sprint 13, Day 2: Sentry Integration & Anomaly Detection

**Date:** 2025-10-15
**Status:** 🚀 Ready to Begin
**Prerequisites:** ✅ Day 1 Complete (Security Logging Deployed)

---

## Objectives

1. **Integrate Sentry** for error tracking and performance monitoring
2. **Implement anomaly detection** for suspicious authentication patterns
3. **Create alerting rules** for critical security events
4. **Set up dashboards** for real-time monitoring

---

## Tasks Breakdown

### Task 1: Sentry Integration (2 hours)

**1.1 Install Sentry SDK**
```bash
npm install @sentry/node @sentry/profiling-node
```

**1.2 Create Sentry Configuration**
- File: `lib/monitoring/sentry.js`
- Features:
  - Error tracking
  - Performance monitoring
  - Custom context (user, request)
  - Environment-specific configuration
  - Release tracking

**1.3 Integrate into Auth Service**
- Initialize Sentry in `server-auth.js`
- Add error boundary middleware
- Capture security events
- Track authentication performance

**1.4 Configure Source Maps**
- Enable source maps for error tracking
- Configure release versioning
- Set up deployment tracking

### Task 2: Anomaly Detection Rules (1.5 hours)

**2.1 Create Anomaly Detector**
- File: `lib/security/anomalyDetector.js`
- Detection rules:
  - Failed login threshold (5 attempts in 5 minutes)
  - Multiple device logins (3+ devices in 1 hour)
  - Geographic anomalies (IP country changes)
  - Rapid token refresh (10+ refreshes in 10 minutes)
  - Suspicious user agents (bots, scanners)

**2.2 Implement Rate Tracking**
- Use Redis for rate counting
- Sliding window algorithm
- Automatic cleanup of old data

**2.3 Create Alert System**
- Email alerts for critical events
- Sentry notifications
- Security event logging
- Admin dashboard alerts

### Task 3: Enhanced Security Events (1 hour)

**3.1 Add New Event Types**
- `suspicious_activity_detected`
- `brute_force_detected`
- `account_takeover_attempt`
- `geographic_anomaly`
- `bot_activity_detected`

**3.2 Enrich Event Metadata**
- Geographic location (IP lookup)
- Device type detection
- Browser fingerprinting
- Risk scoring

**3.3 Integrate with SecurityLogger**
- Auto-log anomalies
- Severity escalation
- Correlation IDs for tracking

### Task 4: Sentry Dashboards & Alerts (0.5 hours)

**4.1 Configure Sentry Alerts**
- High error rate (>10 errors/minute)
- Authentication failures spike
- Server errors (500s)
- Performance degradation

**4.2 Create Custom Metrics**
- Authentication success rate
- Token refresh rate
- Average login time
- Failed login distribution

**4.3 Set Up Integrations**
- Email notifications
- Slack integration (optional)
- PagerDuty for critical alerts (optional)

---

## Implementation Details

### Sentry Configuration Structure

```javascript
// lib/monitoring/sentry.js
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

function initSentry(app) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: `fluxstudio-auth@${process.env.npm_package_version}`,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app })
    ],
    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.data) {
          delete event.request.data.password;
        }
      }
      return event;
    }
  });
}
```

### Anomaly Detection Algorithm

```javascript
// lib/security/anomalyDetector.js
class AnomalyDetector {
  async checkFailedLoginRate(email, ipAddress) {
    const key = `failed_login:${email}:${ipAddress}`;
    const count = await redis.incr(key);
    await redis.expire(key, 300); // 5 minutes

    if (count >= 5) {
      await this.reportAnomaly({
        type: 'brute_force_detected',
        severity: 'high',
        email,
        ipAddress,
        count
      });
      return true;
    }
    return false;
  }

  async checkMultipleDevices(userId) {
    const sessions = await getUserActiveSessions(userId);
    const uniqueFingerprints = new Set(
      sessions.map(s => s.device_fingerprint)
    );

    if (uniqueFingerprints.size >= 3) {
      await this.reportAnomaly({
        type: 'multiple_device_login',
        severity: 'warning',
        userId,
        deviceCount: uniqueFingerprints.size
      });
      return true;
    }
    return false;
  }
}
```

### Integration Points

**Server-auth.js - Login Endpoint**
```javascript
app.post('/api/auth/login', async (req, res) => {
  try {
    // ... existing login logic ...

    // Check for anomalies
    const isAnomaly = await anomalyDetector.checkFailedLoginRate(
      email,
      req.ip
    );

    if (isAnomaly) {
      // Rate limit or block
      return res.status(429).json({
        message: 'Too many failed attempts. Please try again later.'
      });
    }

    // ... rest of login ...
  } catch (error) {
    Sentry.captureException(error, {
      user: { email },
      tags: { endpoint: 'login' }
    });
    res.status(500).json({ message: 'Server error' });
  }
});
```

---

## Testing Strategy

### Unit Tests
- Test each anomaly detection rule
- Test Sentry error capture
- Test alert triggering

### Integration Tests
- Simulate brute force attacks
- Test multi-device detection
- Verify Sentry integration

### Load Tests
- Test anomaly detection under load
- Verify Redis performance
- Check Sentry overhead

---

## Deployment Plan

### 1. Development Testing
```bash
# Install dependencies
npm install @sentry/node @sentry/profiling-node

# Run tests
npm test

# Start local server with Sentry
SENTRY_DSN=your_dsn node server-auth.js
```

### 2. Staging Deployment
```bash
# Deploy files
scp lib/monitoring/sentry.js root@167.172.208.61:/var/www/fluxstudio/lib/monitoring/
scp lib/security/anomalyDetector.js root@167.172.208.61:/var/www/fluxstudio/lib/security/

# Update environment
ssh root@167.172.208.61 "echo 'SENTRY_DSN=your_dsn' >> /var/www/fluxstudio/.env"

# Restart service
ssh root@167.172.208.61 "pm2 restart flux-auth"
```

### 3. Verification
```bash
# Trigger test error
curl -X POST https://fluxstudio.art/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Check Sentry dashboard for events
```

---

## Success Metrics

### Sentry Integration
- ✅ All errors captured in Sentry
- ✅ Performance metrics visible
- ✅ User context attached to events
- ✅ Source maps working correctly

### Anomaly Detection
- ✅ Failed login threshold working
- ✅ Multiple device detection active
- ✅ Alerts triggering correctly
- ✅ False positive rate < 5%

### Performance
- ✅ No latency increase (< 10ms overhead)
- ✅ Redis operations < 5ms
- ✅ Sentry async (non-blocking)

---

## Rollback Plan

If issues arise:

```bash
# Disable Sentry
ssh root@167.172.208.61
sed -i 's/SENTRY_DSN=/#SENTRY_DSN=/' /var/www/fluxstudio/.env
pm2 restart flux-auth

# Revert anomaly detection
git checkout HEAD~1 lib/security/anomalyDetector.js
pm2 restart flux-auth
```

---

## Timeline

- **Hour 1-2:** Sentry integration and testing
- **Hour 2-3:** Anomaly detector implementation
- **Hour 3-4:** Integration and testing
- **Hour 4:** Deployment and verification

**Total:** 4 hours

---

## Dependencies

### Required
- ✅ Redis (already running)
- ✅ SecurityLogger (Day 1)
- 🔄 Sentry account (need to create)
- 🔄 Sentry DSN (need to generate)

### Optional
- Email service (for alerts)
- Slack webhook (for notifications)
- IP geolocation service (for geographic anomalies)

---

## Next Steps After Completion

**Day 3:** Token Cleanup & Redis Rate Limiter
- Automated token cleanup cron job
- Enhanced Redis rate limiting
- IP-based blocking rules

---

**Ready to begin:** Let's start with Sentry integration!
