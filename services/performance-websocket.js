const { Server } = require('socket.io');
const { PerformanceMonitor } = require('./performance-monitor');
const { createLogger } = require('../lib/logger');
const log = createLogger('PerformanceWS');

class PerformanceWebSocketService {
  constructor(httpServer, dbConfig) {
    this.io = new Server(httpServer, {
      cors: {
        origin: ['https://fluxstudio.art', 'http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/performance-socket.io/'
    });

    this.performanceMonitor = new PerformanceMonitor({
      updateInterval: 5000,
      historyLength: 100,
      dbConfig
    });

    this.connectedClients = new Set();
    this.setupEventHandlers();
  }

  start() {
    this.performanceMonitor.start();

    // Subscribe to performance updates
    this.unsubscribe = this.performanceMonitor.subscribe((metrics) => {
      this.broadcastMetrics(metrics);
    });

    log.info('Performance WebSocket service started');
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.performanceMonitor.stop();
    this.io.close();

    log.info('Performance WebSocket service stopped');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      log.info('Performance dashboard client connected', { socketId: socket.id });
      this.connectedClients.add(socket.id);

      // Send current metrics immediately
      const latestMetrics = this.performanceMonitor.getLatestMetrics();
      if (latestMetrics) {
        socket.emit('system_metrics', latestMetrics);
      }

      // Handle metric requests
      socket.on('request_metrics', async () => {
        try {
          const metrics = this.performanceMonitor.getLatestMetrics();
          const dbMetrics = await this.performanceMonitor.getDatabaseMetrics();

          socket.emit('system_metrics', metrics);
          socket.emit('database_metrics', dbMetrics);
        } catch (error) {
          log.error('Error handling metrics request', error);
          socket.emit('error', { message: 'Failed to fetch metrics' });
        }
      });

      // Handle historical data requests
      socket.on('request_history', (params = {}) => {
        try {
          const limit = params.limit || 30;
          const history = this.performanceMonitor.getMetricsHistory(limit);
          socket.emit('metrics_history', history);
        } catch (error) {
          log.error('Error handling history request', error);
          socket.emit('error', { message: 'Failed to fetch historical data' });
        }
      });

      // Handle health check requests
      socket.on('request_health_check', async () => {
        try {
          const healthStatus = await this.performanceMonitor.healthCheck();
          socket.emit('health_status', healthStatus);
        } catch (error) {
          log.error('Error handling health check', error);
          socket.emit('error', { message: 'Health check failed' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        log.info('Performance dashboard client disconnected', { socketId: socket.id });
        this.connectedClients.delete(socket.id);
      });

      // Handle custom metric requests
      socket.on('request_custom_metrics', async (params) => {
        try {
          const customMetrics = await this.getCustomMetrics(params);
          socket.emit('custom_metrics', customMetrics);
        } catch (error) {
          log.error('Error handling custom metrics request', error);
          socket.emit('error', { message: 'Failed to fetch custom metrics' });
        }
      });

      // Handle alert subscription
      socket.on('subscribe_alerts', (alertConfig) => {
        socket.alertConfig = alertConfig;
        log.info('Client subscribed to alerts', { socketId: socket.id, alertConfig });
      });
    });
  }

  broadcastMetrics(metrics) {
    if (this.connectedClients.size === 0) return;

    // Broadcast to all connected clients
    this.io.emit('system_metrics', metrics);

    // Check for alerts
    this.checkAndSendAlerts(metrics);
  }

  checkAndSendAlerts(metrics) {
    this.io.sockets.sockets.forEach((socket) => {
      const alertConfig = socket.alertConfig;
      if (!alertConfig) return;

      const alerts = [];

      // Check CPU threshold
      if (alertConfig.cpu_threshold && metrics.cpu_usage > alertConfig.cpu_threshold) {
        alerts.push({
          type: 'cpu_high',
          severity: 'warning',
          message: `CPU usage is ${metrics.cpu_usage.toFixed(1)}% (threshold: ${alertConfig.cpu_threshold}%)`,
          value: metrics.cpu_usage,
          threshold: alertConfig.cpu_threshold
        });
      }

      // Check memory threshold
      if (alertConfig.memory_threshold && metrics.memory_usage > alertConfig.memory_threshold) {
        alerts.push({
          type: 'memory_high',
          severity: 'warning',
          message: `Memory usage is ${metrics.memory_usage.toFixed(1)}% (threshold: ${alertConfig.memory_threshold}%)`,
          value: metrics.memory_usage,
          threshold: alertConfig.memory_threshold
        });
      }

      // Check API response time
      if (alertConfig.response_time_threshold && metrics.api_response_time > alertConfig.response_time_threshold) {
        alerts.push({
          type: 'response_slow',
          severity: 'warning',
          message: `API response time is ${metrics.api_response_time}ms (threshold: ${alertConfig.response_time_threshold}ms)`,
          value: metrics.api_response_time,
          threshold: alertConfig.response_time_threshold
        });
      }

      // Check error rate
      if (alertConfig.error_rate_threshold && metrics.error_rate > alertConfig.error_rate_threshold) {
        alerts.push({
          type: 'error_rate_high',
          severity: 'critical',
          message: `Error rate is ${metrics.error_rate.toFixed(1)}% (threshold: ${alertConfig.error_rate_threshold}%)`,
          value: metrics.error_rate,
          threshold: alertConfig.error_rate_threshold
        });
      }

      if (alerts.length > 0) {
        socket.emit('performance_alerts', alerts);
      }
    });
  }

  async getCustomMetrics(params) {
    try {
      const { type, timeRange, filters } = params;

      switch (type) {
        case 'database_performance':
          return await this.getDatabasePerformanceMetrics(timeRange, filters);
        case 'message_analytics':
          return await this.getMessageAnalytics(timeRange, filters);
        case 'user_activity':
          return await this.getUserActivityMetrics(timeRange, filters);
        default:
          throw new Error(`Unknown custom metric type: ${type}`);
      }
    } catch (error) {
      log.error('Error getting custom metrics', error);
      throw error;
    }
  }

  async getDatabasePerformanceMetrics(timeRange, filters) {
    // This would implement custom database performance queries
    // For now, return mock data structure
    return {
      query_performance: {
        slowest_queries: [],
        average_response_time: 45,
        total_queries: 1234
      },
      table_stats: await this.performanceMonitor.getDatabaseMetrics(),
      connection_pool: {
        active: 5,
        idle: 15,
        total: 20,
        max: 20
      }
    };
  }

  async getMessageAnalytics(timeRange, filters) {
    // This would implement messaging analytics
    return {
      message_count: Math.floor(Math.random() * 1000),
      active_conversations: Math.floor(Math.random() * 50),
      average_response_time: Math.floor(Math.random() * 30) + 5,
      peak_hours: [9, 10, 11, 14, 15, 16]
    };
  }

  async getUserActivityMetrics(timeRange, filters) {
    // This would implement user activity analytics
    return {
      active_users: Math.floor(Math.random() * 100),
      new_registrations: Math.floor(Math.random() * 10),
      session_duration: Math.floor(Math.random() * 60) + 15,
      bounce_rate: Math.random() * 20 + 5
    };
  }

  getConnectionCount() {
    return this.connectedClients.size;
  }

  getStatus() {
    return {
      connected_clients: this.connectedClients.size,
      monitor_running: this.performanceMonitor.isRunning,
      last_update: this.performanceMonitor.getLatestMetrics()?.timestamp || null
    };
  }
}

module.exports = { PerformanceWebSocketService };