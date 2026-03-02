/**
 * Projects Routes - Project Management API
 *
 * Provides endpoints for:
 * - Project CRUD operations
 * - Project members management
 * - Project activity feeds
 * - Project conversations
 * - Project counts for tab badges
 *
 * All endpoints require authentication.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../lib/logger');
const log = createLogger('Projects');
const { authenticateToken } = require('../lib/auth/middleware');
const { validateInput } = require('../middleware/security');
const { zodValidate } = require('../middleware/zodValidate');
const { createProjectSchema, updateProjectSchema, addProjectMemberSchema, updateProjectMemberRoleSchema } = require('../lib/schemas');
const { query } = require('../database/config');
const { ingestEvent } = require('../lib/analytics/funnelTracker');

const router = express.Router();

// File-based storage paths (fallback)
const PROJECTS_FILE = path.join(__dirname, '..', 'projects.json');

// Try to load database adapter
let projectsAdapter = null;
try {
  projectsAdapter = require('../database/projects-adapter');
} catch (error) {
  log.warn('Projects adapter not available, using file-based storage');
}

// Activity logger for tracking user actions
let activityLogger = null;
try {
  activityLogger = require('../lib/activityLogger');
} catch (error) {
  log.warn('Activity logger not available');
}

// Audit logger (Sprint 41: Enterprise & Compliance)
const { logAction } = require('../lib/auditLog');

// Helper functions
function uuidv4() {
  return crypto.randomUUID();
}

async function getProjectsFromFile() {
  try {
    const data = fs.readFileSync(PROJECTS_FILE, 'utf8');
    return JSON.parse(data).projects || [];
  } catch (error) {
    return [];
  }
}

async function saveProjectsToFile(projects) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify({ projects }, null, 2));
}

/**
 * GET /api/projects
 * Get all projects for the authenticated user
 *
 * Performance optimization: Uses batch query for unread counts
 * instead of N+1 pattern (one query per project)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { organizationId, status, limit = 50, offset = 0 } = req.query;
    const userId = req.user.id;

    let projects = [];

    if (projectsAdapter) {
      projects = await projectsAdapter.getProjects(userId, {
        organizationId,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Optimization: Batch fetch unread counts in a single query
      // instead of N+1 pattern (one query per project)
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);

        // Use batch query for unread counts - single DB call
        if (projectsAdapter.getProjectsUnreadCounts) {
          // Preferred: adapter has batch method
          const unreadCounts = await projectsAdapter.getProjectsUnreadCounts(projectIds, userId);
          projects = projects.map(project => ({
            ...project,
            unreadCount: unreadCounts[project.id] || 0
          }));
        } else {
          // Fallback: Use raw query for batch fetch
          try {
            const unreadResult = await query(`
              SELECT
                c.project_id,
                COUNT(m.id) as unread_count
              FROM conversations c
              LEFT JOIN messages m ON m.conversation_id = c.id
                AND m.sender_id != $1
                AND m.read_at IS NULL
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
            // If batch query fails, fall back to N+1 (slower but works)
            log.warn('Batch unread query failed, falling back to N+1', batchError.message);
            const projectsWithUnread = await Promise.all(
              projects.map(async (project) => {
                const unreadCount = await projectsAdapter.getProjectUnreadCount(project.id, userId);
                return { ...project, unreadCount };
              })
            );
            projects = projectsWithUnread;
          }
        }
      }
    } else {
      // Fallback to file-based storage
      const allProjects = await getProjectsFromFile();
      projects = allProjects.filter(p =>
        !organizationId || p.organizationId === organizationId
      ).map(p => ({
        ...p,
        unreadCount: 0,
        progress: 0,
        memberCount: p.members?.length || 0
      }));
    }

    res.json({ success: true, projects, total: projects.length });
  } catch (error) {
    log.error('Get projects error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects', code: 'PROJECTS_FETCH_FAILED' });
  }
});

/**
 * GET /api/projects/:projectId
 * Get a single project by ID
 *
 * Performance optimization: Fetches project, unread count, and members
 * in parallel using Promise.all instead of sequential queries
 */
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    let project = null;

    if (projectsAdapter) {
      // First get the project to verify it exists
      project = await projectsAdapter.getProjectById(projectId, userId);

      if (project) {
        // Optimization: Fetch unread count and members in parallel
        const [unreadCount, members] = await Promise.all([
          projectsAdapter.getProjectUnreadCount(projectId, userId),
          projectsAdapter.getProjectMembers(projectId)
        ]);

        project = { ...project, unreadCount, members };
      }
    } else {
      const allProjects = await getProjectsFromFile();
      project = allProjects.find(p => p.id === projectId);
    }

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
    }

    res.json({ success: true, project });
  } catch (error) {
    log.error('Get project error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project', code: 'PROJECT_FETCH_FAILED' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
// Quota check middleware (Sprint 38)
let checkProjectQuota = (_req, _res, next) => next();
try {
  const { checkQuota } = require('../middleware/quotaCheck');
  checkProjectQuota = checkQuota('projects');
} catch { /* quotaCheck may not be available yet */ }

router.post('/', authenticateToken, validateInput.sanitizeInput, checkProjectQuota, zodValidate(createProjectSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, description, organizationId, teamId, startDate, dueDate,
      priority, projectType, serviceCategory, serviceTier, ensembleType,
      tags, settings, members, templateId, templateVariables
    } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Project name must be at least 3 characters', code: 'INVALID_PROJECT_NAME' });
    }

    let newProject;

    if (projectsAdapter) {
      newProject = await projectsAdapter.createProject({
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

      // If created from a template, store the template reference
      if (templateId) {
        try {
          await query(
            'UPDATE projects SET template_id = $1, metadata = COALESCE(metadata, \'{}\'::jsonb) || $2::jsonb WHERE id = $3',
            [templateId, JSON.stringify({ templateVariables: templateVariables || {} }), newProject.id]
          );
        } catch (tmplErr) {
          log.warn('Could not store template reference', tmplErr.message);
        }
      }

      // Add additional members if specified
      if (members && Array.isArray(members)) {
        for (const memberId of members) {
          await projectsAdapter.addProjectMember(newProject.id, memberId, 'contributor');
        }
      }

      // Create default project conversation
      await projectsAdapter.getOrCreateProjectConversation(newProject.id, userId);

      // Log activity
      if (activityLogger) {
        await activityLogger.projectCreated(userId, newProject);
      }
    } else {
      // Fallback to file-based storage
      const projects = await getProjectsFromFile();
      newProject = {
        id: uuidv4(),
        name,
        description: description || '',
        status: 'planning',
        priority: priority || 'medium',
        organizationId,
        teamId,
        createdBy: userId,
        startDate: startDate || new Date().toISOString(),
        dueDate,
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [userId, ...(members || [])],
        tasks: [],
        milestones: [],
        files: [],
        settings: settings || { isPrivate: false, allowComments: true, requireApproval: false }
      };
      projects.push(newProject);
      await saveProjectsToFile(projects);
    }

    logAction(req.user.id, 'create', 'project', newProject.id, { name }, req);

    // Sprint 44: Track first project creation funnel event
    ingestEvent(req.user.id, 'first_project_created', {
      projectId: newProject.id,
    }, { ipAddress: req.ip, userAgent: req.get('user-agent') }).catch(() => {});

    // Sprint 44: Mark referral as converted when user creates first project
    query(
      `UPDATE referral_signups SET converted = TRUE, converted_at = NOW()
       WHERE referred_user_id = $1 AND converted = FALSE`,
      [req.user.id]
    ).catch(() => {});

    res.status(201).json({ success: true, project: newProject });
  } catch (error) {
    log.error('Create project error', error);
    res.status(500).json({ success: false, error: 'Failed to create project', code: 'PROJECT_CREATE_FAILED' });
  }
});

/**
 * PUT /api/projects/:projectId
 * Update a project
 */
router.put('/:projectId', authenticateToken, validateInput.sanitizeInput, zodValidate(updateProjectSchema), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    let updatedProject;

    if (projectsAdapter) {
      updatedProject = await projectsAdapter.updateProject(projectId, updates, userId);

      // Log activity
      if (activityLogger && updatedProject) {
        await activityLogger.projectUpdated(userId, updatedProject, updates);
      }
    } else {
      const projects = await getProjectsFromFile();
      const index = projects.findIndex(p => p.id === projectId);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
      }
      projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
      await saveProjectsToFile(projects);
      updatedProject = projects[index];
    }

    if (!updatedProject) {
      return res.status(404).json({ success: false, error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
    }

    res.json({ success: true, project: updatedProject });
  } catch (error) {
    log.error('Update project error', error);
    res.status(500).json({ success: false, error: 'Failed to update project', code: 'PROJECT_UPDATE_FAILED' });
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete a project
 */
router.delete('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    if (projectsAdapter) {
      await projectsAdapter.deleteProject(projectId, userId);
    } else {
      const projects = await getProjectsFromFile();
      const index = projects.findIndex(p => p.id === projectId);
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
      }
      projects.splice(index, 1);
      await saveProjectsToFile(projects);
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    log.error('Delete project error', error);
    res.status(500).json({ success: false, error: 'Failed to delete project', code: 'PROJECT_DELETE_FAILED' });
  }
});

/**
 * GET /api/projects/:projectId/activity
 * Get project activity/events
 */
router.get('/:projectId/activity', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    let activity = [];

    if (projectsAdapter) {
      activity = await projectsAdapter.getProjectActivity(projectId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }

    res.json({ success: true, activity, total: activity.length });
  } catch (error) {
    log.error('Get project activity error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project activity', code: 'PROJECT_ACTIVITY_FETCH_FAILED' });
  }
});

/**
 * GET /api/projects/:projectId/conversation
 * Get or create project conversation
 */
router.get('/:projectId/conversation', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    if (!projectsAdapter) {
      return res.status(501).json({ success: false, error: 'Requires database mode', code: 'DATABASE_REQUIRED' });
    }

    const conversation = await projectsAdapter.getOrCreateProjectConversation(projectId, userId);

    res.json({ success: true, conversation });
  } catch (error) {
    log.error('Get project conversation error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project conversation', code: 'PROJECT_CONVERSATION_FETCH_FAILED' });
  }
});

/**
 * GET /api/projects/:projectId/members
 * Get project members
 */
router.get('/:projectId/members', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    let members = [];

    if (projectsAdapter) {
      members = await projectsAdapter.getProjectMembers(projectId);
    }

    res.json({ success: true, members, total: members.length });
  } catch (error) {
    log.error('Get project members error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project members', code: 'PROJECT_MEMBERS_FETCH_FAILED' });
  }
});

/**
 * POST /api/projects/:projectId/members
 * Add member to project
 */
router.post('/:projectId/members', authenticateToken, validateInput.sanitizeInput, zodValidate(addProjectMemberSchema), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId: memberUserId, role = 'contributor' } = req.body;

    if (!memberUserId) {
      return res.status(400).json({ success: false, error: 'userId is required', code: 'USER_ID_REQUIRED' });
    }

    if (projectsAdapter) {
      await projectsAdapter.addProjectMember(projectId, memberUserId, role);
    }

    res.json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    log.error('Add project member error', error);
    res.status(500).json({ success: false, error: 'Failed to add project member', code: 'MEMBER_ADD_FAILED' });
  }
});

/**
 * DELETE /api/projects/:projectId/members/:userId
 * Remove member from project
 */
router.delete('/:projectId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { projectId, userId: memberUserId } = req.params;

    if (projectsAdapter) {
      await projectsAdapter.removeProjectMember(projectId, memberUserId);
    }

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    log.error('Remove project member error', error);
    res.status(500).json({ success: false, error: 'Failed to remove project member', code: 'MEMBER_REMOVE_FAILED' });
  }
});

/**
 * PUT /api/projects/:projectId/members/:userId
 * Update member role
 */
router.put('/:projectId/members/:userId', authenticateToken, validateInput.sanitizeInput, zodValidate(updateProjectMemberRoleSchema), async (req, res) => {
  try {
    const { projectId, userId: memberUserId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required', code: 'ROLE_REQUIRED' });
    }

    if (projectsAdapter) {
      await projectsAdapter.updateProjectMemberRole(projectId, memberUserId, role);
    }

    res.json({ success: true, message: 'Member role updated successfully' });
  } catch (error) {
    log.error('Update project member role error', error);
    res.status(500).json({ success: false, error: 'Failed to update member role', code: 'MEMBER_ROLE_UPDATE_FAILED' });
  }
});

/**
 * GET /api/projects/activities/recent
 * Get recent activities across all user's projects (for dashboard)
 */
router.get('/activities/recent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    let activities = [];

    if (activityLogger) {
      activities = await activityLogger.getUserActivities(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        includeOwn: true
      });
    }

    res.json({ success: true, activities, total: activities.length });
  } catch (error) {
    log.error('Get recent activities error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent activities', code: 'ACTIVITIES_FETCH_FAILED' });
  }
});

/**
 * GET /api/projects/:projectId/counts
 * Get project counts for tab badges
 */
router.get('/:projectId/counts', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Verify project membership
    if (projectsAdapter) {
      const project = await projectsAdapter.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
      }
      const members = await projectsAdapter.getProjectMembers(projectId);
      const isMember = members.some(m => m.userId === userId || m.user_id === userId);
      if (!isMember) {
        return res.status(403).json({ success: false, error: 'Not a project member', code: 'NOT_PROJECT_MEMBER' });
      }
    }

    // Get counts using database aggregations
    const [messagesResult, filesResult, assetsResult, boardsResult] = await Promise.all([
      query(`
        SELECT COUNT(*) as count FROM conversations
        WHERE project_id = $1 AND archived_at IS NULL
      `, [projectId]),
      query(`
        SELECT COUNT(*) as count FROM printing_files
        WHERE project_id = $1
      `, [projectId]),
      query(`
        SELECT COUNT(*) as count FROM assets
        WHERE project_id = $1 AND status = 'active'
      `, [projectId]),
      query(`
        SELECT COUNT(*) as count FROM design_boards
        WHERE project_id = $1 AND archived_at IS NULL
      `, [projectId])
    ]);

    res.json({
      success: true,
      counts: {
        messages: parseInt(messagesResult.rows[0]?.count || 0),
        files: parseInt(filesResult.rows[0]?.count || 0),
        assets: parseInt(assetsResult.rows[0]?.count || 0),
        boards: parseInt(boardsResult.rows[0]?.count || 0)
      }
    });
  } catch (error) {
    log.error('Get project counts error', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project counts', code: 'PROJECT_COUNTS_FETCH_FAILED' });
  }
});

module.exports = router;
