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
const {
  agentPermissions,
  auditLog,
  agentRateLimit,
} = require('../lib/agent/middleware');
const agentService = require('../services/agent-service');

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
  async (req, res) => {
    try {
      const { query: searchQuery, limit = 10, offset = 0 } = req.query;

      if (!searchQuery) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Query parameter is required',
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
    } catch (error) {
      log.error('search_projects error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search projects',
      });
    }
  }
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
  async (req, res) => {
    try {
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
    } catch (error) {
      log.error('list_projects error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list projects',
      });
    }
  }
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
  async (req, res) => {
    try {
      const { id } = req.params;

      const project = await agentService.getProject(req.user.id, id);

      if (!project) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Project not found or access denied',
        });
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      log.error('get_project error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get project',
      });
    }
  }
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
  async (req, res) => {
    try {
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
    } catch (error) {
      log.error('activity_feed error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get activity feed',
      });
    }
  }
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
  async (req, res) => {
    try {
      const { since } = req.query;

      const changes = await agentService.whatChanged(req.user.id, since);

      res.json({
        success: true,
        data: changes,
      });
    } catch (error) {
      log.error('what_changed error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get changes',
      });
    }
  }
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
  async (req, res) => {
    try {
      const brief = await agentService.generateDailyBrief(req.user.id);

      res.json({
        success: true,
        data: brief,
      });
    } catch (error) {
      log.error('daily_brief error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate daily brief',
      });
    }
  }
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
  async (req, res) => {
    const { message, sessionId, projectId } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Message is required',
      });
    }

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
  async (req, res) => {
    try {
      const { projectId } = req.body;

      const session = await agentService.createSession(req.user.id, projectId);

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      log.error('create_session error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create session',
      });
    }
  }
);

/**
 * GET /api/agent/session/:id
 * Get session details
 */
router.get('/session/:id',
  authenticateToken,
  async (req, res) => {
    try {
      const session = await agentService.getSession(req.params.id);

      if (!session || session.user_id !== req.user.id) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Session not found',
        });
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      log.error('get_session error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get session',
      });
    }
  }
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
  async (req, res) => {
    try {
      const actions = await agentService.getPendingActions(req.user.id);

      res.json({
        success: true,
        data: actions,
        count: actions.length,
      });
    } catch (error) {
      log.error('pending_actions error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get pending actions',
      });
    }
  }
);

/**
 * POST /api/agent/pending_action/:id/approve
 * Approve a pending action
 */
router.post('/pending_action/:id/approve',
  authenticateToken,
  async (req, res) => {
    try {
      await agentService.resolvePendingAction(req.params.id, 'approved', req.user.id);

      res.json({
        success: true,
        message: 'Action approved',
      });
    } catch (error) {
      log.error('approve_action error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to approve action',
      });
    }
  }
);

/**
 * POST /api/agent/pending_action/:id/reject
 * Reject a pending action
 */
router.post('/pending_action/:id/reject',
  authenticateToken,
  async (req, res) => {
    try {
      await agentService.resolvePendingAction(req.params.id, 'rejected', req.user.id);

      res.json({
        success: true,
        message: 'Action rejected',
      });
    } catch (error) {
      log.error('reject_action error', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reject action',
      });
    }
  }
);

module.exports = router;
