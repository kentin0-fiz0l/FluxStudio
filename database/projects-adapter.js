/**
 * Projects Database Adapter
 * Provides database operations for project management
 */

const { query, generateCuid } = require('./config');

class ProjectsAdapter {
  /**
   * Get all projects for a user (scoped by organization membership)
   */
  async getProjects(userId, options = {}) {
    try {
      const { organizationId, status, limit = 50, offset = 0 } = options;

      // Build query based on organization membership
      let sql = `
        SELECT DISTINCT p.*,
               o.name as organization_name,
               o.slug as organization_slug,
               u.name as manager_name,
               u.email as manager_email,
               t.name as team_name,
               (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
               (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id) as task_count,
               (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status = 'completed') as completed_task_count
        FROM projects p
        LEFT JOIN organizations o ON p.organization_id = o.id
        LEFT JOIN users u ON p.manager_id = u.id
        LEFT JOIN teams t ON p.team_id = t.id
        LEFT JOIN organization_members om ON p.organization_id = om.organization_id AND om.user_id = $1
        WHERE (
          p.manager_id = $1
          OR om.user_id = $1
          OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $1)
        )
      `;

      const params = [userId];
      let paramIndex = 2;

      if (organizationId) {
        sql += ` AND p.organization_id = $${paramIndex}`;
        params.push(organizationId);
        paramIndex++;
      }

      if (status && status !== 'all') {
        sql += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      sql += ` ORDER BY p.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows.map(this.transformProject);
    } catch (error) {
      console.error('Error getting projects:', error);
      return [];
    }
  }

  /**
   * Get a single project by ID
   */
  async getProjectById(projectId, userId) {
    try {
      const result = await query(`
        SELECT p.*,
               o.name as organization_name,
               o.slug as organization_slug,
               u.name as manager_name,
               u.email as manager_email,
               t.name as team_name,
               (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
               (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id) as task_count,
               (SELECT COUNT(*) FROM tasks tk WHERE tk.project_id = p.id AND tk.status = 'completed') as completed_task_count
        FROM projects p
        LEFT JOIN organizations o ON p.organization_id = o.id
        LEFT JOIN users u ON p.manager_id = u.id
        LEFT JOIN teams t ON p.team_id = t.id
        WHERE p.id = $1
      `, [projectId]);

      if (result.rows.length === 0) return null;
      return this.transformProject(result.rows[0]);
    } catch (error) {
      console.error('Error getting project by ID:', error);
      return null;
    }
  }

  /**
   * Create a new project
   */
  async createProject(projectData, userId) {
    try {
      const id = generateCuid();
      const slug = this.generateSlug(projectData.name);
      const now = new Date();

      const result = await query(`
        INSERT INTO projects (
          id, name, description, slug, organization_id, team_id, manager_id,
          status, priority, project_type, service_category, service_tier, ensemble_type,
          start_date, due_date, metadata, settings, tags, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *
      `, [
        id,
        projectData.name,
        projectData.description || '',
        slug,
        projectData.organizationId,
        projectData.teamId || null,
        userId,
        projectData.status || 'planning',
        projectData.priority || 'medium',
        projectData.projectType || 'general',
        projectData.serviceCategory || 'general',
        projectData.serviceTier || 'standard',
        projectData.ensembleType || 'general',
        projectData.startDate || now,
        projectData.dueDate || null,
        JSON.stringify(projectData.metadata || {}),
        JSON.stringify(projectData.settings || { isPrivate: false, allowComments: true, requireApproval: false }),
        projectData.tags || [],
        now,
        now
      ]);

      // Add creator as project member
      const memberId = generateCuid();
      await query(`
        INSERT INTO project_members (id, project_id, user_id, role, is_active, joined_at)
        VALUES ($1, $2, $3, 'manager', true, $4)
      `, [memberId, id, userId, now]);

      return this.transformProject(result.rows[0]);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId, updates, userId) {
    try {
      const allowedFields = [
        'name', 'description', 'status', 'priority', 'team_id',
        'start_date', 'due_date', 'metadata', 'settings', 'tags'
      ];

      const updateFields = [];
      const params = [projectId];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(updates)) {
        const dbField = this.toSnakeCase(key);
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(key === 'metadata' || key === 'settings' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);

      const result = await query(`
        UPDATE projects SET ${updateFields.join(', ')}
        WHERE id = $1 RETURNING *
      `, params);

      return result.rows.length > 0 ? this.transformProject(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Delete a project (soft delete by setting status to cancelled)
   */
  async deleteProject(projectId, userId) {
    try {
      await query(`
        UPDATE projects SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1
      `, [projectId]);
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  /**
   * Get project members
   */
  async getProjectMembers(projectId) {
    try {
      const result = await query(`
        SELECT pm.*, u.name, u.email, u.avatar_url
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1 AND pm.is_active = true
        ORDER BY pm.joined_at ASC
      `, [projectId]);

      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        role: row.role,
        name: row.name,
        email: row.email,
        avatar: row.avatar_url,
        joinedAt: row.joined_at
      }));
    } catch (error) {
      console.error('Error getting project members:', error);
      return [];
    }
  }

  /**
   * Add a member to a project
   */
  async addProjectMember(projectId, userId, role = 'contributor') {
    try {
      const id = generateCuid();
      const now = new Date();

      await query(`
        INSERT INTO project_members (id, project_id, user_id, role, is_active, joined_at)
        VALUES ($1, $2, $3, $4, true, $5)
        ON CONFLICT (project_id, user_id) DO UPDATE SET role = $4, is_active = true
      `, [id, projectId, userId, role, now]);

      return true;
    } catch (error) {
      console.error('Error adding project member:', error);
      return false;
    }
  }

  /**
   * Get project activity/events
   */
  async getProjectActivity(projectId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      // For now, return a combination of recent messages and task updates
      // TODO: Implement proper activity tracking table
      const result = await query(`
        SELECT
          'message' as type,
          m.id,
          m.content as description,
          m.created_at as timestamp,
          u.name as user_name,
          u.id as user_id
        FROM messages m
        JOIN users u ON m.author_id = u.id
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.project_id = $1 AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `, [projectId, limit, offset]);

      return result.rows.map(row => ({
        id: row.id,
        type: row.type,
        description: row.description,
        timestamp: row.timestamp,
        user: { id: row.user_id, name: row.user_name }
      }));
    } catch (error) {
      console.error('Error getting project activity:', error);
      return [];
    }
  }

  /**
   * Get or create the default conversation for a project
   */
  async getOrCreateProjectConversation(projectId, creatorId) {
    try {
      // First, check if a conversation already exists for this project
      let result = await query(`
        SELECT * FROM conversations
        WHERE project_id = $1 AND type = 'project'
        ORDER BY created_at ASC
        LIMIT 1
      `, [projectId]);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Get project details for naming
      const projectResult = await query(`
        SELECT name FROM projects WHERE id = $1
      `, [projectId]);

      const projectName = projectResult.rows[0]?.name || 'Project';

      // Create a new conversation for this project
      const conversationId = generateCuid();
      const now = new Date();

      result = await query(`
        INSERT INTO conversations (
          id, name, type, project_id, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, 'project', $3, $4, $5, $6
        ) RETURNING *
      `, [conversationId, `${projectName} Discussion`, projectId, creatorId, now, now]);

      // Add creator as participant
      const participantId = generateCuid();
      await query(`
        INSERT INTO conversation_participants (id, conversation_id, user_id, role, status, joined_at)
        VALUES ($1, $2, $3, 'admin', 'active', $4)
      `, [participantId, conversationId, creatorId, now]);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting/creating project conversation:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a project's conversation
   */
  async getProjectUnreadCount(projectId, userId) {
    try {
      const result = await query(`
        SELECT COUNT(*) as unread_count
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = $2
        WHERE c.project_id = $1
          AND m.author_id != $2
          AND m.deleted_at IS NULL
          AND mrr.id IS NULL
      `, [projectId, userId]);

      return parseInt(result.rows[0]?.unread_count || 0, 10);
    } catch (error) {
      console.error('Error getting project unread count:', error);
      return 0;
    }
  }

  // Transform database row to frontend format
  transformProject(dbProject) {
    const taskCount = parseInt(dbProject.task_count || 0, 10);
    const completedTaskCount = parseInt(dbProject.completed_task_count || 0, 10);
    const progress = taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

    return {
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description || '',
      status: dbProject.status,
      priority: dbProject.priority,
      organizationId: dbProject.organization_id,
      organizationName: dbProject.organization_name,
      organizationSlug: dbProject.organization_slug,
      teamId: dbProject.team_id,
      teamName: dbProject.team_name,
      createdBy: dbProject.manager_id,
      managerName: dbProject.manager_name,
      managerEmail: dbProject.manager_email,
      startDate: dbProject.start_date,
      dueDate: dbProject.due_date,
      progress,
      memberCount: parseInt(dbProject.member_count || 0, 10),
      taskCount,
      completedTaskCount,
      createdAt: dbProject.created_at,
      updatedAt: dbProject.updated_at,
      members: [],
      tasks: [],
      milestones: [],
      files: [],
      settings: dbProject.settings || {},
      metadata: dbProject.metadata || {},
      tags: dbProject.tags || []
    };
  }

  // Helper to convert camelCase to snake_case
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  // Generate URL-friendly slug
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

module.exports = new ProjectsAdapter();
