/**
 * Agent Service - FluxStudio AI Agent Business Logic
 *
 * Provides core business logic for the AI agent system:
 * - Project search and retrieval
 * - Activity feed and change tracking
 * - AI-powered summaries using Anthropic SDK
 *
 * Date: 2026-02-06
 */

const { query, generateCuid } = require('../database/config');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client (lazy - only if API key is available)
let anthropic = null;
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

function getAnthropicClient() {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.');
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

/**
 * Search projects by query
 */
async function searchProjects(userId, searchQuery, options = {}) {
  const { limit = 10, offset = 0 } = options;

  try {
    const result = await query(`
      SELECT p.id, p.title, p.description, p.status, p.type,
             p."createdAt", p."updatedAt",
             u.name as client_name
      FROM projects p
      LEFT JOIN users u ON p."clientId" = u.id
      WHERE p."clientId" = $1
        AND (
          p.title ILIKE '%' || $2 || '%'
          OR p.description ILIKE '%' || $2 || '%'
        )
      ORDER BY p."updatedAt" DESC
      LIMIT $3 OFFSET $4
    `, [userId, searchQuery, limit, offset]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.title,
      description: row.description,
      status: row.status,
      type: row.type,
      clientName: row.client_name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  } catch (error) {
    console.error('[AgentService] searchProjects error:', error);
    return [];
  }
}

/**
 * Get project details with access check
 */
async function getProject(userId, projectId) {
  try {
    const result = await query(`
      SELECT p.*,
             u.name as client_name,
             u.email as client_email
      FROM projects p
      LEFT JOIN users u ON p."clientId" = u.id
      WHERE p.id = $2
        AND p."clientId" = $1
    `, [userId, projectId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.title,
      description: row.description,
      status: row.status,
      type: row.type,
      clientName: row.client_name,
      clientEmail: row.client_email,
      startDate: row.startDate,
      dueDate: row.dueDate,
      budget: row.budget,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (error) {
    console.error('[AgentService] getProject error:', error);
    return null;
  }
}

/**
 * List user's projects
 */
async function listProjects(userId, options = {}) {
  const { limit = 20, offset = 0, status } = options;

  try {
    let sql = `
      SELECT p.id, p.title, p.description, p.status, p.type,
             p."createdAt", p."updatedAt", p."startDate", p."dueDate"
      FROM projects p
      WHERE p."clientId" = $1
    `;
    const params = [userId];

    if (status) {
      sql += ` AND p.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ` ORDER BY p."updatedAt" DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      name: row.title,
      description: row.description,
      status: row.status,
      type: row.type,
      startDate: row.startDate,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  } catch (error) {
    console.error('[AgentService] listProjects error:', error);
    return [];
  }
}

/**
 * Get activity feed for user
 */
async function getActivityFeed(userId, options = {}) {
  const { limit = 20, since } = options;

  try {
    // Get recent project updates
    let projectsSql = `
      SELECT 'project' as type, p.id, p.title as name, p.status,
             p."updatedAt" as timestamp, 'updated' as action
      FROM projects p
      WHERE p."clientId" = $1
    `;
    const params = [userId];

    if (since) {
      projectsSql += ` AND p."updatedAt" > $2`;
      params.push(since);
    }

    projectsSql += ` ORDER BY p."updatedAt" DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const projectsResult = await query(projectsSql, params);

    return projectsResult.rows.map(row => ({
      type: row.type,
      id: row.id,
      name: row.name,
      status: row.status,
      action: row.action,
      timestamp: row.timestamp,
    }));
  } catch (error) {
    console.error('[AgentService] getActivityFeed error:', error);
    return [];
  }
}

/**
 * Get changes since a specific time
 */
async function whatChanged(userId, since) {
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Count project updates
    const projectsResult = await query(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE "clientId" = $1 AND "updatedAt" > $2
    `, [userId, sinceDate]);

    // Get updated projects
    const updatedProjects = await query(`
      SELECT id, title, status, "updatedAt"
      FROM projects
      WHERE "clientId" = $1 AND "updatedAt" > $2
      ORDER BY "updatedAt" DESC
      LIMIT 10
    `, [userId, sinceDate]);

    return {
      since: sinceDate.toISOString(),
      summary: {
        projectUpdates: parseInt(projectsResult.rows[0]?.count) || 0,
        newMessages: 0,
        newAssets: 0,
        notifications: 0,
      },
      changes: {
        projects: updatedProjects.rows.map(p => ({
          id: p.id,
          name: p.title,
          status: p.status,
          updatedAt: p.updatedAt,
        })),
        messages: [],
        assets: [],
        notifications: [],
      },
    };
  } catch (error) {
    console.error('[AgentService] whatChanged error:', error);
    return {
      since: sinceDate.toISOString(),
      summary: { projectUpdates: 0, newMessages: 0, newAssets: 0, notifications: 0 },
      changes: { projects: [], messages: [], assets: [], notifications: [] },
    };
  }
}

/**
 * Generate daily brief using AI
 */
async function generateDailyBrief(userId) {
  try {
    // Get user's projects
    const projects = await listProjects(userId, { limit: 50 });

    // Get recent activity
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const changes = await whatChanged(userId, yesterday.toISOString());

    // If no data, return simple brief
    if (projects.length === 0) {
      return {
        brief: "You don't have any projects yet. Create your first project to get started!",
        stats: {
          projectUpdates: 0,
          newMessages: 0,
          newAssets: 0,
          notifications: 0,
        },
        activeProjectCount: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    // Count active projects
    const activeProjects = projects.filter(p =>
      !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(p.status)
    );

    // Generate AI summary
    const projectSummary = projects.slice(0, 10).map(p =>
      `- ${p.name}: ${p.status}${p.dueDate ? ` (due: ${new Date(p.dueDate).toLocaleDateString()})` : ''}`
    ).join('\n');

    const prompt = `Generate a brief, friendly daily summary for a creative professional. Be concise (2-3 sentences max).

Projects (${projects.length} total, ${activeProjects.length} active):
${projectSummary}

Recent activity:
- ${changes.summary.projectUpdates} project updates in the last 24 hours

Focus on what's most important today. Be encouraging and actionable.`;

    const response = await getAnthropicClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const brief = response.content[0]?.text || 'Welcome back! Check your projects for the latest updates.';

    return {
      brief,
      stats: changes.summary,
      activeProjectCount: activeProjects.length,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AgentService] generateDailyBrief error:', error);
    return {
      brief: 'Welcome back! Unable to generate summary at this time.',
      stats: { projectUpdates: 0, newMessages: 0, newAssets: 0, notifications: 0 },
      activeProjectCount: 0,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Chat with the agent
 */
async function chat(userId, sessionId, message, options = {}) {
  const { projectId } = options;

  // Define available tools
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
      name: 'list_projects',
      description: 'List all projects for the user',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status (optional)' },
        },
      },
    },
    {
      name: 'get_project',
      description: 'Get details about a specific project',
      input_schema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
        required: ['projectId'],
      },
    },
    {
      name: 'what_changed',
      description: 'Get changes since a specific time',
      input_schema: {
        type: 'object',
        properties: {
          since: { type: 'string', description: 'ISO timestamp (optional, defaults to 24h ago)' },
        },
      },
    },
    {
      name: 'daily_brief',
      description: 'Generate a daily summary of project activity',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  // Build system prompt
  const systemPrompt = `You are a helpful AI assistant for FluxStudio, a creative collaboration platform.
You help users manage their projects, track activity, and stay organized.
Be concise, friendly, and actionable in your responses.
${projectId ? `Current project context: ${projectId}` : ''}`;

  try {
    const response = await getAnthropicClient().messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: [{ role: 'user', content: message }],
    });

    // Handle tool calls
    const toolCalls = [];
    let finalContent = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        finalContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push(block);

        // Execute tool
        let toolResult;
        switch (block.name) {
          case 'search_projects':
            toolResult = await searchProjects(userId, block.input.query);
            break;
          case 'list_projects':
            toolResult = await listProjects(userId, { status: block.input.status });
            break;
          case 'get_project':
            toolResult = await getProject(userId, block.input.projectId);
            break;
          case 'what_changed':
            toolResult = await whatChanged(userId, block.input.since);
            break;
          case 'daily_brief':
            toolResult = await generateDailyBrief(userId);
            break;
          default:
            toolResult = { error: 'Unknown tool' };
        }

        // Continue conversation with tool result
        const followUp = await getAnthropicClient().messages.create({
          model: DEFAULT_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(toolResult),
              }],
            },
          ],
        });

        for (const followBlock of followUp.content) {
          if (followBlock.type === 'text') {
            finalContent = followBlock.text;
          }
        }
      }
    }

    return {
      content: finalContent,
      toolsUsed: toolCalls.map(t => t.name),
    };
  } catch (error) {
    console.error('[AgentService] chat error:', error);
    throw error;
  }
}

// ============================================================================
// Session Management
// ============================================================================

async function createSession(userId, projectId = null) {
  const id = generateCuid();
  const now = new Date().toISOString();

  try {
    await query(`
      INSERT INTO agent_sessions (id, user_id, project_id, created_at, last_active_at)
      VALUES ($1, $2, $3, $4, $4)
    `, [id, userId, projectId, now]);

    return { id, userId, projectId, createdAt: now };
  } catch (error) {
    console.error('[AgentService] createSession error:', error);
    throw error;
  }
}

async function getSession(sessionId) {
  try {
    const result = await query(`
      SELECT * FROM agent_sessions WHERE id = $1
    `, [sessionId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('[AgentService] getSession error:', error);
    return null;
  }
}

async function updateSessionMessages(sessionId, messages) {
  try {
    await query(`
      UPDATE agent_sessions
      SET messages = $2, last_active_at = NOW()
      WHERE id = $1
    `, [sessionId, JSON.stringify(messages)]);
  } catch (error) {
    console.error('[AgentService] updateSessionMessages error:', error);
  }
}

// ============================================================================
// Pending Actions
// ============================================================================

async function createPendingAction(sessionId, userId, actionType, payload, preview) {
  const id = generateCuid();

  try {
    await query(`
      INSERT INTO agent_pending_actions (id, session_id, user_id, action_type, payload, preview)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, sessionId, userId, actionType, JSON.stringify(payload), preview]);

    return { id, sessionId, actionType, payload, preview, status: 'pending' };
  } catch (error) {
    console.error('[AgentService] createPendingAction error:', error);
    throw error;
  }
}

async function getPendingActions(userId) {
  try {
    const result = await query(`
      SELECT * FROM agent_pending_actions
      WHERE user_id = $1 AND status = 'pending'
      ORDER BY created_at DESC
    `, [userId]);
    return result.rows;
  } catch (error) {
    console.error('[AgentService] getPendingActions error:', error);
    return [];
  }
}

async function resolvePendingAction(actionId, status, resolvedBy) {
  try {
    await query(`
      UPDATE agent_pending_actions
      SET status = $2, resolved_at = NOW(), resolved_by = $3
      WHERE id = $1
    `, [actionId, status, resolvedBy]);
  } catch (error) {
    console.error('[AgentService] resolvePendingAction error:', error);
    throw error;
  }
}

// ============================================================================
// Audit Logging
// ============================================================================

async function logAction(sessionId, userId, action, skill, input, output, latencyMs, status = 'success') {
  try {
    await query(`
      INSERT INTO agent_audit_log (session_id, user_id, action, skill, input, output, latency_ms, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [sessionId, userId, action, skill, JSON.stringify(input), JSON.stringify(output), latencyMs, status]);
  } catch (error) {
    console.error('[AgentService] logAction error:', error);
  }
}

module.exports = {
  searchProjects,
  getProject,
  listProjects,
  getActivityFeed,
  whatChanged,
  generateDailyBrief,
  chat,
  createSession,
  getSession,
  updateSessionMessages,
  createPendingAction,
  getPendingActions,
  resolvePendingAction,
  logAction,
};
