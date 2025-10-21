/**
 * Backend Performance Monitoring Module
 * Integrates with services to track backend performance metrics
 */

const os = require('os');
const cluster = require('cluster');

class BackendPerformanceMonitor {
  constructor() {
    this.metrics = [];
    this.alerts = [];
    this.isEnabled = true;
    this.metricsInterval = null;
    this.alertThresholds = {
      responseTime: 1000,      // 1 second
      memoryUsage: 85,         // 85%
      cpuUsage: 80,           // 80%
      errorRate: 5,           // 5%
      dbQueryTime: 500,       // 500ms
      wsConnections: 1000     // 1000 connections
    };

    this.startMetricsCollection();
  }

  /**
   * Start collecting system metrics
   */
  startMetricsCollection() {
    if (this.metricsInterval) return;

    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop collecting metrics
   */
  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name, value, context = {}) {
    if (!this.isEnabled) return;

    const metric = {
      name,
      value,
      timestamp: new Date(),
      context,
      service: context.service || 'backend'
    };

    this.metrics.push(metric);
    this.checkAlertThresholds(name, value);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log significant metrics
    if (this.shouldLogMetric(name, value)) {
      console.log(`📊 Performance: ${name} = ${value}${this.getUnit(name)}`, context);
    }
  }

  /**
   * Time a function execution
   */
  timeFunction(name, fn, context = {}) {
    const startTime = process.hrtime();

    try {
      const result = fn();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = (seconds * 1000) + (nanoseconds / 1000000);

      this.recordMetric(name, duration, { ...context, success: true });
      return result;
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = (seconds * 1000) + (nanoseconds / 1000000);

      this.recordMetric(name, duration, {
        ...context,
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Time an async function execution
   */
  async timeAsyncFunction(name, fn, context = {}) {
    const startTime = process.hrtime();

    try {
      const result = await fn();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = (seconds * 1000) + (nanoseconds / 1000000);

      this.recordMetric(name, duration, { ...context, success: true });
      return result;
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = (seconds * 1000) + (nanoseconds / 1000000);

      this.recordMetric(name, duration, {
        ...context,
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Create middleware for Express apps
   */
  createExpressMiddleware(serviceName = 'backend') {
    return (req, res, next) => {
      const startTime = process.hrtime();
      const originalSend = res.send;

      res.send = function(body) {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const duration = (seconds * 1000) + (nanoseconds / 1000000);

        // Record response time
        performanceMonitor.recordMetric('response_time', duration, {
          service: serviceName,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          success: res.statusCode < 400
        });

        // Record error rate
        if (res.statusCode >= 400) {
          performanceMonitor.recordMetric('error_count', 1, {
            service: serviceName,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          });
        }

        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Create WebSocket monitoring wrapper
   */
  monitorWebSocket(io, serviceName = 'messaging') {
    let connectionCount = 0;
    let messageCount = 0;

    io.on('connection', (socket) => {
      connectionCount++;
      this.recordMetric('ws_connections', connectionCount, { service: serviceName });

      // Monitor message sending
      const originalEmit = socket.emit;
      socket.emit = function(event, ...args) {
        messageCount++;
        performanceMonitor.recordMetric('ws_messages_sent', 1, {
          service: serviceName,
          event,
          socketId: socket.id
        });
        return originalEmit.apply(this, [event, ...args]);
      };

      // Monitor message receiving
      socket.onAny((event, ...args) => {
        messageCount++;
        this.recordMetric('ws_messages_received', 1, {
          service: serviceName,
          event,
          socketId: socket.id
        });
      });

      socket.on('disconnect', () => {
        connectionCount--;
        this.recordMetric('ws_connections', connectionCount, { service: serviceName });
      });
    });

    // Record total message throughput every minute
    setInterval(() => {
      this.recordMetric('ws_message_throughput', messageCount, {
        service: serviceName,
        period: '1min'
      });
      messageCount = 0; // Reset counter
    }, 60000);
  }

  /**
   * Monitor database queries
   */
  monitorDatabaseQuery(queryName, queryFn, context = {}) {
    return this.timeAsyncFunction(`db_query_${queryName}`, queryFn, {
      ...context,
      type: 'database'
    });
  }

  /**
   * Collect system-level metrics
   */
  collectSystemMetrics() {
    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

    this.recordMetric('memory_usage_percent', memoryUsagePercent, {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });

    // CPU usage
    const cpuUsage = process.cpuUsage();
    const cpuUsagePercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.recordMetric('cpu_usage', cpuUsagePercent);

    // Event loop lag
    const start = process.hrtime();
    setImmediate(() => {
      const delta = process.hrtime(start);
      const eventLoopLag = (delta[0] * 1000) + (delta[1] / 1000000);
      this.recordMetric('event_loop_lag', eventLoopLag);
    });

    // Process uptime
    this.recordMetric('uptime', process.uptime());

    // Load average (Unix systems)
    if (os.loadavg) {
      const loadAvg = os.loadavg();
      this.recordMetric('load_average_1m', loadAvg[0]);
      this.recordMetric('load_average_5m', loadAvg[1]);
      this.recordMetric('load_average_15m', loadAvg[2]);
    }
  }

  /**
   * Check metric against alert thresholds
   */
  checkAlertThresholds(metricName, value) {
    const thresholdKey = this.getThresholdKey(metricName);
    const threshold = this.alertThresholds[thresholdKey];

    if (!threshold) return;

    let shouldAlert = false;

    switch (thresholdKey) {
      case 'memoryUsage':
      case 'cpuUsage':
        shouldAlert = value > threshold;
        break;
      case 'responseTime':
      case 'dbQueryTime':
        shouldAlert = value > threshold;
        break;
      case 'errorRate':
        shouldAlert = this.calculateErrorRate() > threshold;
        break;
      case 'wsConnections':
        shouldAlert = value > threshold;
        break;
    }

    if (shouldAlert) {
      this.triggerAlert(metricName, value, this.getSeverity(metricName, value, threshold));
    }
  }

  /**
   * Get threshold key for metric name
   */
  getThresholdKey(metricName) {
    if (metricName.includes('response_time')) return 'responseTime';
    if (metricName.includes('memory')) return 'memoryUsage';
    if (metricName.includes('cpu')) return 'cpuUsage';
    if (metricName.includes('db_query')) return 'dbQueryTime';
    if (metricName.includes('ws_connections')) return 'wsConnections';
    if (metricName.includes('error')) return 'errorRate';
    return null;
  }

  /**
   * Calculate current error rate
   */
  calculateErrorRate() {
    const recentMetrics = this.metrics.filter(m =>
      m.timestamp > new Date(Date.now() - 300000) && // Last 5 minutes
      m.name === 'error_count'
    );

    const totalRequests = this.metrics.filter(m =>
      m.timestamp > new Date(Date.now() - 300000) &&
      m.name === 'response_time'
    ).length;

    if (totalRequests === 0) return 0;

    const errorCount = recentMetrics.reduce((sum, m) => sum + m.value, 0);
    return (errorCount / totalRequests) * 100;
  }

  /**
   * Get alert severity based on threshold breach
   */
  getSeverity(metricName, value, threshold) {
    const ratio = value / threshold;

    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1.2) return 'medium';
    return 'low';
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(metric, value, severity) {
    const alert = {
      metric,
      value,
      severity,
      timestamp: new Date(),
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log alert
    console.warn(`🚨 Performance Alert [${severity.toUpperCase()}]: ${metric} = ${value}${this.getUnit(metric)}`);

    // Send to monitoring endpoint if available
    this.sendAlertToMonitoring(alert);
  }

  /**
   * Send alert to monitoring endpoint
   */
  async sendAlertToMonitoring(alert) {
    try {
      // This would integrate with external monitoring services
      // For now, just log to console and optionally send to a webhook
      const monitoringUrl = process.env.MONITORING_WEBHOOK_URL;

      if (monitoringUrl) {
        const fetch = require('node-fetch');
        await fetch(monitoringUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      }
    } catch (error) {
      console.error('Failed to send alert to monitoring service:', error.message);
    }
  }

  /**
   * Get unit for metric
   */
  getUnit(metricName) {
    if (metricName.includes('time') || metricName.includes('lag')) return 'ms';
    if (metricName.includes('usage') || metricName.includes('rate')) return '%';
    if (metricName.includes('connections') || metricName.includes('count')) return '';
    if (metricName.includes('bytes')) return 'B';
    return '';
  }

  /**
   * Should log this metric?
   */
  shouldLogMetric(name, value) {
    // Log alerts and significant metrics
    if (name.includes('error') || name.includes('alert')) return true;
    if (name === 'response_time' && value > 500) return true;
    if (name === 'memory_usage_percent' && value > 70) return true;
    if (name === 'ws_connections' && value % 10 === 0) return true; // Every 10 connections
    return false;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange = 3600000) { // 1 hour default
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRange);

    const recentMetrics = this.metrics.filter(m => m.timestamp > startTime);
    const recentAlerts = this.alerts.filter(a => a.timestamp > startTime);

    // Group metrics by name
    const metricGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.name]) groups[metric.name] = [];
      groups[metric.name].push(metric.value);
      return groups;
    }, {});

    const summary = {
      timeRange: timeRange / 1000 / 60, // in minutes
      totalMetrics: recentMetrics.length,
      totalAlerts: recentAlerts.length,
      alertsByService: {},
      performance: {},
      health: 'good'
    };

    // Calculate performance stats
    Object.keys(metricGroups).forEach(name => {
      const values = metricGroups[name];
      summary.performance[name] = {
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        latest: values[values.length - 1],
        count: values.length
      };
    });

    // Group alerts by service
    recentAlerts.forEach(alert => {
      const service = alert.service || 'backend';
      if (!summary.alertsByService[service]) {
        summary.alertsByService[service] = { critical: 0, high: 0, medium: 0, low: 0 };
      }
      summary.alertsByService[service][alert.severity]++;
    });

    // Determine overall health
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical').length;
    const highAlerts = recentAlerts.filter(a => a.severity === 'high').length;

    if (criticalAlerts > 0) summary.health = 'critical';
    else if (highAlerts > 2) summary.health = 'degraded';
    else if (recentAlerts.length > 5) summary.health = 'warning';

    return summary;
  }

  /**
   * Get metrics for specific service
   */
  getServiceMetrics(serviceName, timeRange = 3600000) {
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRange);

    return this.metrics.filter(m =>
      m.timestamp > startTime &&
      (m.context.service === serviceName || m.service === serviceName)
    );
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (enabled) {
      this.startMetricsCollection();
    } else {
      this.stopMetricsCollection();
    }
  }

  /**
   * Clear all metrics and alerts
   */
  clear() {
    this.metrics = [];
    this.alerts = [];
  }

  /**
   * Get current real-time metrics for dashboard
   */
  getCurrentMetrics() {
    // Get latest metrics for each type
    const now = new Date();
    const recentMetrics = this.metrics.filter(m =>
      now.getTime() - m.timestamp.getTime() < 60000 // Last minute
    );

    // Helper to get latest metric value
    const getLatestMetric = (name) => {
      const matches = recentMetrics.filter(m => m.name.includes(name));
      return matches.length > 0 ? matches[matches.length - 1].value : 0;
    };

    // Count active connections from WebSocket metrics
    const activeConnections = getLatestMetric('ws_connections');
    const messageCount = recentMetrics.filter(m =>
      m.name.includes('ws_messages') &&
      now.getTime() - m.timestamp.getTime() < 60000
    ).length;

    // Calculate API response time average
    const responseTimeMetrics = recentMetrics.filter(m => m.name === 'response_time');
    const avgResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;

    // Get database connection count
    const dbConnections = getLatestMetric('db_connections') || 5; // Default estimate

    // Calculate error rate
    const errorRate = this.calculateErrorRate();

    // Database-specific metrics
    const dbQueryTime = getLatestMetric('db_query') || 0;
    const slowQueries = recentMetrics.filter(m =>
      m.name.includes('db_query') && m.value > 1000
    ).length;

    return {
      timestamp: now.toISOString(),
      cpu_usage: getLatestMetric('cpu_usage') || 0,
      memory_usage: getLatestMetric('memory_usage_percent') || 0,
      active_connections: activeConnections,
      message_throughput: messageCount,
      api_response_time: Math.round(avgResponseTime),
      database_connections: dbConnections,
      database_query_time: Math.round(dbQueryTime),
      database_slow_queries: slowQueries,
      error_rate: errorRate
    };
  }

  /**
   * Get database performance metrics
   */
  async getDatabaseMetrics() {
    try {
      // Import database config dynamically to avoid circular dependencies
      const { getPoolStats, healthCheck } = require('../database/config');

      const poolStats = await getPoolStats();
      const health = await healthCheck();

      // Record database metrics
      this.recordMetric('db_pool_total', poolStats.totalCount, { service: 'database' });
      this.recordMetric('db_pool_idle', poolStats.idleCount, { service: 'database' });
      this.recordMetric('db_pool_waiting', poolStats.waitingCount, { service: 'database' });
      this.recordMetric('db_response_time', health.responseTime, { service: 'database' });

      return {
        pool: poolStats,
        health: health.status,
        responseTime: health.responseTime,
        serverTime: health.serverTime,
        serverVersion: health.serverVersion
      };
    } catch (error) {
      console.error('Failed to get database metrics:', error.message);
      return {
        pool: { totalCount: 0, idleCount: 0, waitingCount: 0 },
        health: 'error',
        responseTime: 0,
        error: error.message
      };
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format = 'json') {
    if (format === 'csv') {
      const headers = ['timestamp', 'name', 'value', 'service', 'context'];
      const rows = this.metrics.map(m => [
        m.timestamp.toISOString(),
        m.name,
        m.value.toString(),
        m.service,
        JSON.stringify(m.context || {})
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify({
      metrics: this.metrics,
      alerts: this.alerts,
      summary: this.getPerformanceSummary(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// Create singleton instance
const performanceMonitor = new BackendPerformanceMonitor();

module.exports = {
  BackendPerformanceMonitor,
  performanceMonitor
};