/**
 * Auth Socket.IO Namespace Handler
 * Extracted from server-auth.js for unified backend consolidation
 *
 * Namespace: /auth
 * Purpose: Performance monitoring dashboard, real-time auth events
 */

const { createLogger } = require('../lib/logger');
const log = createLogger('AuthSocket');

module.exports = (namespace, performanceMonitor, authAdapter) => {
  namespace.on('connection', (socket) => {
    log.info('Auth socket connected', { socketId: socket.id });

    // Send initial metrics
    const currentMetrics = performanceMonitor.getCurrentMetrics();
    socket.emit('system_metrics', currentMetrics);

    // Handle metric requests
    socket.on('request_metrics', () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      socket.emit('system_metrics', metrics);

      // Send database metrics if available
      if (authAdapter && authAdapter.healthCheck) {
        authAdapter.healthCheck().then(dbHealth => {
          socket.emit('database_metrics', [{
            table_name: 'users',
            size_mb: 10, // Mock data - replace with actual queries
            query_count: dbHealth.queryCount || 0,
            avg_query_time: 15,
            index_usage: 95
          }]);
        }).catch(err => {
          log.error('Database health check failed', err);
        });
      }
    });

    socket.on('disconnect', () => {
      log.info('Auth socket disconnected', { socketId: socket.id });
    });
  });

  // Send real-time metrics every 5 seconds
  setInterval(() => {
    const metrics = performanceMonitor.getCurrentMetrics();
    namespace.emit('system_metrics', metrics);
  }, 5000);
};
