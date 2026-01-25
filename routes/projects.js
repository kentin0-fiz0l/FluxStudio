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
const { authenticateToken } = require('../lib/auth/middleware');
const { validateInput } = require('../middleware/security');
const { query } = require('../database/config');

const router = express.Router();

// File-based storage paths (fallback)
const PROJECTS_FILE = path.join(__dirname, '..', 'projects.json');

// Try to load database adapter
let projectsAdapter = null;
try {
  projectsAdapter = require('../database/projects-adapter');
} catch (error) {
  console.warn('Projects adapter not available, using file-based storage');
}

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

      // Fetch unread message counts for each project
      const projectsWithUnread = await Promise.all(
        projects.map(async (project) => {
          const unreadCount = await projectsAdapter.getProjectUnreadCount(project.id, userId);
          return { ...project, unreadCount };
        })
      );

      projects = projectsWithUnread;
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
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/projects/:projectId
 * Get a single project by ID
 */
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    let project = null;

    if (projectsAdapter) {
      project = await projectsAdapter.getProjectById(projectId, userId);
      if (project) {
        const unreadCount = await projectsAdapter.getProjectUnreadCount(projectId, userId);
        const members = await projectsAdapter.getProjectMembers(projectId);
        project = { ...project, unreadCount, members };
      }
    } else {
      const allProjects = await getProjectsFromFile();
      project = allProjects.find(p => p.id === projectId);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', authenticateToken, validateInput.sanitizeInput, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, description, organizationId, teamId, startDate, dueDate,
      priority, projectType, serviceCategory, serviceTier, ensembleType,
      tags, settings, members
    } = req.body;

    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Project name must be at least 3 characters' });
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
        settings
      }, userId);

      // Add additional members if specified
      if (members && Array.isArray(members)) {
        for (const memberId of members) {
          await projectsAdapter.addProjectMember(newProject.id, memberId, 'contributor');
        }
      }

      // Create default project conversation
      await projectsAdapter.getOrCreateProjectConversation(newProject.id, userId);
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

    res.status(201).json({ success: true, project: newProject });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * PUT /api/projects/:projectId
 * Update a project
 */
router.put('/:projectId', authenticateToken, validateInput.sanitizeInput, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    let updatedProject;

    if (projectsAdapter) {
      updatedProject = await projectsAdapter.updateProject(projectId, updates, userId);
    } else {
      const projects = await getProjectsFromFile();
      const index = projects.findIndex(p => p.id === projectId);
      if (index === -1) {
        return res.status(404).json({ error: 'Project not found' });
      }
      projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
      await saveProjectsToFile(projects);
      updatedProject = projects[index];
    }

    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
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
        return res.status(404).json({ error: 'Project not found' });
      }
      projects.splice(index, 1);
      await saveProjectsToFile(projects);
    }

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
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
    console.error('Get project activity error:', error);
    res.status(500).json({ error: 'Failed to fetch project activity' });
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
      return res.status(501).json({ error: 'Requires database mode' });
    }

    const conversation = await projectsAdapter.getOrCreateProjectConversation(projectId, userId);

    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Get project conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch project conversation' });
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
    console.error('Get project members error:', error);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
});

/**
 * POST /api/projects/:projectId/members
 * Add member to project
 */
router.post('/:projectId/members', authenticateToken, validateInput.sanitizeInput, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId: memberUserId, role = 'contributor' } = req.body;

    if (!memberUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (projectsAdapter) {
      await projectsAdapter.addProjectMember(projectId, memberUserId, role);
    }

    res.json({ success: true, message: 'Member added successfully' });
  } catch (error) {
    console.error('Add project member error:', error);
    res.status(500).json({ error: 'Failed to add project member' });
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
    console.error('Remove project member error:', error);
    res.status(500).json({ error: 'Failed to remove project member' });
  }
});

/**
 * PUT /api/projects/:projectId/members/:userId
 * Update member role
 */
router.put('/:projectId/members/:userId', authenticateToken, validateInput.sanitizeInput, async (req, res) => {
  try {
    const { projectId, userId: memberUserId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    if (projectsAdapter) {
      await projectsAdapter.updateProjectMemberRole(projectId, memberUserId, role);
    }

    res.json({ success: true, message: 'Member role updated successfully' });
  } catch (error) {
    console.error('Update project member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
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
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      const members = await projectsAdapter.getProjectMembers(projectId);
      const isMember = members.some(m => m.userId === userId || m.user_id === userId);
      if (!isMember) {
        return res.status(403).json({ success: false, error: 'Not a project member' });
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
    console.error('Get project counts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project counts' });
  }
});

module.exports = router;
