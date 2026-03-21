/**
 * Agent API Routes - FluxStudio AI Agent Endpoints
 *
 * Provides REST API endpoints for:
 * - Read-only skill endpoints (search, get, list)
 * - SSE streaming chat endpoint
 * - Pending action management
 * - Session management
 *
 * All endpoints require authentication and audit logging.
 *
 * Date: 2026-02-06
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const { createLogger } = require('../lib/logger');
const log = createLogger('AgentAPI');
const { zodValidate } = require('../middleware/zodValidate');
const { agentChatSchema, agentSessionSchema } = require('../lib/schemas');
const {
  agentPermissions,
  auditLog,
  agentRateLimit,
} = require('../lib/agent/middleware');
const agentService = require('../services/agent-service');
const { asyncHandler } = require('../middleware/errorHandler');

// ============================================================================
// Read-Only Skill Endpoints
// ============================================================================

/**
 * GET /api/agent/search_projects
 * Search projects by query
 */
router.get('/search_projects',
  authenticateToken,
  agentRateLimit(30, 60000),
  agentPermissions('read:projects'),
  auditLog('search_projects'),
  asyncHandler(async (req, res) => {
    const { query: searchQuery, limit = 10, offset = 0 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required',
        code: 'AGENT_QUERY_REQUIRED',
      });
    }

    const results = await agentService.searchProjects(req.user.id, searchQuery, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  })
);

/**
 * GET /api/agent/list_projects
 * List user's projects
 */
router.get('/list_projects',
  authenticateToken,
  agentRateLimit(60, 60000),
  agentPermissions('read:projects'),
  auditLog('list_projects'),
  asyncHandler(async (req, res) => {
    const { status, limit = 20, offset = 0 } = req.query;

    const projects = await agentService.listProjects(req.user.id, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  })
);

/**
 * GET /api/agent/get_project/:id
 * Get project details
 */
router.get('/get_project/:id',
  authenticateToken,
  agentRateLimit(60, 60000),
  agentPermissions('read:projects'),
  auditLog('get_project'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const project = await agentService.getProject(req.user.id, id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied',
        code: 'AGENT_PROJECT_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: project,
    });
  })
);

/**
 * GET /api/agent/activity_feed
 * Get recent activity feed
 */
router.get('/activity_feed',
  authenticateToken,
  agentRateLimit(30, 60000),
  agentPermissions('read:activity'),
  auditLog('activity_feed'),
  asyncHandler(async (req, res) => {
    const { limit = 30, since } = req.query;

    const activity = await agentService.getActivityFeed(req.user.id, {
      limit: parseInt(limit),
      since,
    });

    res.json({
      success: true,
      data: activity,
      count: activity.length,
    });
  })
);

/**
 * GET /api/agent/what_changed
 * Get changes since a timestamp
 */
router.get('/what_changed',
  authenticateToken,
  agentRateLimit(20, 60000),
  agentPermissions('read:activity'),
  auditLog('what_changed'),
  asyncHandler(async (req, res) => {
    const { since } = req.query;

    const changes = await agentService.whatChanged(req.user.id, since);

    res.json({
      success: true,
      data: changes,
    });
  })
);

/**
 * GET /api/agent/daily_brief
 * Generate daily brief
 */
router.get('/daily_brief',
  authenticateToken,
  agentRateLimit(10, 60000),
  agentPermissions('read:activity'),
  auditLog('daily_brief'),
  asyncHandler(async (req, res) => {
    const brief = await agentService.generateDailyBrief(req.user.id);

    res.json({
      success: true,
      data: brief,
    });
  })
);

// ============================================================================
// Chat Endpoint with SSE Streaming
// ============================================================================

/**
 * POST /api/agent/chat
 * Chat with agent using SSE streaming
 */
router.post('/chat',
  authenticateToken,
  agentRateLimit(20, 60000),
  zodValidate(agentChatSchema),
  async (req, res) => {
    const { message, sessionId, projectId } = req.body;

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      // Send start event
      res.write(`data: ${JSON.stringify({ type: 'start', sessionId })}\n\n`);

      // Get response from agent service
      const response = await agentService.chat(req.user.id, sessionId, message, { projectId });

      // Send the response
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: response.content })}\n\n`);

      // Send tools used
      if (response.toolsUsed && response.toolsUsed.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'tools', tools: response.toolsUsed })}\n\n`);
      }

      // Send done event
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    } catch (error) {
      log.error('chat error', error);
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message || 'Chat failed' })}\n\n`);
      res.end();
    }
  }
);

// ============================================================================
// Session Management
// ============================================================================

/**
 * POST /api/agent/session
 * Create a new agent session
 */
router.post('/session',
  authenticateToken,
  zodValidate(agentSessionSchema),
  asyncHandler(async (req, res) => {
    const { projectId } = req.body;

    const session = await agentService.createSession(req.user.id, projectId);

    res.json({
      success: true,
      data: session,
    });
  })
);

/**
 * GET /api/agent/session/:id
 * Get session details
 */
router.get('/session/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const session = await agentService.getSession(req.params.id);

    if (!session || session.user_id !== req.user.id) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        code: 'AGENT_SESSION_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: session,
    });
  })
);

// ============================================================================
// Pending Actions
// ============================================================================

/**
 * GET /api/agent/pending_actions
 * Get user's pending actions
 */
router.get('/pending_actions',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const actions = await agentService.getPendingActions(req.user.id);

    res.json({
      success: true,
      data: actions,
      count: actions.length,
    });
  })
);

/**
 * POST /api/agent/pending_action/:id/approve
 * Approve a pending action
 */
router.post('/pending_action/:id/approve',
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agentService.resolvePendingAction(req.params.id, 'approved', req.user.id);

    res.json({
      success: true,
      message: 'Action approved',
    });
  })
);

/**
 * POST /api/agent/pending_action/:id/reject
 * Reject a pending action
 */
router.post('/pending_action/:id/reject',
  authenticateToken,
  asyncHandler(async (req, res) => {
    await agentService.resolvePendingAction(req.params.id, 'rejected', req.user.id);

    res.json({
      success: true,
      message: 'Action rejected',
    });
  })
);

module.exports = router;
