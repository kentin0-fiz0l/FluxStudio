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
const {
  agentPermissions,
  auditLog,
  agentRateLimit,
  validateSession,
} = require('../lib/agent/middleware');
const agentService = require('../services/agent-service');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client for streaming
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
      console.error('[AgentAPI] search_projects error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to search projects',
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
      console.error('[AgentAPI] get_project error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get project',
      });
    }
  }
);

/**
 * GET /api/agent/list_assets/:projectId
 * List assets for a project
 */
router.get('/list_assets/:projectId',
  authenticateToken,
  agentRateLimit(60, 60000),
  agentPermissions('read:assets'),
  auditLog('list_assets'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { kind, limit = 20, offset = 0 } = req.query;

      const assets = await agentService.listAssets(req.user.id, projectId, {
        kind,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      res.json({
        success: true,
        data: assets,
        count: assets.length,
      });
    } catch (error) {
      console.error('[AgentAPI] list_assets error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to list assets',
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
      const { projectId, limit = 30, offset = 0, since } = req.query;

      const activity = await agentService.getActivityFeed(req.user.id, {
        projectId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        since,
      });

      res.json({
        success: true,
        data: activity,
        count: activity.length,
      });
    } catch (error) {
      console.error('[AgentAPI] activity_feed error:', error);
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
      console.error('[AgentAPI] what_changed error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get changes',
      });
    }
  }
);

/**
 * GET /api/agent/summarize_changes/:projectId
 * AI-generated summary of recent project changes
 */
router.get('/summarize_changes/:projectId',
  authenticateToken,
  agentRateLimit(10, 60000),
  agentPermissions('read:projects'),
  auditLog('summarize_changes'),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      const summary = await agentService.summarizeRecentChanges(req.user.id, projectId);

      if (summary.error) {
        return res.status(400).json({
          error: 'Bad request',
          message: summary.error,
        });
      }

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[AgentAPI] summarize_changes error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate summary',
      });
    }
  }
);

/**
 * GET /api/agent/daily_brief
 * AI-generated daily brief across all projects
 */
router.get('/daily_brief',
  authenticateToken,
  agentRateLimit(5, 60000),
  agentPermissions('read:activity'),
  auditLog('daily_brief'),
  async (req, res) => {
    try {
      const brief = await agentService.generateDailyBrief(req.user.id);

      if (brief.error) {
        return res.status(500).json({
          error: 'Generation failed',
          message: brief.error,
        });
      }

      res.json({
        success: true,
        data: brief,
      });
    } catch (error) {
      console.error('[AgentAPI] daily_brief error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate daily brief',
      });
    }
  }
);

// ============================================================================
// Chat Endpoint (SSE Streaming)
// ============================================================================

/**
 * POST /api/agent/chat
 * Stream chat response with SSE
 */
router.post('/chat',
  authenticateToken,
  agentRateLimit(30, 60000),
  agentPermissions('read:activity'),
  async (req, res) => {
    const { message, sessionId, projectId, context = {} } = req.body;
    const userId = req.user.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Message is required',
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const startTime = Date.now();

    try {
      // Get or create session
      let session;
      if (sessionId) {
        session = await agentService.getSession(sessionId, userId);
      }
      if (!session) {
        session = await agentService.createSession(userId, projectId);
      }

      // Build tools
      const tools = [
        {
          name: 'search_projects',
          description: 'Search for projects by name or description',
          input_schema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_project',
          description: 'Get detailed information about a specific project',
          input_schema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Project ID' },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'list_assets',
          description: 'List assets for a project',
          input_schema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Project ID' },
              kind: { type: 'string', description: 'Asset type filter' },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'get_activity',
          description: 'Get recent activity and notifications',
          input_schema: {
            type: 'object',
            properties: {
              projectId: { type: 'string', description: 'Optional project ID to filter by' },
            },
          },
        },
        {
          name: 'what_changed',
          description: 'Get changes since a specific time',
          input_schema: {
            type: 'object',
            properties: {
              since: { type: 'string', description: 'ISO timestamp' },
            },
          },
        },
        {
          name: 'daily_brief',
          description: 'Generate a daily brief summarizing all project activity',
          input_schema: { type: 'object', properties: {} },
        },
      ];

      // Build messages
      const messages = session.messages || [];
      messages.push({ role: 'user', content: message });

      // System prompt
      const systemPrompt = `You are FluxStudio's AI assistant. You help users manage their creative projects, track progress, and stay organized.

You have access to tools to search projects, view assets, check activity, and generate summaries. Use these tools to answer user questions accurately.

Be concise and helpful. When showing lists, format them nicely. When summarizing, highlight key points.

${projectId ? `Currently viewing project: ${projectId}` : ''}`;

      // Send session ID
      res.write(`data: ${JSON.stringify({ type: 'start', sessionId: session.id })}\n\n`);

      // Stream response
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages: messages.slice(-20),
      });

      let fullContent = '';
      let toolCalls = [];

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta?.text) {
            const chunk = event.delta.text;
            fullContent += chunk;
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block?.type === 'tool_use') {
            toolCalls.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            });
          }
        } else if (event.type === 'content_block_delta' && event.delta?.partial_json) {
          // Accumulate tool input
          if (toolCalls.length > 0) {
            const lastTool = toolCalls[toolCalls.length - 1];
            try {
              const partialInput = JSON.parse(event.delta.partial_json);
              Object.assign(lastTool.input, partialInput);
            } catch (_e) {
              // Partial JSON, will be complete later
            }
          }
        }
      }

      // Handle tool calls if any
      if (toolCalls.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'tools', tools: toolCalls.map(t => t.name) })}\n\n`);

        // Execute tools and get results
        for (const toolCall of toolCalls) {
          const result = await agentService.executeToolCall(userId, toolCall.name, toolCall.input);
          res.write(`data: ${JSON.stringify({
            type: 'tool_result',
            tool: toolCall.name,
            result: typeof result === 'object' ? JSON.stringify(result).substring(0, 500) : result,
          })}\n\n`);
        }

        // Continue with tool results (non-streaming for simplicity)
        const toolResults = [];
        for (const toolCall of toolCalls) {
          const result = await agentService.executeToolCall(userId, toolCall.name, toolCall.input);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Get final response
        const finalResponse = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          tools,
          messages: [
            ...messages.slice(-20),
            { role: 'assistant', content: [{ type: 'text', text: fullContent }, ...toolCalls.map(t => ({ type: 'tool_use', id: t.id, name: t.name, input: t.input }))] },
            { role: 'user', content: toolResults },
          ],
        });

        const finalText = finalResponse.content.find(b => b.type === 'text')?.text || '';
        if (finalText) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: '\n\n' + finalText })}\n\n`);
          fullContent += '\n\n' + finalText;
        }
      }

      // Update session
      messages.push({ role: 'assistant', content: fullContent });
      await agentService.updateSessionMessages(session.id, messages);

      // Log action
      const latencyMs = Date.now() - startTime;
      await agentService.logAction(session.id, userId, 'chat', null, { message }, { response: fullContent.substring(0, 500) }, latencyMs);

      // Send completion
      res.write(`data: ${JSON.stringify({
        type: 'done',
        sessionId: session.id,
        latencyMs,
      })}\n\n`);

      res.end();
    } catch (error) {
      console.error('[AgentAPI] chat error:', error);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error.message || 'Failed to process chat',
      })}\n\n`);
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
  agentRateLimit(20, 60000),
  async (req, res) => {
    try {
      const { projectId } = req.body;
      const session = await agentService.createSession(req.user.id, projectId);

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      console.error('[AgentAPI] create session error:', error);
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
  validateSession(),
  async (req, res) => {
    try {
      const session = await agentService.getSession(req.params.id, req.user.id);

      if (!session) {
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
      console.error('[AgentAPI] get session error:', error);
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
 * Get pending actions requiring approval
 */
router.get('/pending_actions',
  authenticateToken,
  async (req, res) => {
    try {
      const { status = 'pending', limit = 20 } = req.query;

      const actions = await agentService.getPendingActions(req.user.id, {
        status,
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: actions,
        count: actions.length,
      });
    } catch (error) {
      console.error('[AgentAPI] get pending_actions error:', error);
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
  auditLog('approve_action'),
  async (req, res) => {
    try {
      const result = await agentService.resolvePendingAction(req.params.id, req.user.id, true);

      if (result.error) {
        return res.status(400).json({
          error: 'Bad request',
          message: result.error,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[AgentAPI] approve action error:', error);
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
  auditLog('reject_action'),
  async (req, res) => {
    try {
      const result = await agentService.resolvePendingAction(req.params.id, req.user.id, false);

      if (result.error) {
        return res.status(400).json({
          error: 'Bad request',
          message: result.error,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[AgentAPI] reject action error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reject action',
      });
    }
  }
);

// ============================================================================
// Health Check
// ============================================================================

/**
 * GET /api/agent/health
 * Agent service health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agent-api',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
