/**
 * Performance Monitoring System for FluxStudio Sprint 10
 * Continuous monitoring and alerting for production performance
 */

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor(config = {}) {
    this.config = {
      authServerUrl: config.authServerUrl || 'http://localhost:3001',
      messagingServerUrl: config.messagingServerUrl || 'http://localhost:3004',
      monitoringInterval: config.monitoringInterval || 5000, // 5 seconds
      alertThresholds: {
        responseTime: config.alertThresholds?.responseTime || 1000, // 1 second
        errorRate: config.alertThresholds?.errorRate || 5, // 5%
        memoryGrowth: config.alertThresholds?.memoryGrowth || 100 * 1024 * 1024, // 100MB
        cpuUsage: config.alertThresholds?.cpuUsage || 80 // 80%
      },
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    this.metrics = [];
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringStartTime = null;
    this.authToken = null;
  }

  async start(authToken) {
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    this.authToken = authToken;
    this.isMonitoring = true;
    this.monitoringStartTime = Date.now();

    console.log('🔍 Starting Performance Monitoring...');
    console.log(`   Monitoring interval: ${this.config.monitoringInterval / 1000}s`);
    console.log(`   Alert thresholds:`);
    console.log(`     Response Time: ${this.config.alertThresholds.responseTime}ms`);
    console.log(`     Error Rate: ${this.config.alertThresholds.errorRate}%`);
    console.log(`     Memory Growth: ${Math.round(this.config.alertThresholds.memoryGrowth / 1024 / 1024)}MB`);
    console.log(`     CPU Usage: ${this.config.alertThresholds.cpuUsage}%\n`);

    // Start monitoring intervals
    this.startMetricsCollection();
    this.startPerformanceMonitoring();
    this.startMemoryMonitoring();
    this.startErrorMonitoring();

    // Setup cleanup
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('\n🛑 Stopping Performance Monitoring...');
    this.isMonitoring = false;

    if (this.metricsInterval) clearInterval(this.metricsInterval);
    if (this.performanceInterval) clearInterval(this.performanceInterval);
    if (this.memoryInterval) clearInterval(this.memoryInterval);
    if (this.errorInterval) clearInterval(this.errorInterval);

    this.generateReport();
    this.saveMetrics();

    console.log('✅ Performance monitoring stopped');
  }

  startMetricsCollection() {
    this.metricsInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        await this.collectSystemMetrics();
      } catch (error) {
        console.error('Metrics collection error:', error.message);
      }
    }, this.config.monitoringInterval);
  }

  startPerformanceMonitoring() {
    this.performanceInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        await this.checkPerformanceHealth();
      } catch (error) {
        console.error('Performance monitoring error:', error.message);
      }
    }, this.config.monitoringInterval);
  }

  startMemoryMonitoring() {
    this.memoryInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        await this.checkMemoryUsage();
      } catch (error) {
        console.error('Memory monitoring error:', error.message);
      }
    }, this.config.monitoringInterval * 2); // Check every 10 seconds
  }

  startErrorMonitoring() {
    this.errorInterval = setInterval(async () => {
      if (!this.isMonitoring) return;

      try {
        await this.checkErrorRates();
      } catch (error) {
        console.error('Error monitoring error:', error.message);
      }
    }, this.config.monitoringInterval * 3); // Check every 15 seconds
  }

  async collectSystemMetrics() {
    const timestamp = Date.now();
    const systemInfo = {
      timestamp,
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    // Collect API response times
    const apiMetrics = await this.measureApiPerformance();

    const metric = {
      timestamp,
      system: systemInfo,
      api: apiMetrics,
      alerts: []
    };

    this.metrics.push(metric);
    this.cleanupOldMetrics();

    // Check for alerts
    this.checkAlerts(metric);
  }

  async measureApiPerformance() {
    const endpoints = [
      { url: `${this.config.authServerUrl}/health`, auth: false },
      { url: `${this.config.authServerUrl}/api/auth/me`, auth: true },
      { url: `${this.config.authServerUrl}/api/organizations`, auth: true },
      { url: `${this.config.messagingServerUrl}/api/conversations`, auth: true }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      let success = false;
      let status = 0;
      let error = null;

      try {
        const fetch = (await import('node-fetch')).default;
        const headers = {};

        if (endpoint.auth && this.authToken) {
          headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const response = await fetch(endpoint.url, { headers });
        status = response.status;
        success = response.ok;
      } catch (err) {
        error = err.message;
      }

      const responseTime = Date.now() - startTime;

      results.push({
        endpoint: endpoint.url,
        responseTime,
        success,
        status,
        error
      });
    }

    return results;
  }

  async checkPerformanceHealth() {
    const recentMetrics = this.getRecentMetrics(60000); // Last minute
    if (recentMetrics.length === 0) return;

    const avgResponseTime = this.calculateAverageResponseTime(recentMetrics);
    const errorRate = this.calculateErrorRate(recentMetrics);

    if (avgResponseTime > this.config.alertThresholds.responseTime) {
      this.createAlert('PERFORMANCE', `High response time: ${Math.round(avgResponseTime)}ms`);
    }

    if (errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert('ERROR_RATE', `High error rate: ${errorRate.toFixed(2)}%`);
    }
  }

  async checkMemoryUsage() {
    const currentMemory = process.memoryUsage();
    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes

    if (recentMetrics.length < 2) return;

    const initialMemory = recentMetrics[0].system.memory.heapUsed;
    const currentHeapUsed = currentMemory.heapUsed;
    const memoryGrowth = currentHeapUsed - initialMemory;

    if (memoryGrowth > this.config.alertThresholds.memoryGrowth) {
      this.createAlert('MEMORY', `Memory growth detected: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);
    }
  }

  async checkErrorRates() {
    const recentMetrics = this.getRecentMetrics(120000); // Last 2 minutes
    if (recentMetrics.length === 0) return;

    const errorRate = this.calculateErrorRate(recentMetrics);

    if (errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert('HIGH_ERRORS', `Error rate: ${errorRate.toFixed(2)}%`);
    }
  }

  createAlert(type, message) {
    const alert = {
      timestamp: Date.now(),
      type,
      message,
      severity: this.getAlertSeverity(type)
    };

    this.alerts.push(alert);

    const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${icon} ALERT [${type}]: ${message}`);

    // Prevent spam by limiting alerts of the same type
    this.deduplicateAlerts();
  }

  getAlertSeverity(type) {
    const criticalTypes = ['MEMORY', 'HIGH_ERRORS'];
    return criticalTypes.includes(type) ? 'critical' : 'warning';
  }

  deduplicateAlerts() {
    const recentAlerts = this.alerts.filter(
      alert => Date.now() - alert.timestamp < 300000 // Last 5 minutes
    );

    // Group by type and only keep most recent of each type
    const alertsByType = {};
    recentAlerts.forEach(alert => {
      if (!alertsByType[alert.type] || alert.timestamp > alertsByType[alert.type].timestamp) {
        alertsByType[alert.type] = alert;
      }
    });

    // Keep only recent unique alerts
    this.alerts = this.alerts.filter(
      alert => Date.now() - alert.timestamp > 300000 || alertsByType[alert.type] === alert
    );
  }

  getRecentMetrics(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  calculateAverageResponseTime(metrics) {
    const allResponseTimes = [];

    metrics.forEach(metric => {
      if (metric.api) {
        metric.api.forEach(api => {
          allResponseTimes.push(api.responseTime);
        });
      }
    });

    return allResponseTimes.length > 0
      ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
      : 0;
  }

  calculateErrorRate(metrics) {
    let totalRequests = 0;
    let errorRequests = 0;

    metrics.forEach(metric => {
      if (metric.api) {
        metric.api.forEach(api => {
          totalRequests++;
          if (!api.success) errorRequests++;
        });
      }
    });

    return totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;
  }

  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoff);
  }

  generateReport() {
    if (this.metrics.length === 0) {
      console.log('📊 No metrics collected');
      return;
    }

    const duration = Date.now() - this.monitoringStartTime;
    const avgResponseTime = this.calculateAverageResponseTime(this.metrics);
    const errorRate = this.calculateErrorRate(this.metrics);

    console.log('\n📊 PERFORMANCE MONITORING REPORT');
    console.log('=========================================');
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Metrics Collected: ${this.metrics.length}`);
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`Alerts Generated: ${this.alerts.length}`);

    if (this.alerts.length > 0) {
      console.log('\n🚨 ALERTS:');
      this.alerts.forEach(alert => {
        const date = new Date(alert.timestamp).toLocaleTimeString();
        const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`   ${icon} [${date}] ${alert.type}: ${alert.message}`);
      });
    }

    console.log('');
  }

  saveMetrics() {
    const metricsPath = path.join(__dirname, 'performance-metrics.json');
    const report = {
      monitoringPeriod: {
        start: this.monitoringStartTime,
        end: Date.now(),
        duration: Date.now() - this.monitoringStartTime
      },
      config: this.config,
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        avgResponseTime: this.calculateAverageResponseTime(this.metrics),
        errorRate: this.calculateErrorRate(this.metrics),
        totalMetrics: this.metrics.length,
        totalAlerts: this.alerts.length
      }
    };

    fs.writeFileSync(metricsPath, JSON.stringify(report, null, 2));
    console.log(`📄 Performance metrics saved to: ${metricsPath}`);
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const duration = args[0] ? parseInt(args[0]) * 1000 : 60000; // Default 1 minute

  console.log(`🔍 Starting Performance Monitor for ${duration / 1000}s...`);

  const monitor = new PerformanceMonitor({
    monitoringInterval: 3000, // 3 seconds
    alertThresholds: {
      responseTime: 500, // 500ms
      errorRate: 10, // 10%
      memoryGrowth: 50 * 1024 * 1024, // 50MB
      cpuUsage: 70 // 70%
    }
  });

  // Start monitoring (without auth token for basic monitoring)
  monitor.start();

  // Stop after specified duration
  setTimeout(() => {
    monitor.stop();
    process.exit(0);
  }, duration);
}

module.exports = PerformanceMonitor;