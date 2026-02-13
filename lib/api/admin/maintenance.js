/**
 * Maintenance & Performance API
 * Sprint 13, Day 5: Security Dashboard & Admin Endpoints
 *
 * Features:
 * - Manual cleanup triggers
 * - Cleanup status and scheduling
 * - Performance metrics (integrates Day 4 metrics)
 * - System health checks
 *
 * Date: 2025-10-17
 */

const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middleware/adminAuth');
const tokenCleanup = require('../../auth/tokenCleanup');
const performanceMetrics = require('../../monitoring/performanceMetrics');
const securityLogger = require('../../auth/securityLogger');
const os = require('os');
const { execSync } = require('child_process');

// Store cleanup history
let lastCleanup = null;
let cleanupSchedule = {
  enabled: true,
  interval: 'daily',
  time: '03:00'
};

/**
 * Trigger manual cleanup
 * POST /api/admin/maintenance/cleanup
 *
 * Body:
 * - types: Array of cleanup types (optional, defaults to all)
 * - dryRun: Boolean (default: false)
 */
router.post('/cleanup', adminAuth, async (req, res) => {
  try {
    const { types = ['all'], dryRun = false } = req.body;
    const startTime = Date.now();

    console.log(`🧹 Starting ${dryRun ? 'DRY RUN' : ''} cleanup...`);

    let results = {
      expiredTokens: 0,
      revokedTokens: 0,
      orphanedSessions: 0,
      archivedEvents: 0
    };

    // Determine which cleanups to run
    const runAll = types.includes('all');
    const runExpired = runAll || types.includes('expired_tokens');
    const runRevoked = runAll || types.includes('revoked_tokens');
    const runOrphaned = runAll || types.includes('orphaned_sessions');
    const runArchive = runAll || types.includes('old_events');

    if (!dryRun) {
      // Run actual cleanup
      if (runExpired || runRevoked || runOrphaned || runArchive) {
        const cleanupResults = await tokenCleanup.runFullCleanup();
        results = cleanupResults;
      }
    } else {
      // Dry run - just count what would be cleaned
      if (runExpired) {
        results.expiredTokens = await tokenCleanup.countExpiredTokens();
      }
      if (runRevoked) {
        results.revokedTokens = await tokenCleanup.countRevokedTokens();
      }
      if (runOrphaned) {
        results.orphanedSessions = await tokenCleanup.countOrphanedSessions();
      }
      if (runArchive) {
        results.archivedEvents = await tokenCleanup.countOldEvents();
      }
    }

    const duration = Date.now() - startTime;

    // Store cleanup result
    lastCleanup = {
      timestamp: new Date().toISOString(),
      duration,
      dryRun,
      results,
      triggeredBy: req.user.id,
      status: 'completed'
    };

    // Log admin action
    await securityLogger.logEvent('manual_cleanup_triggered', 'INFO', {
      adminId: req.user.id,
      adminEmail: req.user.email,
      dryRun,
      types,
      results,
      duration
    });

    res.json({
      success: true,
      status: 'completed',
      dryRun,
      duration,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Cleanup failed',
      error: error.message
    });
  }
});

/**
 * Get cleanup status
 * GET /api/admin/maintenance/cleanup/status
 */
router.get('/cleanup/status', adminAuth, async (req, res) => {
  try {
    // Get next scheduled cleanup time
    const nextCleanup = getNextScheduledCleanup();

    res.json({
      success: true,
      lastCleanup,
      nextCleanup,
      schedule: cleanupSchedule
    });
  } catch (error) {
    console.error('Error getting cleanup status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Configure cleanup schedule
 * POST /api/admin/maintenance/cleanup/schedule
 *
 * Body:
 * - enabled: Boolean
 * - interval: String (daily, weekly, monthly)
 * - time: String (HH:MM format)
 */
router.post('/cleanup/schedule', adminAuth, async (req, res) => {
  try {
    const { enabled, interval, time } = req.body;

    if (enabled !== undefined) {
      cleanupSchedule.enabled = enabled;
    }

    if (interval && ['daily', 'weekly', 'monthly'].includes(interval)) {
      cleanupSchedule.interval = interval;
    }

    if (time && /^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      cleanupSchedule.time = time;
    }

    // Log admin action
    await securityLogger.logEvent('cleanup_schedule_updated', 'INFO', {
      adminId: req.user.id,
      adminEmail: req.user.email,
      newSchedule: cleanupSchedule
    });

    res.json({
      success: true,
      schedule: cleanupSchedule,
      nextCleanup: getNextScheduledCleanup()
    });
  } catch (error) {
    console.error('Error updating cleanup schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get current performance metrics
 * GET /api/admin/performance/metrics
 *
 * Query params:
 * - minutes: Number of minutes of history (default: 60)
 */
router.get('/performance/metrics', adminAuth, async (req, res) => {
  try {
    const { minutes = 60 } = req.query;

    const current = performanceMetrics.getCurrentMetrics();
    const history = performanceMetrics.getHistory(parseInt(minutes));
    const summary = performanceMetrics.getSummary();

    // Get recent performance alerts
    const alerts = history
      .filter(m => m.alerts && m.alerts.length > 0)
      .flatMap(m => m.alerts)
      .slice(-10); // Last 10 alerts

    res.json({
      success: true,
      current,
      history,
      summary,
      alerts: alerts || []
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get performance summary
 * GET /api/admin/performance/summary
 *
 * Query params:
 * - period: Time period (1h, 24h, 7d, 30d)
 */
router.get('/performance/summary', adminAuth, async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    const minutes = {
      '1h': 60,
      '24h': 60, // We only store 60 minutes, so max is 1 hour
      '7d': 60,
      '30d': 60
    }[period] || 60;

    const history = performanceMetrics.getHistory(minutes);

    if (history.length === 0) {
      return res.json({
        success: true,
        summary: null,
        message: 'No performance data available'
      });
    }

    // Calculate summary
    const totalRequests = history.reduce((sum, m) => sum + m.requests.total, 0);
    const totalErrors = history.reduce((sum, m) => sum + m.requests.failed, 0);
    const avgLatency = history.reduce((sum, m) => sum + (m.requests.latency.mean || 0), 0) / history.length;
    const maxLatency = Math.max(...history.map(m => m.requests.latency.max || 0));

    // Calculate latency percentiles across all data
    const allLatencies = [];
    history.forEach(m => {
      if (m.requests.latency) {
        allLatencies.push(m.requests.latency.p50, m.requests.latency.p95, m.requests.latency.p99);
      }
    });

    allLatencies.sort((a, b) => a - b);
    const getPercentile = (arr, p) => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((arr.length * p) / 100) - 1;
      return arr[Math.max(0, index)];
    };

    // Get endpoint breakdown from most recent data
    const latestMetrics = history[history.length - 1];
    const endpointBreakdown = latestMetrics?.requests?.byEndpoint || {};

    // System resource trends
    const memoryTrend = history.map(m => m.system.memory.heapUsed);
    const cpuTrend = history.map(m => m.system.cpu.usage);

    const summary = {
      period,
      dataPoints: history.length,
      requests: {
        total: totalRequests,
        errors: totalErrors,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        avgPerMinute: totalRequests / history.length
      },
      latency: {
        avg: avgLatency,
        max: maxLatency,
        p50: getPercentile(allLatencies, 50),
        p95: getPercentile(allLatencies, 95),
        p99: getPercentile(allLatencies, 99)
      },
      system: {
        currentMemory: memoryTrend[memoryTrend.length - 1] || 0,
        maxMemory: Math.max(...memoryTrend),
        avgMemory: memoryTrend.reduce((a, b) => a + b, 0) / memoryTrend.length,
        currentCpu: cpuTrend[cpuTrend.length - 1] || 0,
        maxCpu: Math.max(...cpuTrend),
        avgCpu: cpuTrend.reduce((a, b) => a + b, 0) / cpuTrend.length
      },
      endpoints: endpointBreakdown
    };

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error getting performance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get endpoint performance breakdown
 * GET /api/admin/performance/endpoints
 */
router.get('/performance/endpoints', adminAuth, async (req, res) => {
  try {
    const history = performanceMetrics.getHistory(60);

    if (history.length === 0) {
      return res.json({
        success: true,
        endpoints: [],
        message: 'No performance data available'
      });
    }

    // Aggregate endpoint stats across all history
    const endpointStats = {};

    history.forEach(minute => {
      if (minute.requests.byEndpoint) {
        Object.entries(minute.requests.byEndpoint).forEach(([endpoint, stats]) => {
          if (!endpointStats[endpoint]) {
            endpointStats[endpoint] = {
              endpoint,
              totalRequests: 0,
              totalLatency: 0,
              maxLatency: 0,
              p95Values: []
            };
          }

          endpointStats[endpoint].totalRequests += stats.count;
          endpointStats[endpoint].totalLatency += stats.mean * stats.count;
          endpointStats[endpoint].maxLatency = Math.max(endpointStats[endpoint].maxLatency, stats.p95);
          endpointStats[endpoint].p95Values.push(stats.p95);
        });
      }
    });

    // Calculate final stats
    const endpoints = Object.values(endpointStats).map(stat => ({
      endpoint: stat.endpoint,
      requestCount: stat.totalRequests,
      avgLatency: stat.totalLatency / stat.totalRequests,
      maxLatency: stat.maxLatency,
      p95Latency: stat.p95Values.reduce((a, b) => a + b, 0) / stat.p95Values.length
    }));

    // Sort by request count (most popular first)
    endpoints.sort((a, b) => b.requestCount - a.requestCount);

    res.json({
      success: true,
      endpoints
    });
  } catch (error) {
    console.error('Error getting endpoint performance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get system health status
 * GET /api/admin/health
 */
router.get('/health', adminAuth, async (req, res) => {
  try {
    // Get system info
    const memUsage = process.memoryUsage();
    const cpuCount = os.cpus().length;
    const loadAvg = os.loadavg();

    // Get Redis status
    const cache = require('../../cache');
    let redisStatus = 'unknown';
    let redisLatency = null;

    try {
      const start = Date.now();
      await cache.get('health_check');
      redisLatency = Date.now() - start;
      redisStatus = 'healthy';
    } catch (error) {
      redisStatus = 'error';
    }

    // Get PM2 service status (if available)
    let services = [];
    try {
      const pm2Output = execSync('pm2 jlist', { encoding: 'utf8' });
      const pm2Data = JSON.parse(pm2Output);

      services = pm2Data.map(proc => ({
        name: proc.name,
        status: proc.pm2_env.status,
        uptime: Math.floor((Date.now() - proc.pm2_env.pm_uptime) / 1000),
        memory: Math.round(proc.monit.memory / 1024 / 1024),
        cpu: proc.monit.cpu,
        restarts: proc.pm2_env.restart_time
      }));
    } catch (error) {
      // PM2 not available or error
      console.log('PM2 status not available:', error.message);
    }

    // Overall health status
    let status = 'healthy';
    if (redisStatus !== 'healthy') status = 'degraded';
    if (memUsage.heapUsed / 1024 / 1024 > 500) status = 'warning';
    if (loadAvg[0] / cpuCount > 0.8) status = 'warning';

    const health = {
      status,
      timestamp: new Date().toISOString(),
      components: {
        redis: {
          status: redisStatus,
          latency: redisLatency,
          uptime: null // Would need to query Redis INFO
        },
        database: {
          status: 'healthy', // Placeholder - would need actual DB check
          latency: null,
          connections: null
        },
        fileSystem: {
          status: 'healthy',
          usage: null // Would need disk space check
        }
      },
      system: {
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: {
          cores: cpuCount,
          loadAvg1m: loadAvg[0],
          loadAvg5m: loadAvg[1],
          loadAvg15m: loadAvg[2],
          usage: Math.round((loadAvg[0] / cpuCount) * 100)
        },
        uptime: Math.floor(process.uptime()),
        nodeVersion: process.version,
        platform: process.platform
      },
      services
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Helper: Calculate next scheduled cleanup time
 */
function getNextScheduledCleanup() {
  if (!cleanupSchedule.enabled) {
    return null;
  }

  const now = new Date();
  const [hours, minutes] = cleanupSchedule.time.split(':').map(Number);

  let next = new Date(now);
  next.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  // Adjust for interval
  if (cleanupSchedule.interval === 'weekly') {
    // Schedule for next Monday
    const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
  } else if (cleanupSchedule.interval === 'monthly') {
    // Schedule for first day of next month
    next.setMonth(next.getMonth() + 1, 1);
  }

  return next.toISOString();
}

module.exports = router;
