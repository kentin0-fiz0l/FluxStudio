/**
 * MCP Routes - Model Context Protocol API
 *
 * Provides endpoints for:
 * - Natural language database queries
 * - Listing available MCP tools
 * - Cache management
 *
 * Extracted from server-unified.js during Sprint 18 decomposition.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { createLogger } = require('../lib/logger');
const log = createLogger('MCP');
const { zodValidate } = require('../middleware/zodValidate');
const { mcpQuerySchema } = require('../lib/schemas');

const router = express.Router();

// Lazy-load MCP manager
let mcpManager = null;
let mcpInitialized = false;

function getMcpManager() {
  if (!mcpManager) {
    mcpManager = require('../lib/mcp-manager');
    if (process.env.MCP_AUTO_CONNECT !== 'false') {
      mcpManager.initialize()
        .then(() => {
          mcpInitialized = true;
          log.info('MCP Manager initialized successfully');
        })
        .catch(err => {
          log.warn('MCP Manager initialization failed', err);
        });
    }
  }
  return mcpManager;
}

// Execute natural language database query
router.post('/query', authenticateToken, zodValidate(mcpQuerySchema), async (req, res) => {
  try {
    const { query: naturalLanguageQuery } = req.body;

    const manager = getMcpManager();
    if (!mcpInitialized) {
      return res.status(503).json({
        success: false,
        error: 'MCP service not available',
        code: 'MCP_SERVICE_UNAVAILABLE',
        fallback: 'Try using direct SQL queries instead'
      });
    }

    const result = await manager.queryDatabase(naturalLanguageQuery, req.user.id);

    res.json(result);
  } catch (error) {
    log.error('MCP query error', error);
    res.status(500).json({ success: false, error: 'MCP query failed', code: 'MCP_QUERY_ERROR' });
  }
});

// List available MCP tools
router.get('/tools', authenticateToken, async (req, res) => {
  try {
    const manager = getMcpManager();
    if (!mcpInitialized) {
      return res.json({ tools: {}, available: false });
    }

    const tools = manager.listTools();

    res.json({ tools, available: true });
  } catch (error) {
    log.error('MCP list tools error', error);
    res.status(500).json({ success: false, error: 'Failed to list MCP tools', code: 'MCP_LIST_TOOLS_ERROR' });
  }
});

// Clear MCP query cache
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required', code: 'MCP_ADMIN_REQUIRED' });
    }

    const manager = getMcpManager();
    if (!mcpInitialized) {
      return res.status(503).json({ success: false, error: 'MCP service not available', code: 'MCP_SERVICE_UNAVAILABLE' });
    }

    manager.clearCache();

    res.json({ success: true, message: 'MCP cache cleared successfully' });
  } catch (error) {
    log.error('MCP cache clear error', error);
    res.status(500).json({ success: false, error: 'Failed to clear MCP cache', code: 'MCP_CACHE_CLEAR_ERROR' });
  }
});

module.exports = router;
