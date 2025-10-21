/**
 * Performance Metrics Collector
 * Sprint 13, Day 4: Performance Testing & Optimization
 *
 * Features:
 * - Request latency tracking
 * - Redis operation monitoring
 * - System resource monitoring (CPU, memory)
 * - Real-time metrics aggregation
 * - Historical data storage (1 hour window)
 * - Performance alert triggers
 *
 * Date: 2025-10-16
 */

const os = require('os');
const cache = require('../cache');

class PerformanceMetrics {
  constructor() {
    // Current minute's raw data
    this.currentMinute = {
      requests: [],
      redisOps: [],
      errors: []
    };

    // Aggregated metrics (last 60 minutes)
    this.history = [];
    this.maxHistorySize = 60; // 1 hour of minute-by-minute data

    // Start aggregation interval
    this.startAggregation();

    // Performance thresholds for alerts
    this.thresholds = {
      latencyP99: 1000,      // 1 second
      errorRate: 1,          // 1%
      memory: 500,           // 500 MB
      cpu: 80,               // 80%
      redisLatency: 50       // 50ms
    };
  }

  /**
   * Record HTTP request metrics
   *
   * @param {number} latency - Request latency in milliseconds
   * @param {boolean} success - Whether request was successful
   * @param {string} endpoint - Request endpoint
   */
  recordRequest(latency, success = true, endpoint = 'unknown') {
    this.currentMinute.requests.push({
      latency,
      success,
      endpoint,
      timestamp: Date.now()
    });
  }

  /**
   * Record Redis operation metrics
   *
   * @param {string} operation - Operation type (get, set, del, etc.)
   * @param {number} latency - Operation latency in milliseconds
   * @param {boolean} success - Whether operation was successful
   */
  recordRedisOp(operation, latency, success = true) {
    this.currentMinute.redisOps.push({
      operation,
      latency,
      success,
      timestamp: Date.now()
    });
  }

  /**
   * Record error
   *
   * @param {string} type - Error type
   * @param {string} message - Error message
   */
  recordError(type, message) {
    this.currentMinute.errors.push({
      type,
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate request metrics from raw data
   *
   * @returns {Object} Aggregated request metrics
   * @private
   */
  calculateRequestMetrics() {
    const requests = this.currentMinute.requests;

    if (requests.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        errorRate: 0,
        latency: {
          mean: 0,
          min: 0,
          max: 0,
          p50: 0,
          p95: 0,
          p99: 0
        },
        byEndpoint: {}
      };
    }

    // Sort latencies for percentile calculation
    const latencies = requests.map(r => r.latency).sort((a, b) => a - b);
    const successful = requests.filter(r => r.success).length;

    // Calculate latency percentiles
    const getPercentile = (arr, p) => {
      const index = Math.ceil((arr.length * p) / 100) - 1;
      return arr[Math.max(0, index)];
    };

    // Group by endpoint
    const byEndpoint = {};
    requests.forEach(r => {
      if (!byEndpoint[r.endpoint]) {
        byEndpoint[r.endpoint] = {
          count: 0,
          latencies: []
        };
      }
      byEndpoint[r.endpoint].count++;
      byEndpoint[r.endpoint].latencies.push(r.latency);
    });

    // Calculate endpoint stats
    Object.keys(byEndpoint).forEach(endpoint => {
      const lats = byEndpoint[endpoint].latencies.sort((a, b) => a - b);
      byEndpoint[endpoint] = {
        count: byEndpoint[endpoint].count,
        mean: lats.reduce((a, b) => a + b) / lats.length,
        p95: getPercentile(lats, 95)
      };
    });

    return {
      total: requests.length,
      successful,
      failed: requests.length - successful,
      errorRate: ((requests.length - successful) / requests.length) * 100,
      latency: {
        mean: latencies.reduce((a, b) => a + b) / latencies.length,
        min: latencies[0],
        max: latencies[latencies.length - 1],
        p50: getPercentile(latencies, 50),
        p95: getPercentile(latencies, 95),
        p99: getPercentile(latencies, 99)
      },
      byEndpoint
    };
  }

  /**
   * Calculate Redis operation metrics
   *
   * @returns {Object} Aggregated Redis metrics
   * @private
   */
  calculateRedisMetrics() {
    const ops = this.currentMinute.redisOps;

    if (ops.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        latency: {
          mean: 0,
          p95: 0,
          p99: 0
        },
        byOperation: {}
      };
    }

    const latencies = ops.map(o => o.latency).sort((a, b) => a - b);
    const successful = ops.filter(o => o.success).length;

    const getPercentile = (arr, p) => {
      const index = Math.ceil((arr.length * p) / 100) - 1;
      return arr[Math.max(0, index)];
    };

    // Group by operation type
    const byOperation = {};
    ops.forEach(o => {
      if (!byOperation[o.operation]) {
        byOperation[o.operation] = { count: 0, latencies: [] };
      }
      byOperation[o.operation].count++;
      byOperation[o.operation].latencies.push(o.latency);
    });

    // Calculate operation stats
    Object.keys(byOperation).forEach(operation => {
      const lats = byOperation[operation].latencies;
      byOperation[operation] = {
        count: byOperation[operation].count,
        mean: lats.reduce((a, b) => a + b) / lats.length
      };
    });

    return {
      total: ops.length,
      successful,
      failed: ops.length - successful,
      latency: {
        mean: latencies.reduce((a, b) => a + b) / latencies.length,
        p95: getPercentile(latencies, 95),
        p99: getPercentile(latencies, 99)
      },
      byOperation
    };
  }

  /**
   * Get current system metrics
   *
   * @returns {Promise<Object>} System metrics
   * @private
   */
  async getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();

    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        loadAvg1m: loadAvg[0],
        loadAvg5m: loadAvg[1],
        loadAvg15m: loadAvg[2],
        usage: Math.round((loadAvg[0] / cpuCount) * 100), // Percentage
        cores: cpuCount
      },
      uptime: Math.round(process.uptime()), // Seconds
      timestamp: Date.now()
    };
  }

  /**
   * Aggregate current minute's data
   *
   * @returns {Promise<Object>} Aggregated metrics
   */
  async aggregateMinute() {
    try {
      const minute = {
        timestamp: new Date().toISOString(),
        requests: this.calculateRequestMetrics(),
        redis: this.calculateRedisMetrics(),
        system: await this.getSystemMetrics(),
        errors: {
          total: this.currentMinute.errors.length,
          byType: {}
        }
      };

      // Group errors by type
      this.currentMinute.errors.forEach(err => {
        minute.errors.byType[err.type] = (minute.errors.byType[err.type] || 0) + 1;
      });

      // Store in memory history
      this.history.push(minute);

      // Keep only last 60 minutes
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }

      // Store in Redis for persistence (optional)
      try {
        await this.storeMetrics(minute);
      } catch (error) {
        console.error('Error storing metrics in Redis:', error);
      }

      // Check thresholds and trigger alerts
      await this.checkThresholds(minute);

      // Reset current minute
      this.currentMinute = {
        requests: [],
        redisOps: [],
        errors: []
      };

      return minute;
    } catch (error) {
      console.error('Error aggregating metrics:', error);
      return null;
    }
  }

  /**
   * Store metrics in Redis
   *
   * @param {Object} minute - Minute's metrics
   * @private
   */
  async storeMetrics(minute) {
    const key = `performance_metrics:${Date.now()}`;
    await cache.set(key, JSON.stringify(minute), 3600); // 1 hour TTL
  }

  /**
   * Check performance thresholds and log alerts
   *
   * @param {Object} minute - Minute's metrics
   * @private
   */
  async checkThresholds(minute) {
    const alerts = [];

    // Check latency p99
    if (minute.requests.latency.p99 > this.thresholds.latencyP99) {
      alerts.push({
        type: 'high_latency',
        severity: 'warning',
        message: `P99 latency ${minute.requests.latency.p99}ms exceeds threshold ${this.thresholds.latencyP99}ms`
      });
    }

    // Check error rate
    if (minute.requests.errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'warning',
        message: `Error rate ${minute.requests.errorRate.toFixed(2)}% exceeds threshold ${this.thresholds.errorRate}%`
      });
    }

    // Check memory
    if (minute.system.memory.heapUsed > this.thresholds.memory) {
      alerts.push({
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage ${minute.system.memory.heapUsed}MB exceeds threshold ${this.thresholds.memory}MB`
      });
    }

    // Check CPU
    if (minute.system.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'high_cpu',
        severity: 'warning',
        message: `CPU usage ${minute.system.cpu.usage}% exceeds threshold ${this.thresholds.cpu}%`
      });
    }

    // Check Redis latency
    if (minute.redis.latency.p99 > this.thresholds.redisLatency) {
      alerts.push({
        type: 'high_redis_latency',
        severity: 'warning',
        message: `Redis P99 latency ${minute.redis.latency.p99}ms exceeds threshold ${this.thresholds.redisLatency}ms`
      });
    }

    // Log alerts
    if (alerts.length > 0) {
      console.warn('🚨 Performance Alerts:', alerts);

      // Optionally send to email alerts
      try {
        const emailAlerts = require('../alerts/emailAlerts');
        for (const alert of alerts) {
          await emailAlerts.sendSecurityAlert('performance_alert', alert);
        }
      } catch (error) {
        // Email alerts not configured, skip
      }
    }
  }

  /**
   * Start minute aggregation interval
   *
   * @private
   */
  startAggregation() {
    // Aggregate every minute
    this.aggregationInterval = setInterval(async () => {
      await this.aggregateMinute();
    }, 60 * 1000); // 60 seconds
  }

  /**
   * Stop aggregation interval
   */
  stopAggregation() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
  }

  /**
   * Get metrics history
   *
   * @param {number} minutes - Number of minutes to retrieve (default: all)
   * @returns {Array} Metrics history
   */
  getHistory(minutes = null) {
    if (minutes === null) {
      return this.history;
    }

    return this.history.slice(-minutes);
  }

  /**
   * Get current (live) metrics
   *
   * @returns {Object} Current metrics snapshot
   */
  getCurrentMetrics() {
    return {
      timestamp: new Date().toISOString(),
      requests: {
        total: this.currentMinute.requests.length,
        errors: this.currentMinute.errors.length
      },
      redis: {
        total: this.currentMinute.redisOps.length
      }
    };
  }

  /**
   * Get summary statistics
   *
   * @returns {Object} Summary of performance metrics
   */
  getSummary() {
    if (this.history.length === 0) {
      return null;
    }

    const totalRequests = this.history.reduce((sum, m) => sum + m.requests.total, 0);
    const totalErrors = this.history.reduce((sum, m) => sum + m.requests.failed, 0);
    const avgLatency = this.history.reduce((sum, m) => sum + m.requests.latency.mean, 0) / this.history.length;

    return {
      period: {
        minutes: this.history.length,
        from: this.history[0].timestamp,
        to: this.history[this.history.length - 1].timestamp
      },
      requests: {
        total: totalRequests,
        errors: totalErrors,
        errorRate: (totalErrors / totalRequests) * 100,
        avgPerMinute: totalRequests / this.history.length
      },
      latency: {
        avg: avgLatency,
        max: Math.max(...this.history.map(m => m.requests.latency.max))
      },
      system: {
        currentMemory: this.history[this.history.length - 1].system.memory.heapUsed,
        currentCpu: this.history[this.history.length - 1].system.cpu.usage
      }
    };
  }
}

// Export singleton instance
module.exports = new PerformanceMetrics();
