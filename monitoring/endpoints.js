/**
 * Performance Monitoring API Endpoints
 * Provides REST endpoints for accessing performance metrics and health data
 */

const express = require('express');
const { performanceMonitor } = require('./performance');

function createMonitoringRouter() {
  const router = express.Router();

  // Get current performance summary
  router.get('/performance/summary', (req, res) => {
    try {
      const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour default
      const summary = performanceMonitor.getPerformanceSummary(timeRange);
      res.json(summary);
    } catch (error) {
      console.error('Error getting performance summary:', error);
      res.status(500).json({ error: 'Failed to get performance summary' });
    }
  });

  // Get metrics for specific service
  router.get('/performance/service/:serviceName', (req, res) => {
    try {
      const { serviceName } = req.params;
      const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour default
      const metrics = performanceMonitor.getServiceMetrics(serviceName, timeRange);
      res.json({ service: serviceName, metrics });
    } catch (error) {
      console.error('Error getting service metrics:', error);
      res.status(500).json({ error: 'Failed to get service metrics' });
    }
  });

  // Get all recent alerts
  router.get('/performance/alerts', (req, res) => {
    try {
      const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour default
      const now = new Date();
      const startTime = new Date(now.getTime() - timeRange);

      const recentAlerts = performanceMonitor.alerts.filter(alert =>
        alert.timestamp > startTime
      );

      res.json({ alerts: recentAlerts });
    } catch (error) {
      console.error('Error getting alerts:', error);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  });

  // Get real-time metrics (current values)
  router.get('/performance/realtime', (req, res) => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 300000);

      const recentMetrics = performanceMonitor.metrics.filter(metric =>
        metric.timestamp > fiveMinutesAgo
      );

      // Group by metric name and get latest values
      const currentMetrics = {};
      recentMetrics.forEach(metric => {
        if (!currentMetrics[metric.name] || metric.timestamp > currentMetrics[metric.name].timestamp) {
          currentMetrics[metric.name] = metric;
        }
      });

      res.json({
        timestamp: now.toISOString(),
        metrics: currentMetrics,
        alertCount: performanceMonitor.alerts.filter(a => a.timestamp > fiveMinutesAgo).length
      });
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      res.status(500).json({ error: 'Failed to get real-time metrics' });
    }
  });

  // Export metrics as CSV or JSON
  router.get('/performance/export', (req, res) => {
    try {
      const format = req.query.format || 'json';
      const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour default

      // Filter metrics by time range
      const now = new Date();
      const startTime = new Date(now.getTime() - timeRange);
      const filteredMetrics = performanceMonitor.metrics.filter(metric =>
        metric.timestamp > startTime
      );

      if (format === 'csv') {
        const headers = ['timestamp', 'name', 'value', 'service', 'context'];
        const rows = filteredMetrics.map(m => [
          m.timestamp.toISOString(),
          m.name,
          m.value.toString(),
          m.service,
          JSON.stringify(m.context || {})
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=performance-metrics-${Date.now()}.csv`);
        res.send(csvContent);
      } else {
        const exportData = {
          metrics: filteredMetrics,
          alerts: performanceMonitor.alerts.filter(a => a.timestamp > startTime),
          summary: performanceMonitor.getPerformanceSummary(timeRange),
          exportedAt: now.toISOString(),
          timeRange: timeRange / 1000 / 60 // in minutes
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=performance-data-${Date.now()}.json`);
        res.json(exportData);
      }
    } catch (error) {
      console.error('Error exporting metrics:', error);
      res.status(500).json({ error: 'Failed to export metrics' });
    }
  });

  // Health check with performance status
  router.get('/health', (req, res) => {
    try {
      const summary = performanceMonitor.getPerformanceSummary(300000); // 5 minutes
      const status = summary.health === 'critical' ? 'unhealthy' : 'healthy';

      res.status(summary.health === 'critical' ? 503 : 200).json({
        status,
        health: summary.health,
        timestamp: new Date().toISOString(),
        alerts: summary.totalAlerts,
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal
        }
      });
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(500).json({
        status: 'error',
        error: 'Health check failed'
      });
    }
  });

  // Control monitoring (enable/disable)
  router.post('/performance/control', (req, res) => {
    try {
      const { action } = req.body;

      switch (action) {
        case 'enable':
          performanceMonitor.setEnabled(true);
          res.json({ message: 'Performance monitoring enabled' });
          break;
        case 'disable':
          performanceMonitor.setEnabled(false);
          res.json({ message: 'Performance monitoring disabled' });
          break;
        case 'clear':
          performanceMonitor.clear();
          res.json({ message: 'Performance data cleared' });
          break;
        default:
          res.status(400).json({ error: 'Invalid action. Use: enable, disable, or clear' });
      }
    } catch (error) {
      console.error('Error controlling monitoring:', error);
      res.status(500).json({ error: 'Failed to control monitoring' });
    }
  });

  // Update alert thresholds
  router.put('/performance/thresholds', (req, res) => {
    try {
      const { thresholds } = req.body;

      if (!thresholds || typeof thresholds !== 'object') {
        return res.status(400).json({ error: 'Invalid thresholds format' });
      }

      // Update thresholds
      Object.keys(thresholds).forEach(key => {
        if (performanceMonitor.alertThresholds.hasOwnProperty(key)) {
          performanceMonitor.alertThresholds[key] = thresholds[key];
        }
      });

      res.json({
        message: 'Alert thresholds updated',
        thresholds: performanceMonitor.alertThresholds
      });
    } catch (error) {
      console.error('Error updating thresholds:', error);
      res.status(500).json({ error: 'Failed to update thresholds' });
    }
  });

  return router;
}

module.exports = { createMonitoringRouter };