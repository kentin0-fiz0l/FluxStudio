/**
 * Health Check Module for FluxStudio Services
 * Provides standardized health check endpoints for monitoring
 */

const express = require('express');
const fs = require('fs').promises;
const path = require('path');

/**
 * Create health check middleware for Express apps
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - Name of the service
 * @param {number} options.port - Port the service runs on
 * @param {Function} options.customChecks - Optional custom health checks
 * @returns {express.Router} Health check router
 */
function createHealthCheck(options) {
  const router = express.Router();
  const { serviceName, port, customChecks } = options;
  const startTime = Date.now();

  // Basic health check endpoint
  router.get('/health', async (req, res) => {
    const uptime = Date.now() - startTime;
    const health = {
      status: 'ok',
      service: serviceName,
      port: port,
      uptime: uptime,
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      pid: process.pid
    };

    try {
      // Run custom checks if provided
      if (customChecks) {
        const customResults = await customChecks();
        health.checks = customResults;
      }

      res.json(health);
    } catch (error) {
      res.status(503).json({
        ...health,
        status: 'error',
        error: error.message
      });
    }
  });

  // Liveness probe - simple check if service is alive
  router.get('/health/live', (req, res) => {
    res.json({ status: 'alive', service: serviceName });
  });

  // Readiness probe - check if service is ready to accept traffic
  router.get('/health/ready', async (req, res) => {
    try {
      const ready = {
        status: 'ready',
        service: serviceName
      };

      // Check if critical dependencies are available
      if (customChecks) {
        const checks = await customChecks();
        ready.dependencies = checks;
      }

      res.json(ready);
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        service: serviceName,
        error: error.message
      });
    }
  });

  // Metrics endpoint for monitoring
  router.get('/metrics', (req, res) => {
    const metrics = {
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        total: process.memoryUsage().heapTotal / 1024 / 1024, // MB
        external: process.memoryUsage().external / 1024 / 1024, // MB
        rss: process.memoryUsage().rss / 1024 / 1024 // MB
      },
      cpu: process.cpuUsage(),
      pid: process.pid,
      version: process.version,
      platform: process.platform
    };

    res.json(metrics);
  });

  return router;
}

/**
 * Auth service health checks
 */
async function authHealthChecks() {
  const checks = {
    database: 'ok',
    oauth: 'ok'
  };

  try {
    // Check database status
    const useDatabase = process.env.USE_DATABASE === 'true';

    if (useDatabase) {
      // Check PostgreSQL database connection
      try {
        const authAdapter = require('./database/auth-adapter');
        const healthResult = await authAdapter.healthCheck();
        checks.database = healthResult.status === 'ok' ? 'ok' : 'error';
        checks.storageType = 'postgresql';
      } catch (error) {
        checks.database = 'error';
        checks.storageType = 'postgresql_failed';
        checks.databaseError = error.message;
      }
    } else {
      // Check if users file exists and is readable (legacy mode)
      await fs.access(path.join(__dirname, 'users.json'));
      checks.database = 'ok';
      checks.storageType = 'file_based';
    }
  } catch (error) {
    checks.database = 'error';
    checks.storageType = checks.storageType || 'file_based_failed';
  }

  try {
    // Check if OAuth credentials are configured
    if (process.env.GOOGLE_CLIENT_ID) {
      checks.oauth = 'configured';
    } else {
      checks.oauth = 'not_configured';
    }
  } catch (error) {
    checks.oauth = 'error';
  }

  return checks;
}

/**
 * Messaging service health checks
 */
async function messagingHealthChecks() {
  const checks = {
    database: 'ok',
    websocket: 'ok'
  };

  try {
    // Check database status
    const useDatabase = process.env.USE_DATABASE === 'true';

    if (useDatabase) {
      // Check PostgreSQL database connection
      try {
        const messagingAdapter = require('./database/messaging-adapter');
        const healthResult = await messagingAdapter.healthCheck();
        checks.database = healthResult.status === 'ok' ? 'ok' : 'error';
        checks.storageType = 'postgresql';
        checks.messageCount = healthResult.messageCount;
        checks.conversationCount = healthResult.conversationCount;
      } catch (error) {
        checks.database = 'error';
        checks.storageType = 'postgresql_failed';
        checks.databaseError = error.message;
      }
    } else {
      // Check if messages file exists and is readable (legacy mode)
      await fs.access(path.join(__dirname, 'messages.json'));
      checks.database = 'ok';
      checks.storageType = 'file_based';
    }
  } catch (error) {
    checks.database = 'error';
    checks.storageType = checks.storageType || 'file_based_failed';
  }

  // WebSocket check would be done differently in production
  checks.websocket = 'ok';

  return checks;
}

module.exports = {
  createHealthCheck,
  authHealthChecks,
  messagingHealthChecks
};