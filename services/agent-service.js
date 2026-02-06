/**
 * Agent Service - FluxStudio AI Agent Business Logic
 *
 * Provides core business logic for the AI agent system:
 * - Project search and retrieval
 * - Asset listing
 * - Activity feed and change tracking
 * - AI-powered summaries using Anthropic SDK
 *
 * Date: 2026-02-06
 */

const { query, generateCuid } = require('../database/config');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

/**
 * Search projects by query with full-text search
 */
async function searchProjects(userId, searchQuery, options = {}) {
  const { limit = 10, offset = 0 } = options;

  try {
    const result = await query(`
      SELECT DISTINCT p.id, p.name, p.description, p.status, p.priority,
             p.created_at, p.updated_at,
             o.name as organization_name,
             ts_rank(
               to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')),
               plainto_tsquery('english', $2)
             ) as rank
      FROM projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id AND om.user_id = $1
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      WHERE (
        p.manager_id = $1
        OR om.user_id = $1
        OR pm.user_id = $1
      )
      AND (
        p.name ILIKE '%' || $2 || '%'
        OR p.description ILIKE '%' || $2 || '%'
        OR to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', $2)
      )
      ORDER BY rank DESC, p.updated_at DESC
      LIMIT $3 OFFSET $4
    `, [userId, searchQuery, limit, offset]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      priority: row.priority,
      organizationName: row.organization_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      relevanceScore: row.rank,
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
             o.name as organization_name,
             o.slug as organization_slug,
             u.name as manager_name,
             u.email as manager_email,
             (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
             (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id) as task_count,
             (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status = 'completed') as completed_task_count,
             (SELECT COUNT(*) FROM assets a WHERE a.organization_id = p.organization_id) as asset_count
      FROM projects p
      LEFT JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN users u ON p.manager_id = u.id
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id AND om.user_id = $1
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      WHERE p.id = $2
        AND (p.manager_id = $1 OR om.user_id = $1 OR pm.user_id = $1)
    `, [userId, projectId]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      priority: row.priority,
      projectType: row.project_type,
      organizationName: row.organization_name,
      managerName: row.manager_name,
      memberCount: parseInt(row.member_count) || 0,
      taskCount: parseInt(row.task_count) || 0,
      completedTaskCount: parseInt(row.completed_task_count) || 0,
      assetCount: parseInt(row.asset_count) || 0,
      startDate: row.start_date,
      dueDate: row.due_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('[AgentService] getProject error:', error);
    return null;
  }
}

/**
 * List assets for a project or organization
 */
async function listAssets(userId, projectId, options = {}) {
  const { limit = 20, offset = 0, kind } = options;

  try {
    // First get the organization for this project
    const projectResult = await query(`
      SELECT organization_id FROM projects WHERE id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) return [];

    const orgId = projectResult.rows[0].organization_id;

    let sql = `
      SELECT a.id, a.name, a.kind, a.description, a.status,
             a.created_at, a.updated_at, a.tags,
             f.file_url, f.thumbnail_url, f.mime_type, f.size,
             u.name as owner_name
      FROM assets a
      LEFT JOIN files f ON a.primary_file_id = f.id
      LEFT JOIN users u ON a.owner_id = u.id
      WHERE a.organization_id = $1
        AND a.status = 'active'
    `;

    const params = [orgId];
    let paramIndex = 2;

    if (kind) {
      sql += ` AND a.kind = $${paramIndex}`;
      params.push(kind);
      paramIndex++;
    }

    sql += ` ORDER BY a.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      description: row.description,
      status: row.status,
      tags: row.tags || [],
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      mimeType: row.mime_type,
      size: row.size,
      ownerName: row.owner_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('[AgentService] listAssets error:', error);
    return [];
  }
}

/**
 * Get activity feed - recent notifications and changes
 */
async function getActivityFeed(userId, options = {}) {
  const { limit = 30, offset = 0, projectId, since } = options;

  try {
    let sql = `
      SELECT n.id, n.type, n.title, n.message, n.entity_id, n.entity_type,
             n.read, n.created_at, n.metadata
      FROM notifications n
      WHERE n.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (projectId) {
      sql += ` AND (n.metadata->>'projectId' = $${paramIndex} OR n.entity_id = $${paramIndex})`;
      params.push(projectId);
      paramIndex++;
    }

    if (since) {
      sql += ` AND n.created_at > $${paramIndex}`;
      params.push(since);
      paramIndex++;
    }

    sql += ` ORDER BY n.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    return result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      entityId: row.entity_id,
      entityType: row.entity_type,
      read: row.read,
      createdAt: row.created_at,
      metadata: row.metadata || {},
    }));
  } catch (error) {
    console.error('[AgentService] getActivityFeed error:', error);
    return [];
  }
}

/**
 * Get changes since a timestamp
 */
async function whatChanged(userId, since) {
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Get project updates
    const projectsResult = await query(`
      SELECT p.id, p.name, p.status, p.updated_at, 'project' as entity_type
      FROM projects p
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id AND om.user_id = $1
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      WHERE (p.manager_id = $1 OR om.user_id = $1 OR pm.user_id = $1)
        AND p.updated_at > $2
      ORDER BY p.updated_at DESC
      LIMIT 20
    `, [userId, sinceDate]);

    // Get new messages
    const messagesResult = await query(`
      SELECT m.id, c.name as conversation_name, m.created_at, 'message' as entity_type
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
      WHERE m.created_at > $2
        AND m.author_id != $1
      ORDER BY m.created_at DESC
      LIMIT 30
    `, [userId, sinceDate]);

    // Get new assets
    const assetsResult = await query(`
      SELECT a.id, a.name, a.kind, a.created_at, 'asset' as entity_type
      FROM assets a
      JOIN organizations o ON a.organization_id = o.id
      JOIN organization_members om ON o.id = om.organization_id AND om.user_id = $1
      WHERE a.created_at > $2
      ORDER BY a.created_at DESC
      LIMIT 20
    `, [userId, sinceDate]);

    // Get notifications
    const notificationsResult = await query(`
      SELECT id, type, title, created_at, 'notification' as entity_type
      FROM notifications
      WHERE user_id = $1 AND created_at > $2
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId, sinceDate]);

    return {
      since: sinceDate.toISOString(),
      summary: {
        projectUpdates: projectsResult.rows.length,
        newMessages: messagesResult.rows.length,
        newAssets: assetsResult.rows.length,
        notifications: notificationsResult.rows.length,
      },
      changes: {
        projects: projectsResult.rows,
        messages: messagesResult.rows.map(r => ({
          id: r.id,
          conversationName: r.conversation_name,
          createdAt: r.created_at,
        })),
        assets: assetsResult.rows,
        notifications: notificationsResult.rows,
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
 * Generate AI summary of recent changes for a project
 */
async function summarizeRecentChanges(userId, projectId) {
  try {
    const project = await getProject(userId, projectId);
    if (!project) {
      return { error: 'Project not found or access denied' };
    }

    // Get recent activity for this project
    const activity = await getActivityFeed(userId, { projectId, limit: 20 });

    // Build context for AI
    const contextText = `
Project: ${project.name}
Status: ${project.status}
Tasks: ${project.completedTaskCount}/${project.taskCount} completed
Team Size: ${project.memberCount} members

Recent Activity (${activity.length} items):
${activity.map(a => `- ${a.title}: ${a.message}`).join('\n')}
    `.trim();

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      system: 'You are a helpful project assistant. Summarize the recent project activity concisely, highlighting key updates and any items that need attention. Be direct and actionable.',
      messages: [{ role: 'user', content: `Summarize the recent changes for this project:\n\n${contextText}` }],
    });

    return {
      project: project.name,
      summary: response.content[0]?.text || 'No summary available',
      activityCount: activity.length,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AgentService] summarizeRecentChanges error:', error);
    return { error: 'Failed to generate summary' };
  }
}

/**
 * Generate daily brief across all projects
 */
async function generateDailyBrief(userId) {
  try {
    // Get changes from last 24 hours
    const changes = await whatChanged(userId, new Date(Date.now() - 24 * 60 * 60 * 1000));

    // Get user's active projects
    const projectsResult = await query(`
      SELECT DISTINCT p.id, p.name, p.status, p.priority,
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'pending') as pending_tasks
      FROM projects p
      LEFT JOIN organization_members om ON p.organization_id = om.organization_id AND om.user_id = $1
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
      WHERE (p.manager_id = $1 OR om.user_id = $1 OR pm.user_id = $1)
        AND p.status NOT IN ('completed', 'archived')
      ORDER BY p.priority DESC, p.updated_at DESC
      LIMIT 10
    `, [userId]);

    const activeProjects = projectsResult.rows;

    // Build context for AI
    const contextText = `
Last 24 Hours Summary:
- ${changes.summary.projectUpdates} project updates
- ${changes.summary.newMessages} new messages
- ${changes.summary.newAssets} new assets
- ${changes.summary.notifications} notifications

Active Projects (${activeProjects.length}):
${activeProjects.map(p => `- ${p.name} (${p.status}) - ${p.pending_tasks} pending tasks`).join('\n')}

Recent Project Updates:
${changes.changes.projects.slice(0, 5).map(p => `- ${p.name}: updated at ${new Date(p.updated_at).toLocaleString()}`).join('\n') || 'No recent updates'}
    `.trim();

    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 600,
      system: 'You are a helpful project assistant providing a daily brief. Be concise and actionable. Highlight priorities and items needing attention. Use bullet points.',
      messages: [{ role: 'user', content: `Generate a daily brief based on this activity:\n\n${contextText}` }],
    });

    return {
      brief: response.content[0]?.text || 'No brief available',
      stats: changes.summary,
      activeProjectCount: activeProjects.length,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[AgentService] generateDailyBrief error:', error);
    return { error: 'Failed to generate daily brief' };
  }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new agent session
 */
async function createSession(userId, projectId = null) {
  const id = generateCuid();

  try {
    await query(`
      INSERT INTO agent_sessions (id, user_id, project_id, context, messages, created_at, last_active_at)
      VALUES ($1, $2, $3, '{}', '[]', NOW(), NOW())
    `, [id, userId, projectId]);

    return { id, userId, projectId, createdAt: new Date().toISOString() };
  } catch (error) {
    console.error('[AgentService] createSession error:', error);
    throw error;
  }
}

/**
 * Get session by ID
 */
async function getSession(sessionId, userId) {
  try {
    const result = await query(`
      SELECT * FROM agent_sessions WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);

    if (result.rows.length === 0) return null;
    return result.rows[0];
  } catch (error) {
    console.error('[AgentService] getSession error:', error);
    return null;
  }
}

/**
 * Update session messages
 */
async function updateSessionMessages(sessionId, messages) {
  try {
    await query(`
      UPDATE agent_sessions
      SET messages = $2, last_active_at = NOW()
      WHERE id = $1
    `, [sessionId, JSON.stringify(messages)]);
  } catch (error) {
    console.error('[AgentService] updateSessionMessages error:', error);
    throw error;
  }
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Log an agent action
 */
async function logAction(sessionId, userId, action, skill, input, output, latencyMs, status = 'success', errorMessage = null) {
  try {
    await query(`
      INSERT INTO agent_audit_log (session_id, user_id, action, skill, input, output, latency_ms, status, error_message, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [sessionId, userId, action, skill, JSON.stringify(input), JSON.stringify(output), latencyMs, status, errorMessage]);
  } catch (error) {
    console.error('[AgentService] logAction error:', error);
  }
}

// ============================================================================
// Pending Actions
// ============================================================================

/**
 * Create a pending action requiring user approval
 */
async function createPendingAction(sessionId, userId, actionType, targetType, targetId, payload, preview) {
  const id = generateCuid();

  try {
    await query(`
      INSERT INTO agent_pending_actions (id, session_id, user_id, action_type, target_type, target_id, payload, preview, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
    `, [id, sessionId, userId, actionType, targetType, targetId, JSON.stringify(payload), preview]);

    return { id, actionType, targetType, targetId, payload, preview, status: 'pending' };
  } catch (error) {
    console.error('[AgentService] createPendingAction error:', error);
    throw error;
  }
}

/**
 * Get pending actions for a user
 */
async function getPendingActions(userId, options = {}) {
  const { status = 'pending', limit = 20 } = options;

  try {
    const result = await query(`
      SELECT * FROM agent_pending_actions
      WHERE user_id = $1 AND status = $2
      ORDER BY created_at DESC
      LIMIT $3
    `, [userId, status, limit]);

    return result.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      actionType: row.action_type,
      targetType: row.target_type,
      targetId: row.target_id,
      payload: row.payload,
      preview: row.preview,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('[AgentService] getPendingActions error:', error);
    return [];
  }
}

/**
 * Resolve a pending action (approve or reject)
 */
async function resolvePendingAction(actionId, userId, approved) {
  const status = approved ? 'approved' : 'rejected';

  try {
    const result = await query(`
      UPDATE agent_pending_actions
      SET status = $1, resolved_at = NOW(), resolved_by = $2
      WHERE id = $3 AND user_id = $2 AND status = 'pending'
      RETURNING *
    `, [status, userId, actionId]);

    if (result.rows.length === 0) {
      return { error: 'Action not found or already resolved' };
    }

    return { success: true, status, action: result.rows[0] };
  } catch (error) {
    console.error('[AgentService] resolvePendingAction error:', error);
    throw error;
  }
}

// ============================================================================
// Chat with Tool Calling
// ============================================================================

/**
 * Process a chat message with tool calling capability
 */
async function chat(sessionId, userId, message, context = {}) {
  const startTime = Date.now();

  try {
    // Get or validate session
    let session = await getSession(sessionId, userId);
    if (!session) {
      session = await createSession(userId, context.projectId);
    }

    // Build tools for the agent
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
            kind: { type: 'string', description: 'Asset type filter (image, video, audio, document, etc.)' },
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
            limit: { type: 'number', description: 'Maximum number of items' },
          },
        },
      },
      {
        name: 'what_changed',
        description: 'Get changes since a specific time',
        input_schema: {
          type: 'object',
          properties: {
            since: { type: 'string', description: 'ISO timestamp to check changes from' },
          },
        },
      },
      {
        name: 'daily_brief',
        description: 'Generate a daily brief summarizing all project activity',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
    ];

    // Build messages array
    const messages = session.messages || [];
    messages.push({ role: 'user', content: message });

    // System prompt
    const systemPrompt = `You are FluxStudio's AI assistant. You help users manage their creative projects, track progress, and stay organized.

You have access to tools to search projects, view assets, check activity, and generate summaries. Use these tools to answer user questions accurately.

Be concise and helpful. When showing lists, format them nicely. When summarizing, highlight key points.

Current context:
- User is working in FluxStudio
${context.projectId ? `- Currently viewing project: ${context.projectId}` : ''}
`;

    // Call Anthropic with tools
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages: messages.slice(-20), // Limit context
    });

    // Process tool calls if any
    let finalResponse = response;
    const toolResults = [];

    while (finalResponse.stop_reason === 'tool_use') {
      const toolUseBlocks = finalResponse.content.filter(block => block.type === 'tool_use');

      for (const toolUse of toolUseBlocks) {
        const toolResult = await executeToolCall(userId, toolUse.name, toolUse.input);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Continue conversation with tool results
      const continueMessages = [
        ...messages.slice(-20),
        { role: 'assistant', content: finalResponse.content },
        { role: 'user', content: toolResults },
      ];

      finalResponse = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages: continueMessages,
      });
    }

    // Extract text response
    const textContent = finalResponse.content.find(block => block.type === 'text');
    const responseText = textContent?.text || '';

    // Update session with new messages
    messages.push({ role: 'assistant', content: responseText });
    await updateSessionMessages(sessionId || session.id, messages);

    // Log the action
    const latencyMs = Date.now() - startTime;
    await logAction(session.id, userId, 'chat', null, { message }, { response: responseText }, latencyMs);

    return {
      sessionId: session.id,
      response: responseText,
      toolsUsed: toolResults.length > 0,
      latencyMs,
    };
  } catch (error) {
    console.error('[AgentService] chat error:', error);
    throw error;
  }
}

/**
 * Execute a tool call
 */
async function executeToolCall(userId, toolName, input) {
  switch (toolName) {
    case 'search_projects':
      return await searchProjects(userId, input.query);

    case 'get_project':
      return await getProject(userId, input.projectId);

    case 'list_assets':
      return await listAssets(userId, input.projectId, { kind: input.kind });

    case 'get_activity':
      return await getActivityFeed(userId, { projectId: input.projectId, limit: input.limit || 20 });

    case 'what_changed':
      return await whatChanged(userId, input.since);

    case 'daily_brief':
      return await generateDailyBrief(userId);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

module.exports = {
  // Core functions
  searchProjects,
  getProject,
  listAssets,
  getActivityFeed,
  whatChanged,
  summarizeRecentChanges,
  generateDailyBrief,

  // Session management
  createSession,
  getSession,
  updateSessionMessages,

  // Audit logging
  logAction,

  // Pending actions
  createPendingAction,
  getPendingActions,
  resolvePendingAction,

  // Chat
  chat,
  executeToolCall,
};
