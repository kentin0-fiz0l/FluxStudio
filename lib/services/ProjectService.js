/**
 * ProjectService - Domain service for project operations
 *
 * Extracts business logic from route handlers into a testable,
 * reusable service layer. Accepts only primitives/plain objects,
 * handles validation and authorization, returns standardized results.
 */

const { createLogger } = require('../logger');
const log = createLogger('ProjectService');

// Lazy-load adapters to avoid circular dependencies
let projectsAdapter = null;
let activityLogger = null;
let dbQuery = null;

function getProjectsAdapter() {
  if (!projectsAdapter) {
    try {
      projectsAdapter = require('../../database/projects-adapter');
    } catch (e) {
      log.warn('Projects adapter not available');
    }
  }
  return projectsAdapter;
}

function getActivityLogger() {
  if (!activityLogger) {
    try {
      activityLogger = require('../activityLogger');
    } catch (e) {
      // Activity logger is optional
    }
  }
  return activityLogger;
}

function getQuery() {
  if (!dbQuery) {
    try {
      const { query } = require('../../database/config');
      dbQuery = query;
    } catch (e) {
      log.warn('Database query not available');
    }
  }
  return dbQuery;
}

/**
 * Create a new project
 * @param {string} userId - The ID of the user creating the project
 * @param {Object} data - Project data
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function createProject(userId, data) {
  try {
    const { name, description, organizationId, teamId, startDate, dueDate,
            priority, projectType, serviceCategory, serviceTier,
            ensembleType, tags, settings, members, templateId } = data;

    if (!name || name.trim().length < 3) {
      return { success: false, error: 'Project name must be at least 3 characters' };
    }

    const adapter = getProjectsAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const newProject = await adapter.createProject({
      name,
      description,
      organizationId,
      teamId,
      startDate,
      dueDate,
      priority: priority || 'medium',
      projectType: projectType || 'general',
      serviceCategory: serviceCategory || 'general',
      serviceTier: serviceTier || 'standard',
      ensembleType: ensembleType || 'general',
      tags,
      settings,
      templateId: templateId || null,
    }, userId);

    // Add additional members if specified
    if (members && Array.isArray(members)) {
      for (const memberId of members) {
        await adapter.addProjectMember(newProject.id, memberId, 'contributor');
      }
    }

    // Create default project conversation
    await adapter.getOrCreateProjectConversation(newProject.id, userId);

    // Log activity
    const logger = getActivityLogger();
    if (logger) {
      await logger.projectCreated(userId, newProject);
    }

    return { success: true, data: newProject };
  } catch (error) {
    log.error('Create project error', error);
    return { success: false, error: 'Failed to create project' };
  }
}

/**
 * Get a project by ID with authorization check
 * @param {string} projectId - Project ID
 * @param {string} userId - Requesting user ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function getProject(projectId, userId) {
  try {
    const adapter = getProjectsAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const project = await adapter.getProjectById(projectId, userId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    // Fetch unread count and members in parallel
    const [unreadCount, members] = await Promise.all([
      adapter.getProjectUnreadCount(projectId, userId),
      adapter.getProjectMembers(projectId)
    ]);

    return {
      success: true,
      data: { ...project, unreadCount, members }
    };
  } catch (error) {
    log.error('Get project error', error);
    return { success: false, error: 'Failed to fetch project' };
  }
}

/**
 * Update a project with authorization check
 * @param {string} projectId - Project ID
 * @param {string} userId - Requesting user ID
 * @param {Object} data - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
async function updateProject(projectId, userId, data) {
  try {
    const adapter = getProjectsAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    const updatedProject = await adapter.updateProject(projectId, data, userId);
    if (!updatedProject) {
      return { success: false, error: 'Project not found' };
    }

    // Log activity
    const logger = getActivityLogger();
    if (logger) {
      await logger.projectUpdated(userId, updatedProject, data);
    }

    return { success: true, data: updatedProject };
  } catch (error) {
    log.error('Update project error', error);
    return { success: false, error: 'Failed to update project' };
  }
}

/**
 * Soft-delete a project with authorization check
 * @param {string} projectId - Project ID
 * @param {string} userId - Requesting user ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteProject(projectId, userId) {
  try {
    const adapter = getProjectsAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    await adapter.deleteProject(projectId, userId);
    return { success: true };
  } catch (error) {
    log.error('Delete project error', error);
    return { success: false, error: 'Failed to delete project' };
  }
}

/**
 * List projects for a user with optional filters
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options (organizationId, status, limit, offset)
 * @returns {Promise<{success: boolean, data?: Object[], error?: string}>}
 */
async function listProjects(userId, filters = {}) {
  try {
    const { organizationId, status, limit = 50, offset = 0 } = filters;

    const adapter = getProjectsAdapter();
    if (!adapter) {
      return { success: false, error: 'Database not available' };
    }

    let projects = await adapter.getProjects(userId, {
      organizationId,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Batch fetch unread counts
    if (projects.length > 0) {
      const projectIds = projects.map(p => p.id);
      const query = getQuery();

      if (query) {
        try {
          const unreadResult = await query(`
            SELECT c.project_id, COUNT(m.id) as unread_count
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
              AND m.sender_id != $1 AND m.read_at IS NULL
            WHERE c.project_id = ANY($2::uuid[])
            GROUP BY c.project_id
          `, [userId, projectIds]);

          const unreadMap = {};
          unreadResult.rows.forEach(row => {
            unreadMap[row.project_id] = parseInt(row.unread_count || 0);
          });

          projects = projects.map(project => ({
            ...project,
            unreadCount: unreadMap[project.id] || 0
          }));
        } catch (batchError) {
          log.warn('Batch unread query failed', batchError.message);
        }
      }
    }

    return { success: true, data: projects };
  } catch (error) {
    log.error('List projects error', error);
    return { success: false, error: 'Failed to list projects' };
  }
}

module.exports = {
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjects,
};
