/**
 * JSON to PostgreSQL Migration Script
 * Sprint 3: Database Migration
 *
 * This script migrates all data from JSON files to PostgreSQL
 * Supports: Users, Projects, Tasks, Milestones, Members
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { query, transaction, testConnection } = require('./config');

class JSONToPostgresMigration {
  constructor() {
    this.dataDir = path.join(__dirname, '..');
    this.stats = {
      users: { total: 0, migrated: 0, errors: 0 },
      projects: { total: 0, migrated: 0, errors: 0 },
      projectMembers: { total: 0, migrated: 0, errors: 0 },
      tasks: { total: 0, migrated: 0, errors: 0 },
      milestones: { total: 0, migrated: 0, errors: 0 },
    };
    this.errors = [];
  }

  async readJSONFile(filename) {
    try {
      const filePath = path.join(this.dataDir, filename);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(`⚠️  File not found: ${filename}, skipping...`);
        return null;
      }
      throw err;
    }
  }

  async migrateUsers() {
    console.log('\n📋 Migrating Users...');
    const data = await this.readJSONFile('users.json');
    if (!data || !data.users) {
      console.log('⚠️  No users to migrate');
      return;
    }

    this.stats.users.total = data.users.length;

    for (const user of data.users) {
      try {
        // Check if user already exists
        const existing = await query('SELECT id FROM users WHERE id = $1', [user.id]);

        if (existing.rows.length > 0) {
          console.log(`⏭️  User already exists: ${user.email}`);
          this.stats.users.migrated++;
          continue;
        }

        // Insert user
        await query(
          `INSERT INTO users (
            id, email, name, password_hash, user_type, oauth_provider, oauth_id,
            avatar_url, created_at, updated_at, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            user.id,
            user.email,
            user.name,
            user.password || null,
            user.userType || 'client',
            user.oauthProvider || null,
            user.googleId || user.oauthId || null,
            user.avatar || null,
            user.createdAt || new Date().toISOString(),
            user.updatedAt || new Date().toISOString(),
            user.isActive !== false
          ]
        );

        this.stats.users.migrated++;
        console.log(`✅ Migrated user: ${user.email}`);
      } catch (err) {
        this.stats.users.errors++;
        this.errors.push({ type: 'user', id: user.id, error: err.message });
        console.error(`❌ Error migrating user ${user.email}:`, err.message);
      }
    }
  }

  async migrateProjects() {
    console.log('\n📋 Migrating Projects...');
    const data = await this.readJSONFile('projects.json');
    if (!data || !data.projects) {
      console.log('⚠️  No projects to migrate');
      return;
    }

    this.stats.projects.total = data.projects.length;

    for (const project of data.projects) {
      try {
        // Check if project already exists
        const existing = await query('SELECT id FROM projects WHERE id = $1', [project.id]);

        if (existing.rows.length > 0) {
          console.log(`⏭️  Project already exists: ${project.name}`);
          this.stats.projects.migrated++;
          continue;
        }

        // Insert project
        await query(
          `INSERT INTO projects (
            id, name, description, slug, organization_id, team_id, manager_id,
            status, priority, project_type, service_category, ensemble_type,
            start_date, due_date, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            project.id,
            project.name,
            project.description || null,
            project.slug || project.name.toLowerCase().replace(/\s+/g, '-'),
            project.organizationId || null,
            project.teamId || null,
            project.createdBy || null,
            project.status || 'planning',
            project.priority || 'medium',
            project.projectType || 'general',
            project.serviceCategory || 'design',
            project.ensembleType || 'general',
            project.startDate || null,
            project.dueDate || null,
            JSON.stringify(project.channelMetadata || project.metadata || {}),
            project.createdAt || new Date().toISOString(),
            project.updatedAt || new Date().toISOString()
          ]
        );

        this.stats.projects.migrated++;
        console.log(`✅ Migrated project: ${project.name}`);

        // Migrate project members
        if (project.members && Array.isArray(project.members)) {
          await this.migrateProjectMembers(project.id, project.members);
        }

        // Migrate tasks
        if (project.tasks && Array.isArray(project.tasks)) {
          await this.migrateTasks(project.id, project.tasks);
        }

        // Migrate milestones
        if (project.milestones && Array.isArray(project.milestones)) {
          await this.migrateMilestones(project.id, project.milestones);
        }

      } catch (err) {
        this.stats.projects.errors++;
        this.errors.push({ type: 'project', id: project.id, error: err.message });
        console.error(`❌ Error migrating project ${project.name}:`, err.message);
      }
    }
  }

  async migrateProjectMembers(projectId, members) {
    for (const member of members) {
      try {
        this.stats.projectMembers.total++;

        // Check if member already exists
        const existing = await query(
          'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
          [projectId, member.userId]
        );

        if (existing.rows.length > 0) {
          this.stats.projectMembers.migrated++;
          continue;
        }

        await query(
          `INSERT INTO project_members (project_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, $4)`,
          [
            projectId,
            member.userId,
            member.role || 'member',
            member.joinedAt || new Date().toISOString()
          ]
        );

        this.stats.projectMembers.migrated++;
      } catch (err) {
        this.stats.projectMembers.errors++;
        this.errors.push({ type: 'project_member', projectId, userId: member.userId, error: err.message });
        console.error(`❌ Error migrating project member:`, err.message);
      }
    }
  }

  async migrateTasks(projectId, tasks) {
    for (const task of tasks) {
      try {
        this.stats.tasks.total++;

        // Check if task already exists
        const existing = await query('SELECT id FROM tasks WHERE id = $1', [task.id]);

        if (existing.rows.length > 0) {
          this.stats.tasks.migrated++;
          continue;
        }

        await query(
          `INSERT INTO tasks (
            id, project_id, title, description, status, priority,
            assigned_to, due_date, created_by, created_at, updated_at,
            completed_at, tags, attachments
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            task.id,
            projectId,
            task.title,
            task.description || null,
            task.status || 'todo',
            task.priority || 'medium',
            task.assignedTo || null,
            task.dueDate || null,
            task.createdBy || null,
            task.createdAt || new Date().toISOString(),
            task.updatedAt || new Date().toISOString(),
            task.completedAt || null,
            task.tags || [],
            JSON.stringify(task.attachments || [])
          ]
        );

        this.stats.tasks.migrated++;
        console.log(`  ✅ Migrated task: ${task.title}`);
      } catch (err) {
        this.stats.tasks.errors++;
        this.errors.push({ type: 'task', id: task.id, error: err.message });
        console.error(`  ❌ Error migrating task ${task.title}:`, err.message);
      }
    }
  }

  async migrateMilestones(projectId, milestones) {
    for (const milestone of milestones) {
      try {
        this.stats.milestones.total++;

        // Check if milestone already exists
        const existing = await query('SELECT id FROM milestones WHERE id = $1', [milestone.id]);

        if (existing.rows.length > 0) {
          this.stats.milestones.migrated++;
          continue;
        }

        await query(
          `INSERT INTO milestones (
            id, project_id, name, description, due_date, status,
            progress, order_index, created_at, updated_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            milestone.id,
            projectId,
            milestone.name || milestone.title,
            milestone.description || null,
            milestone.dueDate || milestone.due_date || null,
            milestone.status || 'pending',
            milestone.progress || 0,
            milestone.orderIndex || milestone.order_index || 0,
            milestone.createdAt || new Date().toISOString(),
            milestone.updatedAt || new Date().toISOString(),
            milestone.completedAt || milestone.completed_at || null
          ]
        );

        this.stats.milestones.migrated++;
        console.log(`  ✅ Migrated milestone: ${milestone.name || milestone.title}`);
      } catch (err) {
        this.stats.milestones.errors++;
        this.errors.push({ type: 'milestone', id: milestone.id, error: err.message });
        console.error(`  ❌ Error migrating milestone:`, err.message);
      }
    }
  }

  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Statistics');
    console.log('='.repeat(60));

    Object.entries(this.stats).forEach(([category, stats]) => {
      const percentage = stats.total > 0 ? ((stats.migrated / stats.total) * 100).toFixed(1) : 0;
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  Total: ${stats.total}`);
      console.log(`  Migrated: ${stats.migrated} (${percentage}%)`);
      console.log(`  Errors: ${stats.errors}`);
    });

    console.log('\n' + '='.repeat(60));

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.slice(0, 10).forEach(err => {
        console.log(`  - ${err.type}: ${err.error}`);
      });
      if (this.errors.length > 10) {
        console.log(`  ... and ${this.errors.length - 10} more errors`);
      }
    }
  }

  async run() {
    console.log('🚀 Starting JSON to PostgreSQL Migration');
    console.log('='.repeat(60));

    try {
      // Test database connection
      const connected = await testConnection();
      if (!connected) {
        throw new Error('Failed to connect to PostgreSQL database');
      }

      // Run migrations in order
      await this.migrateUsers();
      await this.migrateProjects();

      // Print statistics
      this.printStats();

      console.log('\n✅ Migration completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('  1. Run data validation: node database/validate-data.js');
      console.log('  2. Set USE_POSTGRES=true to enable PostgreSQL reads');
      console.log('  3. Monitor logs for any discrepancies');
      console.log('  4. Keep dual-write enabled for 24 hours');

      return true;
    } catch (err) {
      console.error('\n❌ Migration failed:', err);
      return false;
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new JSONToPostgresMigration();
  migration.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = JSONToPostgresMigration;
