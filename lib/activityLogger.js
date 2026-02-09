/**
 * Activity Logger Service
 * Logs user activities for the activity feed
 * FluxStudio User Adoption Roadmap - Phase 3
 */

const { query, generateCuid } = require('../database/config');

/**
 * Activity types for categorization
 */
const ActivityTypes = {
  FILE: 'file',
  TASK: 'task',
  COMMENT: 'comment',
  PROJECT: 'project',
  MEMBER: 'member',
  MILESTONE: 'milestone',
  MESSAGE: 'message',
  FORMATION: 'formation',
  BOARD: 'board'
};

/**
 * Action types for activities
 */
const ActionTypes = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  UPLOADED: 'uploaded',
  COMPLETED: 'completed',
  JOINED: 'joined',
  LEFT: 'left',
  COMMENTED: 'commented',
  ASSIGNED: 'assigned',
  SHARED: 'shared'
};

/**
 * Log an activity to the database
 * @param {Object} params Activity parameters
 * @param {string} params.projectId - Project ID (optional)
 * @param {string} params.organizationId - Organization ID (optional)
 * @param {string} params.userId - User who performed the action
 * @param {string} params.type - Activity type (file, task, comment, etc.)
 * @param {string} params.action - Action performed (created, updated, deleted, etc.)
 * @param {string} params.entityType - Type of entity being acted upon
 * @param {string} params.entityId - ID of the entity
 * @param {string} params.entityTitle - Human-readable title
 * @param {string} params.description - Full description (optional, auto-generated if not provided)
 * @param {Object} params.metadata - Additional context (optional)
 */
async function log({
  projectId,
  organizationId,
  userId,
  type,
  action,
  entityType,
  entityId,
  entityTitle,
  description,
  metadata = {}
}) {
  try {
    // Validate required fields
    if (!userId) {
      console.warn('Activity log skipped: userId is required');
      return null;
    }

    if (!type || !action) {
      console.warn('Activity log skipped: type and action are required');
      return null;
    }

    // Auto-generate description if not provided
    const generatedDescription = description || generateDescription({
      action,
      entityType,
      entityTitle
    });

    const id = generateCuid();

    const result = await query(`
      INSERT INTO activities (
        id, project_id, organization_id, user_id, type, action,
        entity_type, entity_id, entity_title, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      id,
      projectId || null,
      organizationId || null,
      userId,
      type,
      action,
      entityType || null,
      entityId || null,
      entityTitle || null,
      generatedDescription,
      JSON.stringify(metadata)
    ]);

    return result.rows[0];
  } catch (error) {
    // Don't throw - activity logging should never break the main flow
    console.error('Error logging activity:', error);
    return null;
  }
}

/**
 * Generate a human-readable description for an activity
 */
function generateDescription({ action, entityType, entityTitle }) {
  const title = entityTitle || entityType || 'item';

  switch (action) {
    case ActionTypes.CREATED:
      return `Created ${title}`;
    case ActionTypes.UPDATED:
      return `Updated ${title}`;
    case ActionTypes.DELETED:
      return `Deleted ${title}`;
    case ActionTypes.UPLOADED:
      return `Uploaded ${title}`;
    case ActionTypes.COMPLETED:
      return `Completed ${title}`;
    case ActionTypes.JOINED:
      return `Joined ${title}`;
    case ActionTypes.LEFT:
      return `Left ${title}`;
    case ActionTypes.COMMENTED:
      return `Commented on ${title}`;
    case ActionTypes.ASSIGNED:
      return `Assigned ${title}`;
    case ActionTypes.SHARED:
      return `Shared ${title}`;
    default:
      return `${action} ${title}`;
  }
}

/**
 * Get recent activities for a project
 * @param {string} projectId - Project ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of activities to return (default: 20)
 * @param {number} options.offset - Offset for pagination (default: 0)
 */
async function getProjectActivities(projectId, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    const result = await query(`
      SELECT
        a.*,
        u.name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.project_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `, [projectId, limit, offset]);

    return result.rows.map(transformActivity);
  } catch (error) {
    console.error('Error getting project activities:', error);
    return [];
  }
}

/**
 * Get recent activities for a user (across all their projects)
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 */
async function getUserActivities(userId, options = {}) {
  try {
    const { limit = 20, offset = 0, includeOwn = true } = options;

    // Get activities from projects the user has access to
    let sql = `
      SELECT DISTINCT
        a.*,
        u.name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar,
        p.name as project_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      LEFT JOIN project_members pm ON a.project_id = pm.project_id
      WHERE (
        pm.user_id = $1
        OR a.user_id = $1
        OR p.manager_id = $1
      )
    `;

    if (!includeOwn) {
      sql += ` AND a.user_id != $1`;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`;

    const result = await query(sql, [userId, limit, offset]);

    return result.rows.map(row => ({
      ...transformActivity(row),
      projectName: row.project_name
    }));
  } catch (error) {
    console.error('Error getting user activities:', error);
    return [];
  }
}

/**
 * Get recent activities for an organization
 * @param {string} organizationId - Organization ID
 * @param {Object} options - Query options
 */
async function getOrganizationActivities(organizationId, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    const result = await query(`
      SELECT
        a.*,
        u.name as user_name,
        u.email as user_email,
        u.avatar_url as user_avatar,
        p.name as project_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.organization_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `, [organizationId, limit, offset]);

    return result.rows.map(row => ({
      ...transformActivity(row),
      projectName: row.project_name
    }));
  } catch (error) {
    console.error('Error getting organization activities:', error);
    return [];
  }
}

/**
 * Transform database row to frontend format
 */
function transformActivity(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    organizationId: row.organization_id,
    type: row.type,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityTitle: row.entity_title,
    description: row.description,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    user: row.user_id ? {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      avatar: row.user_avatar
    } : null
  };
}

/**
 * Helper functions for common activity logging
 */
const logHelpers = {
  // Project activities
  projectCreated: (userId, project) => log({
    projectId: project.id,
    organizationId: project.organizationId,
    userId,
    type: ActivityTypes.PROJECT,
    action: ActionTypes.CREATED,
    entityType: 'project',
    entityId: project.id,
    entityTitle: project.name,
    description: `Created project "${project.name}"`
  }),

  projectUpdated: (userId, project, changes) => log({
    projectId: project.id,
    organizationId: project.organizationId,
    userId,
    type: ActivityTypes.PROJECT,
    action: ActionTypes.UPDATED,
    entityType: 'project',
    entityId: project.id,
    entityTitle: project.name,
    metadata: { changes }
  }),

  // File activities
  fileUploaded: (userId, projectId, file) => log({
    projectId,
    userId,
    type: ActivityTypes.FILE,
    action: ActionTypes.UPLOADED,
    entityType: 'file',
    entityId: file.id,
    entityTitle: file.name,
    description: `Uploaded ${file.name}`,
    metadata: {
      fileSize: file.size,
      mimeType: file.mimeType,
      count: 1
    }
  }),

  filesUploaded: (userId, projectId, files) => log({
    projectId,
    userId,
    type: ActivityTypes.FILE,
    action: ActionTypes.UPLOADED,
    entityType: 'file',
    entityTitle: `${files.length} files`,
    description: `Uploaded ${files.length} files`,
    metadata: {
      count: files.length,
      files: files.map(f => ({ id: f.id, name: f.name }))
    }
  }),

  fileDeleted: (userId, projectId, file) => log({
    projectId,
    userId,
    type: ActivityTypes.FILE,
    action: ActionTypes.DELETED,
    entityType: 'file',
    entityId: file.id,
    entityTitle: file.name
  }),

  // Task activities
  taskCreated: (userId, projectId, task) => log({
    projectId,
    userId,
    type: ActivityTypes.TASK,
    action: ActionTypes.CREATED,
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
    description: `Created task "${task.title}"`
  }),

  taskCompleted: (userId, projectId, task) => log({
    projectId,
    userId,
    type: ActivityTypes.TASK,
    action: ActionTypes.COMPLETED,
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
    description: `Completed task "${task.title}"`
  }),

  taskAssigned: (userId, projectId, task, assigneeId) => log({
    projectId,
    userId,
    type: ActivityTypes.TASK,
    action: ActionTypes.ASSIGNED,
    entityType: 'task',
    entityId: task.id,
    entityTitle: task.title,
    metadata: { assigneeId }
  }),

  // Member activities
  memberJoined: (userId, projectId, member) => log({
    projectId,
    userId: member.userId,
    type: ActivityTypes.MEMBER,
    action: ActionTypes.JOINED,
    entityType: 'project',
    entityId: projectId,
    entityTitle: member.name,
    description: `${member.name} joined the project`
  }),

  memberLeft: (userId, projectId, member) => log({
    projectId,
    userId: member.userId,
    type: ActivityTypes.MEMBER,
    action: ActionTypes.LEFT,
    entityType: 'project',
    entityId: projectId,
    entityTitle: member.name,
    description: `${member.name} left the project`
  }),

  // Comment activities
  commentAdded: (userId, projectId, comment, parentType, parentTitle) => log({
    projectId,
    userId,
    type: ActivityTypes.COMMENT,
    action: ActionTypes.COMMENTED,
    entityType: parentType,
    entityId: comment.parentId,
    entityTitle: parentTitle,
    description: `Commented on ${parentTitle}`,
    metadata: { commentId: comment.id }
  }),

  // Message activities
  messageSent: (userId, projectId, conversationId) => log({
    projectId,
    userId,
    type: ActivityTypes.MESSAGE,
    action: ActionTypes.CREATED,
    entityType: 'conversation',
    entityId: conversationId,
    description: 'Sent a message'
  }),

  // Formation activities
  formationCreated: (userId, projectId, formation) => log({
    projectId,
    userId,
    type: ActivityTypes.FORMATION,
    action: ActionTypes.CREATED,
    entityType: 'formation',
    entityId: formation.id,
    entityTitle: formation.name,
    description: `Created formation "${formation.name}"`
  }),

  formationUpdated: (userId, projectId, formation) => log({
    projectId,
    userId,
    type: ActivityTypes.FORMATION,
    action: ActionTypes.UPDATED,
    entityType: 'formation',
    entityId: formation.id,
    entityTitle: formation.name
  })
};

module.exports = {
  log,
  getProjectActivities,
  getUserActivities,
  getOrganizationActivities,
  ActivityTypes,
  ActionTypes,
  ...logHelpers
};
