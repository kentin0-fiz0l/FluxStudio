/**
 * Health & Admin Routes - System Health Checks and Database Administration
 *
 * Provides endpoints for:
 * - Health check with dependency status
 * - Database status inspection
 * - Database initialization (idempotent)
 *
 * Extracted from server-unified.js during Sprint 18 decomposition.
 */

const express = require('express');
const { query } = require('../database/config');
const { config } = require('../config/environment');

const router = express.Router();

// Enhanced health check endpoint with dependency status
async function getHealthStatus(app) {
  const cache = require('../lib/cache');

  const health = {
    status: 'healthy',
    service: 'unified-backend',
    timestamp: new Date().toISOString(),
    services: ['auth', 'messaging'],
    port: config.AUTH_PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {}
  };

  const USE_DATABASE = process.env.USE_DATABASE === 'true';

  // Check database connectivity
  if (USE_DATABASE) {
    try {
      const startTime = Date.now();
      await query('SELECT 1 as ping');
      health.dependencies.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        type: 'postgresql'
      };
    } catch (dbError) {
      health.dependencies.database = {
        status: 'unhealthy',
        error: dbError.message,
        type: 'postgresql'
      };
      health.status = 'degraded';
    }
  } else {
    health.dependencies.database = {
      status: 'not_configured',
      type: 'file-based'
    };
  }

  // Check Redis cache connectivity
  try {
    if (cache.getClient) {
      const startTime = Date.now();
      const client = cache.getClient();
      if (client && client.ping) {
        await client.ping();
        health.dependencies.redis = {
          status: 'healthy',
          responseTime: Date.now() - startTime
        };
      } else {
        health.dependencies.redis = {
          status: 'not_available',
          message: 'Redis client not connected'
        };
      }
    } else {
      health.dependencies.redis = {
        status: 'not_initialized'
      };
    }
  } catch (redisError) {
    health.dependencies.redis = {
      status: 'unhealthy',
      error: redisError.message
    };
  }

  // Check Socket.IO namespaces
  const io = app.get('io');
  health.dependencies.websocket = {
    status: 'healthy',
    namespaces: {
      auth: app.get('authNamespace') ? 'active' : 'inactive',
      messaging: app.get('messagingNamespace') ? 'active' : 'inactive',
      printing: app.get('printingNamespace') ? 'active' : 'inactive',
      designBoards: app.get('designBoardsNamespace') ? 'active' : 'inactive'
    }
  };

  return health;
}

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const health = await getHealthStatus(req.app);
    const statusCode = health.status === 'healthy' ? 200 : (health.status === 'degraded' ? 200 : 503);
    res.status(statusCode).json(health);
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'unified-backend',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

// Debug endpoint to check database tables
router.get('/admin/db-status', async (req, res) => {
  try {
    const tables = await query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tableNames = tables.rows.map(r => r.tablename);
    const essentialTables = ['users', 'refresh_tokens', 'security_events', 'organizations', 'projects'];
    const missingTables = essentialTables.filter(t => !tableNames.includes(t));

    res.json({
      status: missingTables.length === 0 ? 'complete' : 'incomplete',
      totalTables: tableNames.length,
      tables: tableNames,
      essentialTables: {
        present: essentialTables.filter(t => tableNames.includes(t)),
        missing: missingTables
      }
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to check database status',
      message: err.message
    });
  }
});

// Database initialization endpoint (idempotent - safe to call multiple times)
router.post('/admin/init-database', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    console.log('Checking database status...');

    const currentTables = await query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const tableNames = currentTables.rows.map(r => r.tablename);
    const hasUsers = tableNames.includes('users');

    const authHeader = req.headers['x-admin-secret'];
    const isAuthorized = (authHeader === config.JWT_SECRET) || !hasUsers;

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Database already initialized. JWT_SECRET required for re-initialization.',
        currentTables: tableNames
      });
    }

    console.log('Running database initialization...');

    const sqlPath = path.join(__dirname, '..', 'database', 'add-missing-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await query(sql);

    console.log('Database initialization completed');

    const finalTables = await query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    const finalTableNames = finalTables.rows.map(r => r.tablename);

    res.json({
      success: true,
      message: 'Database initialized successfully',
      beforeInit: {
        tableCount: tableNames.length,
        tables: tableNames
      },
      afterInit: {
        tableCount: finalTableNames.length,
        tables: finalTableNames
      },
      tablesCreated: finalTableNames.filter(t => !tableNames.includes(t))
    });

  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(500).json({
      error: 'Database initialization failed',
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;
