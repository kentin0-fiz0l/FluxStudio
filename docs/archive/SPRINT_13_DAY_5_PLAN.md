# Sprint 13, Day 5: Security Dashboard & Admin Endpoints

**Date:** 2025-10-17 (Planned)
**Status:** 📋 Ready to Begin
**Prerequisites:** ✅ Day 1, 2, 3, 4 Complete and Deployed

---

## Objectives

1. **Admin Authentication** - Secure admin-only endpoints
2. **Blocked IPs Management API** - View, unblock, whitelist IPs
3. **Token Statistics API** - Token usage and lifecycle stats
4. **Anomaly Timeline API** - Historical security events
5. **IP Reputation Management** - Manual reputation adjustments
6. **Manual Cleanup Endpoint** - Trigger cleanup on demand
7. **Performance Metrics API** - Integrate Day 4 monitoring
8. **Production Deployment** - Deploy and test all endpoints

---

## Task Breakdown

### Task 1: Admin Authentication Middleware (1 hour)

**1.1 Create Admin Auth Middleware**
- File: `lib/middleware/adminAuth.js`
- Verify JWT token
- Check admin role/permissions
- Rate limit admin endpoints (stricter than regular)
- Log all admin actions

**Features:**
```javascript
const adminAuth = async (req, res, next) => {
  // Verify JWT token
  // Check user.role === 'admin'
  // Log admin action
  // Apply strict rate limiting (10 req/min)
};
```

**Admin Roles:**
- `admin` - Full access to all endpoints
- `moderator` - Read-only access to security data
- `analyst` - Access to metrics and analytics only

### Task 2: Blocked IPs Management API (1.5 hours)

**2.1 List Blocked IPs**
- Endpoint: `GET /api/admin/security/blocked-ips`
- Return paginated list of blocked IPs
- Include: IP, score, ban reason, ban date, expiry
- Support filtering by score range, ban reason
- Support sorting by date, score

**Response:**
```javascript
{
  "ips": [
    {
      "ip": "1.2.3.4",
      "score": 15,
      "level": "banned",
      "banReason": "brute_force_detected",
      "bannedAt": "2025-10-17T10:30:00Z",
      "expiresAt": "2025-10-24T10:30:00Z",
      "requestCount": 523,
      "lastSeen": "2025-10-17T10:29:45Z"
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 127,
    "totalPages": 3
  }
}
```

**2.2 Get IP Details**
- Endpoint: `GET /api/admin/security/blocked-ips/:ip`
- Return detailed IP information
- Include: Full history, all events, reputation changes

**2.3 Unblock IP**
- Endpoint: `POST /api/admin/security/blocked-ips/:ip/unblock`
- Remove IP from blocked list
- Reset reputation to neutral (50)
- Log admin action
- Optional: Include unblock reason

**2.4 Whitelist IP**
- Endpoint: `POST /api/admin/security/blocked-ips/:ip/whitelist`
- Set reputation to trusted (100)
- Bypass all rate limits
- Never auto-ban
- Log admin action

**2.5 Block IP Manually**
- Endpoint: `POST /api/admin/security/blocked-ips/:ip/block`
- Manually ban IP
- Set reputation to 0
- Include block reason
- Optional: Set expiry duration

### Task 3: Token Statistics API (1 hour)

**3.1 Token Overview**
- Endpoint: `GET /api/admin/tokens/stats`
- Return aggregate token statistics

**Response:**
```javascript
{
  "overview": {
    "total": 1523,
    "active": 843,
    "expired": 432,
    "revoked": 248
  },
  "byType": {
    "access": { total: 1523, active: 843 },
    "refresh": { total: 1523, active: 843 }
  },
  "recentActivity": {
    "last24Hours": {
      "created": 234,
      "revoked": 45,
      "expired": 67
    },
    "last7Days": {
      "created": 1643,
      "revoked": 312,
      "expired": 478
    }
  },
  "topUsers": [
    {
      "userId": "user123",
      "email": "user@example.com",
      "activeTokens": 12,
      "totalTokens": 45
    }
  ]
}
```

**3.2 Token Search**
- Endpoint: `GET /api/admin/tokens/search`
- Search tokens by user, IP, date range
- Support filtering by status (active/expired/revoked)
- Paginated results

**3.3 Revoke Token**
- Endpoint: `POST /api/admin/tokens/:tokenId/revoke`
- Manually revoke token
- Log admin action
- Include revoke reason
- Optionally revoke all user tokens

**3.4 Token Lifecycle**
- Endpoint: `GET /api/admin/tokens/:tokenId`
- Get full token history
- Include: Creation, usage, revocation, expiry
- Show IP addresses used
- Show device information

### Task 4: Anomaly Timeline API (1.5 hours)

**4.1 List Security Events**
- Endpoint: `GET /api/admin/security/events`
- Return paginated security events
- Support filtering by: type, severity, user, IP, date range
- Support sorting by: date, severity

**Response:**
```javascript
{
  "events": [
    {
      "id": "evt_123",
      "type": "brute_force_detected",
      "severity": "high",
      "timestamp": "2025-10-17T10:30:00Z",
      "userId": "user123",
      "email": "user@example.com",
      "ipAddress": "1.2.3.4",
      "userAgent": "Mozilla/5.0...",
      "details": {
        "failedAttempts": 6,
        "timeWindow": 60,
        "endpoint": "/api/auth/login"
      },
      "resolution": {
        "ipBanned": true,
        "emailSent": true,
        "reputationAdjustment": -50
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 2341,
    "totalPages": 47
  },
  "summary": {
    "totalEvents": 2341,
    "bySeverity": {
      "critical": 23,
      "high": 145,
      "medium": 876,
      "low": 1297
    },
    "byType": {
      "brute_force_detected": 89,
      "rapid_token_refresh": 234,
      "bot_activity_detected": 567
    }
  }
}
```

**4.2 Get Event Details**
- Endpoint: `GET /api/admin/security/events/:eventId`
- Return full event details
- Include related events (same IP, same user)
- Show resolution actions taken

**4.3 Event Statistics**
- Endpoint: `GET /api/admin/security/events/stats`
- Time series data for charting
- Aggregated by hour, day, week
- Breakdown by type and severity

**4.4 Export Events**
- Endpoint: `GET /api/admin/security/events/export`
- Export events as CSV or JSON
- Support date range filtering
- Useful for compliance audits

### Task 5: IP Reputation Management API (1 hour)

**5.1 List IP Reputations**
- Endpoint: `GET /api/admin/security/ip-reputation`
- Return paginated IP reputation list
- Support filtering by score range, level
- Include request counts and last seen

**Response:**
```javascript
{
  "ips": [
    {
      "ip": "1.2.3.4",
      "score": 35,
      "level": "suspicious",
      "requestCount": 234,
      "lastSeen": "2025-10-17T10:30:00Z",
      "history": [
        {
          "timestamp": "2025-10-17T09:00:00Z",
          "event": "failed_login",
          "adjustment": -10,
          "newScore": 35
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

**5.2 Get IP Reputation Details**
- Endpoint: `GET /api/admin/security/ip-reputation/:ip`
- Full reputation history
- All events affecting score
- Current rate limit multiplier

**5.3 Adjust IP Reputation**
- Endpoint: `POST /api/admin/security/ip-reputation/:ip/adjust`
- Manually adjust reputation score
- Body: `{ "adjustment": -20, "reason": "Manual review" }`
- Log admin action
- Send email alert if crosses threshold

**5.4 Reset IP Reputation**
- Endpoint: `POST /api/admin/security/ip-reputation/:ip/reset`
- Reset reputation to neutral (50)
- Clear reputation history
- Log admin action

### Task 6: Manual Cleanup Endpoint (0.5 hours)

**6.1 Trigger Manual Cleanup**
- Endpoint: `POST /api/admin/maintenance/cleanup`
- Trigger token cleanup service
- Return cleanup statistics

**Request:**
```javascript
{
  "types": ["expired_tokens", "revoked_tokens", "orphaned_sessions", "old_events"],
  "dryRun": false
}
```

**Response:**
```javascript
{
  "status": "completed",
  "duration": 2345,
  "results": {
    "expiredTokens": 45,
    "revokedTokens": 12,
    "orphanedSessions": 8,
    "archivedEvents": 234
  },
  "timestamp": "2025-10-17T10:30:00Z"
}
```

**6.2 Cleanup Status**
- Endpoint: `GET /api/admin/maintenance/cleanup/status`
- Return last cleanup run stats
- Show next scheduled cleanup time

**6.3 Schedule Cleanup**
- Endpoint: `POST /api/admin/maintenance/cleanup/schedule`
- Configure cleanup schedule
- Body: `{ "interval": "daily", "time": "03:00" }`

### Task 7: Performance Metrics API (1 hour)

**7.1 Current Metrics**
- Endpoint: `GET /api/admin/performance/metrics`
- Return last 60 minutes of metrics
- Include request latency, Redis ops, system resources

**Response:**
```javascript
{
  "current": {
    "timestamp": "2025-10-17T10:30:00Z",
    "requests": { total: 1234, successful: 1200, failed: 34 },
    "latency": { mean: 45, p50: 40, p95: 95, p99: 150 },
    "redis": { operations: 5678, latency: 2.5 },
    "system": { memory: 94, cpu: 12, uptime: 86400 }
  },
  "history": [
    // Last 60 minutes of aggregated metrics
  ],
  "alerts": [
    {
      "type": "high_latency",
      "severity": "warning",
      "message": "P99 latency 1050ms exceeds threshold 1000ms",
      "timestamp": "2025-10-17T10:25:00Z"
    }
  ]
}
```

**7.2 Performance Summary**
- Endpoint: `GET /api/admin/performance/summary`
- Aggregated statistics
- Compare current vs previous periods
- Identify performance trends

**7.3 Endpoint Performance**
- Endpoint: `GET /api/admin/performance/endpoints`
- Per-endpoint performance breakdown
- Identify slow endpoints
- Request volume by endpoint

### Task 8: Admin Dashboard Health Check (0.5 hours)

**8.1 System Health**
- Endpoint: `GET /api/admin/health`
- Overall system health status
- Component status (Redis, DB, file system)
- Service uptime and restart count

**Response:**
```javascript
{
  "status": "healthy",
  "timestamp": "2025-10-17T10:30:00Z",
  "components": {
    "redis": { status: "healthy", latency: 2, uptime: 86400 },
    "database": { status: "healthy", latency: 15, connections: 5 },
    "fileSystem": { status: "healthy", usage: 45 }
  },
  "services": {
    "flux-auth": { status: "online", uptime: 86400, memory: 85, cpu: 0, restarts: 0 },
    "flux-messaging": { status: "online", uptime: 86400, memory: 45, cpu: 0, restarts: 0 },
    "flux-collaboration": { status: "online", uptime: 86400, memory: 29, cpu: 0, restarts: 0 }
  }
}
```

---

## Implementation Details

### Admin Authentication Middleware

```javascript
// lib/middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const securityLogger = require('../logging/securityLogger');
const advancedRateLimiter = require('./advancedRateLimiter');

const ADMIN_ROLES = ['admin', 'moderator', 'analyst'];

const adminAuth = async (req, res, next) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check admin role
    if (!ADMIN_ROLES.includes(decoded.role)) {
      await securityLogger.logEvent('unauthorized_admin_access', 'HIGH', {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role,
        endpoint: req.path,
        ipAddress: req.ip
      });

      return res.status(403).json({ message: 'Admin access required' });
    }

    // Apply strict rate limiting for admin endpoints
    const rateLimiter = new advancedRateLimiter();
    const result = await rateLimiter.checkLimit(
      `admin:${decoded.id}:${req.path}`,
      10,  // 10 requests
      60   // per minute
    );

    if (!result.allowed) {
      return res.status(429).json({ message: 'Too many admin requests' });
    }

    // Log admin action
    await securityLogger.logEvent('admin_action', 'INFO', {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      action: `${req.method} ${req.path}`,
      ipAddress: req.ip
    });

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({ message: 'Invalid authentication' });
  }
};

module.exports = adminAuth;
```

### Blocked IPs Management

```javascript
// lib/api/admin/blockedIps.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const ipReputation = require('../../security/ipReputation');
const securityLogger = require('../../logging/securityLogger');
const cache = require('../../cache');

// List blocked IPs
router.get('/blocked-ips', adminAuth, async (req, res) => {
  try {
    const { page = 1, perPage = 50, minScore, maxScore, banReason } = req.query;

    // Get all IPs with reputation data
    const allIps = await ipReputation.getAllIPs();

    // Filter blocked IPs (score < 20)
    let blockedIps = allIps.filter(ip => ip.score < 20);

    // Apply filters
    if (minScore) blockedIps = blockedIps.filter(ip => ip.score >= minScore);
    if (maxScore) blockedIps = blockedIps.filter(ip => ip.score <= maxScore);
    if (banReason) blockedIps = blockedIps.filter(ip => ip.banReason === banReason);

    // Paginate
    const total = blockedIps.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginatedIps = blockedIps.slice(start, start + perPage);

    res.json({
      ips: paginatedIps,
      pagination: { page, perPage, total, totalPages }
    });
  } catch (error) {
    console.error('Error listing blocked IPs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get IP details
router.get('/blocked-ips/:ip', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;
    const details = await ipReputation.getIPDetails(ip);

    if (!details) {
      return res.status(404).json({ message: 'IP not found' });
    }

    res.json(details);
  } catch (error) {
    console.error('Error getting IP details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Unblock IP
router.post('/blocked-ips/:ip/unblock', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;
    const { reason } = req.body;

    // Reset reputation to neutral
    await ipReputation.setScore(ip, 50);

    // Log admin action
    await securityLogger.logEvent('ip_unblocked', 'INFO', {
      ipAddress: ip,
      adminId: req.user.id,
      adminEmail: req.user.email,
      reason: reason || 'Manual unblock',
      newScore: 50
    });

    res.json({
      success: true,
      ip,
      newScore: 50,
      message: 'IP unblocked successfully'
    });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Whitelist IP
router.post('/blocked-ips/:ip/whitelist', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;
    const { reason } = req.body;

    // Set reputation to trusted
    await ipReputation.setScore(ip, 100);
    await cache.set(`ip_whitelisted:${ip}`, 'true', 365 * 24 * 3600); // 1 year

    // Log admin action
    await securityLogger.logEvent('ip_whitelisted', 'INFO', {
      ipAddress: ip,
      adminId: req.user.id,
      adminEmail: req.user.email,
      reason: reason || 'Manual whitelist',
      newScore: 100
    });

    res.json({
      success: true,
      ip,
      newScore: 100,
      message: 'IP whitelisted successfully'
    });
  } catch (error) {
    console.error('Error whitelisting IP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Block IP manually
router.post('/blocked-ips/:ip/block', adminAuth, async (req, res) => {
  try {
    const { ip } = req.params;
    const { reason, duration } = req.body;

    // Set reputation to banned
    await ipReputation.setScore(ip, 0);

    // Set expiry if duration provided
    if (duration) {
      await cache.set(`ip_ban_expires:${ip}`, Date.now() + duration, duration);
    }

    // Log admin action
    await securityLogger.logEvent('ip_blocked_manually', 'HIGH', {
      ipAddress: ip,
      adminId: req.user.id,
      adminEmail: req.user.email,
      reason: reason || 'Manual block',
      duration: duration || 'permanent'
    });

    res.json({
      success: true,
      ip,
      newScore: 0,
      message: 'IP blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
```

### Token Statistics API

```javascript
// lib/api/admin/tokens.js
const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');
const fs = require('fs').promises;
const path = require('path');

const TOKENS_FILE = path.join(__dirname, '../../../refresh_tokens.json');

// Token overview statistics
router.get('/tokens/stats', adminAuth, async (req, res) => {
  try {
    const tokensData = await fs.readFile(TOKENS_FILE, 'utf8');
    const tokens = JSON.parse(tokensData);

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Calculate statistics
    const stats = {
      overview: {
        total: tokens.length,
        active: tokens.filter(t => new Date(t.expiresAt).getTime() > now && !t.revoked).length,
        expired: tokens.filter(t => new Date(t.expiresAt).getTime() <= now).length,
        revoked: tokens.filter(t => t.revoked).length
      },
      recentActivity: {
        last24Hours: {
          created: tokens.filter(t => new Date(t.createdAt).getTime() > oneDayAgo).length,
          revoked: tokens.filter(t => t.revoked && new Date(t.revokedAt).getTime() > oneDayAgo).length,
          expired: tokens.filter(t => {
            const exp = new Date(t.expiresAt).getTime();
            return exp <= now && exp > oneDayAgo;
          }).length
        },
        last7Days: {
          created: tokens.filter(t => new Date(t.createdAt).getTime() > sevenDaysAgo).length,
          revoked: tokens.filter(t => t.revoked && new Date(t.revokedAt).getTime() > sevenDaysAgo).length,
          expired: tokens.filter(t => {
            const exp = new Date(t.expiresAt).getTime();
            return exp <= now && exp > sevenDaysAgo;
          }).length
        }
      },
      topUsers: getTopUsers(tokens)
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting token stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper: Get top users by token count
function getTopUsers(tokens) {
  const userTokens = {};

  tokens.forEach(token => {
    const userId = token.userId;
    if (!userTokens[userId]) {
      userTokens[userId] = {
        userId,
        email: token.email || 'unknown',
        activeTokens: 0,
        totalTokens: 0
      };
    }

    userTokens[userId].totalTokens++;

    const isActive = new Date(token.expiresAt).getTime() > Date.now() && !token.revoked;
    if (isActive) {
      userTokens[userId].activeTokens++;
    }
  });

  return Object.values(userTokens)
    .sort((a, b) => b.activeTokens - a.activeTokens)
    .slice(0, 10);
}

// Revoke token manually
router.post('/tokens/:tokenId/revoke', adminAuth, async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { reason } = req.body;

    const tokensData = await fs.readFile(TOKENS_FILE, 'utf8');
    const tokens = JSON.parse(tokensData);

    const tokenIndex = tokens.findIndex(t => t.token === tokenId || t.id === tokenId);

    if (tokenIndex === -1) {
      return res.status(404).json({ message: 'Token not found' });
    }

    tokens[tokenIndex].revoked = true;
    tokens[tokenIndex].revokedAt = new Date().toISOString();
    tokens[tokenIndex].revokedBy = req.user.id;
    tokens[tokenIndex].revocationReason = reason || 'Manual admin revocation';

    await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));

    res.json({
      success: true,
      message: 'Token revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
```

---

## Testing Strategy

### Manual Testing Checklist

**Admin Authentication:**
- ✅ Non-admin users blocked from admin endpoints
- ✅ Invalid tokens rejected
- ✅ Admin actions logged
- ✅ Rate limiting enforced

**Blocked IPs API:**
- ✅ List returns paginated blocked IPs
- ✅ Filtering works correctly
- ✅ Unblock sets score to 50
- ✅ Whitelist sets score to 100
- ✅ Manual block sets score to 0
- ✅ All actions logged

**Token Statistics:**
- ✅ Stats calculations accurate
- ✅ Top users sorted correctly
- ✅ Token revocation works
- ✅ Recent activity accurate

**Anomaly Timeline:**
- ✅ Events paginated correctly
- ✅ Filtering by type/severity works
- ✅ Export functionality works
- ✅ Stats aggregation accurate

**Performance Metrics:**
- ✅ Current metrics accurate
- ✅ Historical data persisted
- ✅ Alerts triggered correctly
- ✅ Per-endpoint breakdown works

### Automated Testing

```javascript
// tests/admin/admin-endpoints.test.js
describe('Admin Endpoints', () => {
  describe('Authentication', () => {
    it('should reject non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/security/blocked-ips')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow admin users', async () => {
      const res = await request(app)
        .get('/api/admin/security/blocked-ips')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Blocked IPs', () => {
    it('should list blocked IPs', async () => {
      const res = await request(app)
        .get('/api/admin/security/blocked-ips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ips');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should unblock IP', async () => {
      const res = await request(app)
        .post('/api/admin/security/blocked-ips/1.2.3.4/unblock')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test unblock' });

      expect(res.status).toBe(200);
      expect(res.body.newScore).toBe(50);
    });
  });
});
```

---

## Deployment Checklist

### Prerequisites
- ✅ Day 1-4 deployed
- ✅ Admin users configured
- ✅ Email configured (for alerts)

### Deployment Steps

**1. Deploy admin middleware**
```bash
scp lib/middleware/adminAuth.js root@167.172.208.61:/var/www/fluxstudio/lib/middleware/
```

**2. Deploy admin API modules**
```bash
scp lib/api/admin/blockedIps.js root@167.172.208.61:/var/www/fluxstudio/lib/api/admin/
scp lib/api/admin/tokens.js root@167.172.208.61:/var/www/fluxstudio/lib/api/admin/
scp lib/api/admin/security.js root@167.172.208.61:/var/www/fluxstudio/lib/api/admin/
scp lib/api/admin/performance.js root@167.172.208.61:/var/www/fluxstudio/lib/api/admin/
```

**3. Update server-auth.js to include admin routes**
```javascript
// Add to server-auth.js
const adminBlockedIps = require('./lib/api/admin/blockedIps');
const adminTokens = require('./lib/api/admin/tokens');
const adminSecurity = require('./lib/api/admin/security');
const adminPerformance = require('./lib/api/admin/performance');

app.use('/api/admin/security', adminBlockedIps);
app.use('/api/admin', adminTokens);
app.use('/api/admin/security', adminSecurity);
app.use('/api/admin/performance', adminPerformance);
```

**4. Restart service**
```bash
pm2 restart flux-auth
```

**5. Verify endpoints**
```bash
# Test admin authentication
curl -X GET https://fluxstudio.art/api/admin/health \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test blocked IPs
curl -X GET https://fluxstudio.art/api/admin/security/blocked-ips \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Test token stats
curl -X GET https://fluxstudio.art/api/admin/tokens/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Success Metrics

### Day 5 Completion Criteria
- ✅ Admin authentication middleware implemented
- ✅ All 7 API endpoint groups implemented
- ✅ Manual testing completed
- ✅ Production deployment successful
- ✅ Service running stably
- ✅ Admin endpoints accessible
- ✅ All actions logged

### Security Metrics
- Admin actions logged: 100%
- Unauthorized admin access blocked: 100%
- IP reputation adjustments working: Yes
- Token revocations working: Yes

---

## Timeline

- **Hour 1:** Admin authentication middleware
- **Hour 2-3.5:** Blocked IPs management API
- **Hour 3.5-4.5:** Token statistics API
- **Hour 4.5-6:** Anomaly timeline API
- **Hour 6-7:** IP reputation management
- **Hour 7-7.5:** Manual cleanup endpoint
- **Hour 7.5-8.5:** Performance metrics API
- **Hour 8.5-9:** Testing and deployment

**Total:** 9 hours

---

## Next Steps (Sprint 13 Day 6-7)

**Day 6: Frontend Dashboard**
- Admin dashboard UI
- Real-time metrics charts
- Security event visualization
- IP management interface

**Day 7: Final Testing & Documentation**
- End-to-end testing
- Load testing with admin endpoints
- Complete API documentation
- User guide for admins

---

**Ready to begin:** Starting implementation now
