# Sprint 13, Day 4: Performance Testing & Optimization

**Date:** 2025-10-16 (Planned)
**Status:** 📋 Ready to Begin
**Prerequisites:** ✅ Day 1, 2, 3 Complete and Deployed

---

## Objectives

1. **Performance Benchmarking** - Measure overhead of Day 1-3 features
2. **Load Testing** - Test system under realistic and extreme loads
3. **Redis Optimization** - Optimize query patterns and connection pooling
4. **Performance Monitoring** - Real-time metrics dashboard
5. **Scaling Recommendations** - Identify bottlenecks and scaling strategies
6. **Production Optimization** - Deploy performance improvements

---

## Task Breakdown

### Task 1: Performance Benchmarking (1 hour)

**1.1 Create Benchmark Suite**
- File: `tests/performance/benchmark.js`
- Benchmark targets:
  - Security logging overhead
  - Anomaly detection overhead
  - Rate limiting overhead
  - IP reputation lookup overhead
  - Email alert processing overhead
  - Combined request overhead

**1.2 Baseline Measurements**
- Request latency without security features
- Request latency with Day 1 features only
- Request latency with Day 1+2 features
- Request latency with Day 1+2+3 features
- Redis operation latency
- Memory usage progression

**1.3 Benchmark Metrics**
```javascript
const benchmarks = {
  requestLatency: {
    baseline: 'X ms',
    withDay1: 'X ms',
    withDay2: 'X ms',
    withDay3: 'X ms',
    overhead: 'X ms total'
  },
  redisOperations: {
    get: 'X ms',
    set: 'X ms',
    del: 'X ms',
    multi: 'X ms'
  },
  memoryUsage: {
    baseline: 'X MB',
    current: 'X MB',
    increase: 'X%'
  }
};
```

### Task 2: Load Testing (2 hours)

**2.1 Setup Load Testing Tool**
- Install k6 or Apache Bench
- Create test scenarios
- Configure realistic traffic patterns

**2.2 Test Scenarios**

**Scenario 1: Normal Load**
- 100 concurrent users
- 1,000 requests/minute
- Mix of auth, API, and file operations
- Duration: 10 minutes

**Scenario 2: Peak Load**
- 500 concurrent users
- 5,000 requests/minute
- Same operation mix
- Duration: 5 minutes

**Scenario 3: Brute Force Attack**
- 50 attackers
- 10 requests/second per attacker
- All failed login attempts
- Test anomaly detection + IP banning
- Duration: 2 minutes

**Scenario 4: Bot Attack**
- 100 bots
- Rapid requests (50/min per bot)
- Test rate limiting + reputation
- Duration: 2 minutes

**2.3 Metrics to Collect**
```javascript
const metrics = {
  throughput: 'requests/second',
  responseTime: {
    min: 'X ms',
    max: 'X ms',
    mean: 'X ms',
    p50: 'X ms',
    p95: 'X ms',
    p99: 'X ms'
  },
  errorRate: 'X%',
  redisLatency: 'X ms',
  cpuUsage: 'X%',
  memoryUsage: 'X MB',
  activeConnections: 'X'
};
```

### Task 3: Redis Optimization (1.5 hours)

**3.1 Connection Pooling**
- Implement Redis connection pool
- Configure optimal pool size
- Add connection health checks
- Implement automatic reconnection

**3.2 Query Optimization**
- Batch multiple GET operations with MGET
- Use pipelines for multiple operations
- Optimize sliding window queries
- Add Redis compression for large values

**3.3 Caching Strategy**
- Implement request-level caching
- Cache frequently accessed data
- Add cache warming for critical data
- Implement intelligent cache invalidation

**Example Optimization:**
```javascript
// Before: Multiple separate Redis calls
const score = await cache.get(`ip_reputation:${ip}`);
const blocked = await cache.get(`blocked_ip:${ip}`);
const rateLimit = await cache.get(`ratelimit:${ip}:${endpoint}`);

// After: Single pipeline
const pipeline = redis.pipeline();
pipeline.get(`ip_reputation:${ip}`);
pipeline.get(`blocked_ip:${ip}`);
pipeline.get(`ratelimit:${ip}:${endpoint}`);
const results = await pipeline.exec();
```

### Task 4: Performance Monitoring Dashboard (2 hours)

**4.1 Create Performance Metrics Collector**
- File: `lib/monitoring/performanceMetrics.js`
- Track request latency
- Track Redis operation latency
- Track memory usage
- Track CPU usage
- Track active connections

**4.2 Create Real-time Dashboard Endpoint**
- Endpoint: `GET /api/admin/performance/metrics`
- Return last 1 hour of metrics
- Aggregated by 1-minute intervals
- Include percentiles (p50, p95, p99)

**4.3 Add Performance Alerts**
- Alert if p99 latency > 1 second
- Alert if error rate > 1%
- Alert if memory > 500 MB
- Alert if CPU > 80%
- Alert if Redis latency > 50ms

**Metrics Structure:**
```javascript
{
  timestamp: '2025-10-16T12:00:00Z',
  requests: {
    total: 1234,
    successful: 1200,
    failed: 34,
    errorRate: 2.76
  },
  latency: {
    mean: 45,
    p50: 40,
    p95: 95,
    p99: 150
  },
  redis: {
    operations: 5678,
    latency: 2.5,
    errors: 0
  },
  system: {
    memory: 94,
    cpu: 12,
    activeConnections: 45
  }
}
```

### Task 5: Database Query Optimization (1 hour)

**5.1 Analyze Slow Queries**
- Enable query logging
- Identify N+1 queries
- Find missing indexes
- Optimize JOIN operations

**5.2 Add Indexes**
```sql
-- Security events
CREATE INDEX idx_security_events_timestamp ON security_events(timestamp DESC);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_severity ON security_events(severity);

-- Sessions
CREATE INDEX idx_sessions_last_used ON user_sessions(last_used_at DESC);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);

-- Tokens
CREATE INDEX idx_tokens_expires_at ON refresh_tokens(expires_at DESC);
CREATE INDEX idx_tokens_revoked ON refresh_tokens(revoked, revoked_at);
```

**5.3 Query Optimization**
- Add LIMIT clauses to prevent large result sets
- Use SELECT specific columns instead of SELECT *
- Implement pagination for large datasets
- Add query result caching

### Task 6: Memory Optimization (1 hour)

**6.1 Identify Memory Leaks**
- Profile memory usage over time
- Check for event listener leaks
- Monitor Redis connection pool
- Check for unclosed file handles

**6.2 Optimize Data Structures**
- Use WeakMap for temporary data
- Implement LRU cache for hot data
- Compress large JSON objects in Redis
- Stream large file operations

**6.3 Garbage Collection Tuning**
```bash
# Node.js GC flags for production
node --max-old-space-size=512 \
     --gc-interval=100 \
     server-auth.js
```

### Task 7: Scaling Recommendations (0.5 hours)

**7.1 Horizontal Scaling Analysis**
- Identify stateless components
- Plan for load balancer setup
- Design session sharing strategy
- Plan for distributed Redis

**7.2 Vertical Scaling Recommendations**
- Optimal CPU cores
- Optimal memory allocation
- Optimal Redis memory
- Optimal connection limits

**7.3 Scaling Thresholds**
```javascript
const scalingThresholds = {
  horizontal: {
    cpu: '> 70% sustained for 5 minutes',
    memory: '> 80% sustained',
    connections: '> 1000 active',
    throughput: '> 10,000 req/min'
  },
  vertical: {
    memory: 'Increase by 256 MB if > 80%',
    cpu: 'Add 1 core if > 80%',
    redis: 'Increase maxmemory if > 80%'
  }
};
```

---

## Implementation Details

### Performance Metrics Collector

```javascript
// lib/monitoring/performanceMetrics.js
const os = require('os');
const cache = require('../cache');

class PerformanceMetrics {
  constructor() {
    this.metrics = [];
    this.currentMinute = {
      requests: [],
      redisOps: [],
      errors: []
    };
  }

  /**
   * Record request latency
   */
  recordRequest(latency, success = true) {
    this.currentMinute.requests.push({
      latency,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Record Redis operation
   */
  recordRedisOp(operation, latency) {
    this.currentMinute.redisOps.push({
      operation,
      latency,
      timestamp: Date.now()
    });
  }

  /**
   * Aggregate metrics every minute
   */
  async aggregateMinute() {
    const minute = {
      timestamp: new Date().toISOString(),
      requests: this.calculateRequestMetrics(),
      redis: this.calculateRedisMetrics(),
      system: await this.getSystemMetrics()
    };

    // Store in Redis (last 1 hour = 60 data points)
    await this.storeMetrics(minute);

    // Reset current minute
    this.currentMinute = { requests: [], redisOps: [], errors: [] };

    return minute;
  }

  calculateRequestMetrics() {
    const requests = this.currentMinute.requests;
    if (requests.length === 0) {
      return { total: 0, successful: 0, failed: 0 };
    }

    const latencies = requests.map(r => r.latency).sort((a, b) => a - b);
    const successful = requests.filter(r => r.success).length;

    return {
      total: requests.length,
      successful,
      failed: requests.length - successful,
      errorRate: ((requests.length - successful) / requests.length) * 100,
      latency: {
        mean: latencies.reduce((a, b) => a + b) / latencies.length,
        p50: latencies[Math.floor(latencies.length * 0.5)],
        p95: latencies[Math.floor(latencies.length * 0.95)],
        p99: latencies[Math.floor(latencies.length * 0.99)]
      }
    };
  }

  async getSystemMetrics() {
    return {
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpu: os.loadavg()[0] * 100 / os.cpus().length,
      uptime: process.uptime()
    };
  }
}

module.exports = new PerformanceMetrics();
```

### Load Testing Script

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '1m', target: 500 },  // Peak load
    { duration: '2m', target: 500 },  // Peak sustained
    { duration: '1m', target: 0 }     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p95<500', 'p99<1000'],
    http_req_failed: ['rate<0.01']
  }
};

export default function() {
  // Login request
  const loginRes = http.post('https://fluxstudio.art/api/auth/login',
    JSON.stringify({
      email: 'test@test.com',
      password: 'testpassword'
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  check(loginRes, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'response time < 500ms': (r) => r.timings.duration < 500
  });

  sleep(1);

  // API request
  const apiRes = http.get('https://fluxstudio.art/api/files');

  check(apiRes, {
    'api response ok': (r) => r.status === 200 || r.status === 401,
    'api response time < 200ms': (r) => r.timings.duration < 200
  });

  sleep(2);
}
```

---

## Testing Strategy

### Phase 1: Baseline Benchmarks (30 min)
1. Measure request latency without security features
2. Enable Day 1 features, measure overhead
3. Enable Day 2 features, measure overhead
4. Enable Day 3 features, measure overhead
5. Document cumulative overhead

### Phase 2: Load Testing (1 hour)
1. Run normal load test (100 users)
2. Run peak load test (500 users)
3. Run attack simulation (brute force + bots)
4. Collect metrics and identify bottlenecks

### Phase 3: Optimization (2 hours)
1. Implement Redis optimizations
2. Add performance monitoring
3. Optimize slow queries
4. Re-run load tests to verify improvements

### Phase 4: Scaling Analysis (30 min)
1. Identify scaling bottlenecks
2. Create scaling recommendations
3. Document infrastructure requirements

---

## Success Metrics

### Performance Targets
- **Request latency p95:** < 200ms
- **Request latency p99:** < 500ms
- **Redis latency:** < 10ms
- **Error rate:** < 0.1%
- **Memory usage:** < 200 MB
- **CPU usage:** < 50% (sustained)

### Load Test Targets
- **Normal load:** 100 req/s sustained for 10 minutes
- **Peak load:** 500 req/s sustained for 5 minutes
- **Attack mitigation:** Block 100% of brute force attacks
- **Zero downtime:** No crashes or restarts during tests

### Optimization Targets
- **Reduce overhead:** < 5% reduction in latency
- **Improve throughput:** > 10% increase in req/s
- **Reduce memory:** < 5% reduction in usage
- **Faster Redis:** < 50% reduction in Redis latency

---

## Deployment Checklist

### Prerequisites
- ✅ Day 1, 2, 3 deployed
- ✅ Redis running
- ⏳ Load testing tool installed

### Deployment Steps

**1. Install load testing tools**
```bash
# Local
brew install k6  # macOS
# or download from https://k6.io

# Production (optional)
ssh root@167.172.208.61
curl -L https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xvz
```

**2. Deploy performance monitoring**
```bash
scp lib/monitoring/performanceMetrics.js root@167.172.208.61:/var/www/fluxstudio/lib/monitoring/
```

**3. Deploy optimizations**
```bash
# Deploy optimized cache module
scp lib/cache.js root@167.172.208.61:/var/www/fluxstudio/lib/

# Deploy optimized anomaly detector
scp lib/security/anomalyDetector.js root@167.172.208.61:/var/www/fluxstudio/lib/security/
```

**4. Restart services**
```bash
pm2 restart flux-auth
```

**5. Run load tests**
```bash
k6 run tests/performance/load-test.js
```

---

## Timeline

- **Hour 1:** Performance benchmarking
- **Hour 2-3:** Load testing
- **Hour 3-4.5:** Redis optimization
- **Hour 4.5-6.5:** Performance monitoring dashboard
- **Hour 6.5-7.5:** Database optimization
- **Hour 7.5-8.5:** Memory optimization
- **Hour 8.5-9:** Scaling recommendations

**Total:** 9 hours

---

## Expected Results

### Baseline Performance (Before Optimization)
```
Request Latency:
  Mean: ~50ms
  p95: ~100ms
  p99: ~200ms

Overhead from Security:
  Day 1 (Logging): +5ms
  Day 2 (Sentry + Anomaly): +15ms
  Day 3 (Rate Limiting + Reputation): +10ms
  Total: +30ms

Throughput: ~200 req/s
Memory: ~100 MB
```

### Target Performance (After Optimization)
```
Request Latency:
  Mean: ~45ms (-10%)
  p95: ~90ms (-10%)
  p99: ~180ms (-10%)

Overhead from Security:
  Total: +25ms (-17%)

Throughput: ~250 req/s (+25%)
Memory: ~95 MB (-5%)
```

---

## Rollback Plan

If performance degrades:

```bash
# Revert optimizations
git checkout HEAD~1 lib/cache.js
git checkout HEAD~1 lib/monitoring/performanceMetrics.js
pm2 restart flux-auth

# Monitor for improvement
pm2 logs flux-auth --lines 50
```

---

**Ready to begin:** Awaiting Day 3 completion verification

