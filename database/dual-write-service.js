/**
 * Dual-Write Database Service
 * Sprint 3: Zero-Downtime PostgreSQL Migration
 *
 * This service implements the dual-write pattern:
 * - Writes to both PostgreSQL and JSON files
 * - Reads from PostgreSQL when enabled, falls back to JSON
 * - Ensures data consistency across both storage systems
 * - Enables zero-downtime migration
 */

const fs = require('fs').promises;
const path = require('path');
const { query, transaction } = require('./config');

class DualWriteService {
  constructor() {
    // Control flag: set to true when ready to read from PostgreSQL
    this.usePostgres = process.env.USE_POSTGRES === 'true';

    // Always write to both systems during migration period
    this.dualWriteEnabled = process.env.DUAL_WRITE_ENABLED !== 'false';

    // JSON file paths
    this.dataDir = path.join(__dirname, '..');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.projectsFile = path.join(this.dataDir, 'projects.json');
    this.teamsFile = path.join(this.dataDir, 'teams.json');
    this.channelsFile = path.join(this.dataDir, 'channels.json');
    this.messagesFile = path.join(this.dataDir, 'messages.json');
    this.filesFile = path.join(this.dataDir, 'files.json');

    console.log('📊 Dual-Write Service initialized:', {
      usePostgres: this.usePostgres,
      dualWriteEnabled: this.dualWriteEnabled,
      readFrom: this.usePostgres ? 'PostgreSQL' : 'JSON',
      writeTo: this.dualWriteEnabled ? 'PostgreSQL + JSON' : 'PostgreSQL only'
    });
  }

  // ==================================================
  // JSON FILE OPERATIONS (Legacy)
  // ==================================================

  async readJSONFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist, return empty structure
        return this.getEmptyStructure(filePath);
      }
      console.error(`Error reading JSON file ${filePath}:`, err);
      throw err;
    }
  }

  async writeJSONFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error(`Error writing JSON file ${filePath}:`, err);
      throw err;
    }
  }

  getEmptyStructure(filePath) {
    const filename = path.basename(filePath);
    if (filename === 'users.json') return { users: [] };
    if (filename === 'projects.json') return { projects: [] };
    if (filename === 'teams.json') return { teams: [] };
    if (filename === 'channels.json') return { channels: [] };
    if (filename === 'messages.json') return { messages: [] };
    if (filename === 'files.json') return { files: [] };
    return {};
  }

  // ==================================================
  // USERS OPERATIONS
  // ==================================================

  async getUsers() {
    if (this.usePostgres) {
      try {
        const result = await query('SELECT * FROM users ORDER BY created_at DESC');
        return result.rows;
      } catch (err) {
        console.error('Error fetching users from PostgreSQL, falling back to JSON:', err);
        const data = await this.readJSONFile(this.usersFile);
        return data.users || [];
      }
    } else {
      const data = await this.readJSONFile(this.usersFile);
      return data.users || [];
    }
  }

  async getUserById(userId) {
    if (this.usePostgres) {
      try {
        const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
        return result.rows[0] || null;
      } catch (err) {
        console.error('Error fetching user from PostgreSQL, falling back to JSON:', err);
        const data = await this.readJSONFile(this.usersFile);
        return data.users?.find(u => u.id === userId) || null;
      }
    } else {
      const data = await this.readJSONFile(this.usersFile);
      return data.users?.find(u => u.id === userId) || null;
    }
  }

  async getUserByEmail(email) {
    if (this.usePostgres) {
      try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
      } catch (err) {
        console.error('Error fetching user from PostgreSQL, falling back to JSON:', err);
        const data = await this.readJSONFile(this.usersFile);
        return data.users?.find(u => u.email === email) || null;
      }
    } else {
      const data = await this.readJSONFile(this.usersFile);
      return data.users?.find(u => u.email === email) || null;
    }
  }

  async createUser(userData) {
    let pgUser = null;

    // Write to PostgreSQL
    try {
      const result = await query(
        `INSERT INTO users (id, email, name, password_hash, user_type, oauth_provider, oauth_id, avatar_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          userData.id,
          userData.email,
          userData.name,
          userData.password || userData.password_hash || null,
          userData.userType || userData.user_type || 'client',
          userData.oauthProvider || null,
          userData.googleId || userData.oauth_id || null,
          userData.avatar || null,
          userData.createdAt || new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      pgUser = result.rows[0];
      console.log('✅ User created in PostgreSQL:', pgUser.id);
    } catch (err) {
      console.error('❌ Error creating user in PostgreSQL:', err.message);
      // Don't throw - continue with JSON write
    }

    // Write to JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.usersFile);
        if (!data.users) data.users = [];

        // Check if user already exists
        const existingIndex = data.users.findIndex(u => u.id === userData.id);
        if (existingIndex >= 0) {
          data.users[existingIndex] = userData;
        } else {
          data.users.push(userData);
        }

        await this.writeJSONFile(this.usersFile, data);
        console.log('✅ User created in JSON:', userData.id);
      } catch (err) {
        console.error('❌ Error creating user in JSON:', err.message);
      }
    }

    return pgUser || userData;
  }

  async updateUser(userId, updates) {
    let pgUser = null;

    // Update in PostgreSQL
    try {
      const fields = [];
      const values = [userId];
      let paramCount = 2;

      Object.entries(updates).forEach(([key, value]) => {
        // Map JSON field names to PostgreSQL column names
        const columnMap = {
          'userType': 'user_type',
          'passwordHash': 'password_hash',
          'oauthProvider': 'oauth_provider',
          'googleId': 'oauth_id',
          'avatar': 'avatar_url',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at'
        };
        const column = columnMap[key] || key;
        fields.push(`${column} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length > 0) {
        fields.push(`updated_at = $${paramCount}`);
        values.push(new Date().toISOString());

        const result = await query(
          `UPDATE users SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
          values
        );
        pgUser = result.rows[0];
        console.log('✅ User updated in PostgreSQL:', userId);
      }
    } catch (err) {
      console.error('❌ Error updating user in PostgreSQL:', err.message);
    }

    // Update in JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.usersFile);
        const userIndex = data.users?.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          data.users[userIndex] = { ...data.users[userIndex], ...updates };
          await this.writeJSONFile(this.usersFile, data);
          console.log('✅ User updated in JSON:', userId);
        }
      } catch (err) {
        console.error('❌ Error updating user in JSON:', err.message);
      }
    }

    return pgUser;
  }

  // ==================================================
  // PROJECTS OPERATIONS
  // ==================================================

  async getProjects(filters = {}) {
    if (this.usePostgres) {
      try {
        let queryText = 'SELECT * FROM projects WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (filters.organizationId) {
          queryText += ` AND organization_id = $${paramCount}`;
          params.push(filters.organizationId);
          paramCount++;
        }

        if (filters.status) {
          queryText += ` AND status = $${paramCount}`;
          params.push(filters.status);
          paramCount++;
        }

        queryText += ' ORDER BY created_at DESC';

        const result = await query(queryText, params);
        return result.rows;
      } catch (err) {
        console.error('Error fetching projects from PostgreSQL, falling back to JSON:', err);
        const data = await this.readJSONFile(this.projectsFile);
        return data.projects || [];
      }
    } else {
      const data = await this.readJSONFile(this.projectsFile);
      let projects = data.projects || [];

      // Apply filters for JSON
      if (filters.organizationId) {
        projects = projects.filter(p => p.organizationId === filters.organizationId);
      }
      if (filters.status) {
        projects = projects.filter(p => p.status === filters.status);
      }

      return projects;
    }
  }

  async getProjectById(projectId) {
    if (this.usePostgres) {
      try {
        const result = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
        return result.rows[0] || null;
      } catch (err) {
        console.error('Error fetching project from PostgreSQL, falling back to JSON:', err);
        const data = await this.readJSONFile(this.projectsFile);
        return data.projects?.find(p => p.id === projectId) || null;
      }
    } else {
      const data = await this.readJSONFile(this.projectsFile);
      return data.projects?.find(p => p.id === projectId) || null;
    }
  }

  async createProject(projectData) {
    let pgProject = null;

    // Write to PostgreSQL
    try {
      const result = await query(
        `INSERT INTO projects (
          id, name, description, slug, organization_id, team_id, manager_id,
          status, priority, project_type, service_category, ensemble_type,
          start_date, due_date, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          projectData.id,
          projectData.name,
          projectData.description,
          projectData.slug || projectData.name.toLowerCase().replace(/\s+/g, '-'),
          projectData.organizationId || projectData.organization_id || null,
          projectData.teamId || projectData.team_id || null,
          projectData.createdBy || projectData.manager_id,
          projectData.status || 'planning',
          projectData.priority || 'medium',
          projectData.projectType || projectData.project_type || 'general',
          projectData.serviceCategory || projectData.service_category || 'design',
          projectData.ensembleType || projectData.ensemble_type || 'general',
          projectData.startDate || projectData.start_date || null,
          projectData.dueDate || projectData.due_date || null,
          JSON.stringify(projectData.metadata || projectData.channelMetadata || {}),
          projectData.createdAt || new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      pgProject = result.rows[0];
      console.log('✅ Project created in PostgreSQL:', pgProject.id);

      // Add project members
      if (projectData.members && Array.isArray(projectData.members)) {
        for (const member of projectData.members) {
          await query(
            `INSERT INTO project_members (project_id, user_id, role, joined_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (project_id, user_id) DO NOTHING`,
            [pgProject.id, member.userId, member.role, member.joinedAt || new Date().toISOString()]
          );
        }
      }
    } catch (err) {
      console.error('❌ Error creating project in PostgreSQL:', err.message);
    }

    // Write to JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.projectsFile);
        if (!data.projects) data.projects = [];

        const existingIndex = data.projects.findIndex(p => p.id === projectData.id);
        if (existingIndex >= 0) {
          data.projects[existingIndex] = projectData;
        } else {
          data.projects.push(projectData);
        }

        await this.writeJSONFile(this.projectsFile, data);
        console.log('✅ Project created in JSON:', projectData.id);
      } catch (err) {
        console.error('❌ Error creating project in JSON:', err.message);
      }
    }

    return pgProject || projectData;
  }

  async updateProject(projectId, updates) {
    let pgProject = null;

    // Update in PostgreSQL
    try {
      const fields = [];
      const values = [projectId];
      let paramCount = 2;

      // Map JSON field names to PostgreSQL column names
      const columnMap = {
        'teamId': 'team_id',
        'organizationId': 'organization_id',
        'managerId': 'manager_id',
        'startDate': 'start_date',
        'dueDate': 'due_date',
        'projectType': 'project_type',
        'serviceCategory': 'service_category',
        'ensembleType': 'ensemble_type',
        'channelMetadata': 'metadata',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at'
      };

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'members' && key !== 'tasks' && key !== 'milestones' && key !== 'files') {
          const column = columnMap[key] || key;
          fields.push(`${column} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length > 0) {
        fields.push(`updated_at = $${paramCount}`);
        values.push(new Date().toISOString());

        const result = await query(
          `UPDATE projects SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
          values
        );
        pgProject = result.rows[0];
        console.log('✅ Project updated in PostgreSQL:', projectId);
      }
    } catch (err) {
      console.error('❌ Error updating project in PostgreSQL:', err.message);
    }

    // Update in JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.projectsFile);
        const projectIndex = data.projects?.findIndex(p => p.id === projectId);
        if (projectIndex >= 0) {
          data.projects[projectIndex] = { ...data.projects[projectIndex], ...updates };
          await this.writeJSONFile(this.projectsFile, data);
          console.log('✅ Project updated in JSON:', projectId);
        }
      } catch (err) {
        console.error('❌ Error updating project in JSON:', err.message);
      }
    }

    return pgProject;
  }

  async deleteProject(projectId) {
    // Delete from PostgreSQL
    try {
      await query('DELETE FROM projects WHERE id = $1', [projectId]);
      console.log('✅ Project deleted from PostgreSQL:', projectId);
    } catch (err) {
      console.error('❌ Error deleting project from PostgreSQL:', err.message);
    }

    // Delete from JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.projectsFile);
        data.projects = data.projects?.filter(p => p.id !== projectId) || [];
        await this.writeJSONFile(this.projectsFile, data);
        console.log('✅ Project deleted from JSON:', projectId);
      } catch (err) {
        console.error('❌ Error deleting project from JSON:', err.message);
      }
    }

    return true;
  }

  // ==================================================
  // TASKS OPERATIONS
  // ==================================================

  async getTasks(projectId) {
    if (this.usePostgres) {
      try {
        const result = await query(
          'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC',
          [projectId]
        );
        return result.rows;
      } catch (err) {
        console.error('Error fetching tasks from PostgreSQL, falling back to JSON:', err);
        const data = await this.readJSONFile(this.projectsFile);
        const project = data.projects?.find(p => p.id === projectId);
        return project?.tasks || [];
      }
    } else {
      const data = await this.readJSONFile(this.projectsFile);
      const project = data.projects?.find(p => p.id === projectId);
      return project?.tasks || [];
    }
  }

  async createTask(projectId, taskData) {
    let pgTask = null;

    // Write to PostgreSQL
    try {
      const result = await query(
        `INSERT INTO tasks (
          id, project_id, title, description, status, priority, assigned_to,
          due_date, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          taskData.id,
          projectId,
          taskData.title,
          taskData.description,
          taskData.status || 'todo',
          taskData.priority || 'medium',
          taskData.assignedTo || null,
          taskData.dueDate || null,
          taskData.createdBy,
          taskData.createdAt || new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      pgTask = result.rows[0];
      console.log('✅ Task created in PostgreSQL:', pgTask.id);
    } catch (err) {
      console.error('❌ Error creating task in PostgreSQL:', err.message);
    }

    // Write to JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.projectsFile);
        const project = data.projects?.find(p => p.id === projectId);
        if (project) {
          if (!project.tasks) project.tasks = [];
          project.tasks.push(taskData);
          await this.writeJSONFile(this.projectsFile, data);
          console.log('✅ Task created in JSON:', taskData.id);
        }
      } catch (err) {
        console.error('❌ Error creating task in JSON:', err.message);
      }
    }

    return pgTask || taskData;
  }

  async updateTask(projectId, taskId, updates) {
    let pgTask = null;

    // Update in PostgreSQL
    try {
      const fields = [];
      const values = [taskId];
      let paramCount = 2;

      const columnMap = {
        'assignedTo': 'assigned_to',
        'dueDate': 'due_date',
        'createdBy': 'created_by',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'completedAt': 'completed_at'
      };

      Object.entries(updates).forEach(([key, value]) => {
        const column = columnMap[key] || key;
        fields.push(`${column} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length > 0) {
        fields.push(`updated_at = $${paramCount}`);
        values.push(new Date().toISOString());

        const result = await query(
          `UPDATE tasks SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
          values
        );
        pgTask = result.rows[0];
        console.log('✅ Task updated in PostgreSQL:', taskId);
      }
    } catch (err) {
      console.error('❌ Error updating task in PostgreSQL:', err.message);
    }

    // Update in JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.projectsFile);
        const project = data.projects?.find(p => p.id === projectId);
        if (project) {
          const taskIndex = project.tasks?.findIndex(t => t.id === taskId);
          if (taskIndex >= 0) {
            project.tasks[taskIndex] = { ...project.tasks[taskIndex], ...updates };
            await this.writeJSONFile(this.projectsFile, data);
            console.log('✅ Task updated in JSON:', taskId);
          }
        }
      } catch (err) {
        console.error('❌ Error updating task in JSON:', err.message);
      }
    }

    return pgTask;
  }

  async deleteTask(projectId, taskId) {
    // Delete from PostgreSQL
    try {
      await query('DELETE FROM tasks WHERE id = $1', [taskId]);
      console.log('✅ Task deleted from PostgreSQL:', taskId);
    } catch (err) {
      console.error('❌ Error deleting task from PostgreSQL:', err.message);
    }

    // Delete from JSON (if dual-write enabled)
    if (this.dualWriteEnabled) {
      try {
        const data = await this.readJSONFile(this.projectsFile);
        const project = data.projects?.find(p => p.id === projectId);
        if (project) {
          project.tasks = project.tasks?.filter(t => t.id !== taskId) || [];
          await this.writeJSONFile(this.projectsFile, data);
          console.log('✅ Task deleted from JSON:', taskId);
        }
      } catch (err) {
        console.error('❌ Error deleting task from JSON:', err.message);
      }
    }

    return true;
  }

  // ==================================================
  // ACTIVITIES OPERATIONS
  // ==================================================

  async getActivities(projectId, limit = 50) {
    if (this.usePostgres) {
      try {
        const result = await query(
          'SELECT * FROM activities WHERE project_id = $1 ORDER BY timestamp DESC LIMIT $2',
          [projectId, limit]
        );
        return result.rows;
      } catch (err) {
        console.error('Error fetching activities from PostgreSQL:', err);
        return [];
      }
    } else {
      // Activities are not stored in JSON currently
      return [];
    }
  }

  async logActivity(activityData) {
    try {
      const result = await query(
        `INSERT INTO activities (
          project_id, organization_id, type, user_id, user_name, user_email,
          user_avatar, entity_type, entity_id, entity_title, action, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          activityData.projectId,
          activityData.organizationId || null,
          activityData.type,
          activityData.userId,
          activityData.userName,
          activityData.userEmail,
          activityData.userAvatar || null,
          activityData.entityType,
          activityData.entityId,
          activityData.entityTitle,
          activityData.action,
          JSON.stringify(activityData.metadata || {})
        ]
      );
      console.log('✅ Activity logged:', result.rows[0].id);
      return result.rows[0];
    } catch (err) {
      console.error('❌ Error logging activity:', err.message);
      return null;
    }
  }
}

// Export singleton instance
module.exports = new DualWriteService();
