/**
 * Rollback Script - PostgreSQL to JSON
 * Sprint 3: Database Migration Emergency Recovery
 *
 * This script allows you to rollback from PostgreSQL to JSON storage
 * Use only in emergency situations if PostgreSQL migration has issues
 */

const fs = require('fs').promises;
const path = require('path');
const { query, testConnection } = require('./config');

class RollbackService {
  constructor() {
    this.dataDir = path.join(__dirname, '..');
    this.backupDir = path.join(__dirname, 'backups');
    this.stats = {
      users: 0,
      projects: 0,
      tasks: 0,
      milestones: 0
    };
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (err) {
      console.error('Error creating backup directory:', err);
    }
  }

  async backupExistingJSON(filename) {
    const filePath = path.join(this.dataDir, filename);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `${filename}.${timestamp}.backup`);

    try {
      await fs.copyFile(filePath, backupPath);
      console.log(`✅ Backed up existing ${filename} to ${backupPath}`);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Error backing up ${filename}:`, err);
      }
    }
  }

  async writeJSONFile(filename, data) {
    const filePath = path.join(this.dataDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ Written ${filename}`);
  }

  async exportUsers() {
    console.log('\n📦 Exporting Users from PostgreSQL...');

    const result = await query('SELECT * FROM users ORDER BY created_at');
    const users = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password_hash,
      userType: user.user_type,
      oauthProvider: user.oauth_provider,
      googleId: user.oauth_id,
      avatar: user.avatar_url,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isActive: user.is_active
    }));

    this.stats.users = users.length;
    await this.backupExistingJSON('users.json');
    await this.writeJSONFile('users.json', { users });

    console.log(`✅ Exported ${users.length} users`);
  }

  async exportProjects() {
    console.log('\n📦 Exporting Projects from PostgreSQL...');

    const result = await query('SELECT * FROM projects ORDER BY created_at');
    const projects = [];

    for (const project of result.rows) {
      // Get project members
      const membersResult = await query(
        'SELECT * FROM project_members WHERE project_id = $1',
        [project.id]
      );
      const members = membersResult.rows.map(m => ({
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at
      }));

      // Get tasks
      const tasksResult = await query(
        'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at',
        [project.id]
      );
      const tasks = tasksResult.rows.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assigned_to,
        dueDate: t.due_date,
        createdBy: t.created_by,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        completedAt: t.completed_at,
        tags: t.tags || [],
        attachments: t.attachments || []
      }));

      this.stats.tasks += tasks.length;

      // Get milestones
      const milestonesResult = await query(
        'SELECT * FROM milestones WHERE project_id = $1 ORDER BY order_index',
        [project.id]
      );
      const milestones = milestonesResult.rows.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        dueDate: m.due_date,
        status: m.status,
        progress: m.progress,
        orderIndex: m.order_index,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        completedAt: m.completed_at
      }));

      this.stats.milestones += milestones.length;

      // Build project object
      projects.push({
        id: project.id,
        name: project.name,
        description: project.description,
        teamId: project.team_id,
        organizationId: project.organization_id,
        status: project.status,
        priority: project.priority,
        startDate: project.start_date,
        dueDate: project.due_date,
        progress: project.progress || 0,
        createdBy: project.manager_id,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        channelMetadata: project.metadata,
        members,
        tasks,
        milestones,
        files: []
      });
    }

    this.stats.projects = projects.length;
    await this.backupExistingJSON('projects.json');
    await this.writeJSONFile('projects.json', { projects });

    console.log(`✅ Exported ${projects.length} projects`);
    console.log(`✅ Exported ${this.stats.tasks} tasks`);
    console.log(`✅ Exported ${this.stats.milestones} milestones`);
  }

  async updateEnvironment() {
    console.log('\n🔧 Updating Environment Variables...');
    console.log('⚠️  MANUAL STEP REQUIRED:');
    console.log('   Set USE_POSTGRES=false in your .env file');
    console.log('   Restart your server after making this change');
  }

  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Rollback Statistics');
    console.log('='.repeat(60));
    console.log(`\nUsers exported: ${this.stats.users}`);
    console.log(`Projects exported: ${this.stats.projects}`);
    console.log(`Tasks exported: ${this.stats.tasks}`);
    console.log(`Milestones exported: ${this.stats.milestones}`);
    console.log('\n' + '='.repeat(60));
  }

  async run(options = {}) {
    console.log('🔄 Starting Rollback to JSON Storage');
    console.log('='.repeat(60));
    console.log('⚠️  WARNING: This will overwrite existing JSON files!');

    if (!options.force) {
      console.log('\n❌ Rollback cancelled. Use --force flag to proceed.');
      console.log('   Example: node database/rollback-to-json.js --force');
      return false;
    }

    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();

      // Test database connection
      const connected = await testConnection();
      if (!connected) {
        throw new Error('Failed to connect to PostgreSQL database');
      }

      // Export data
      await this.exportUsers();
      await this.exportProjects();

      // Print statistics
      this.printStats();

      // Update environment
      await this.updateEnvironment();

      console.log('\n✅ Rollback completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('  1. Set USE_POSTGRES=false in .env');
      console.log('  2. Restart your application server');
      console.log('  3. Verify application is working with JSON');
      console.log('  4. Investigate PostgreSQL issues');
      console.log('  5. Fix issues and re-run migration when ready');

      return true;
    } catch (err) {
      console.error('\n❌ Rollback failed:', err);
      console.error('\n⚠️  Your data may be in an inconsistent state!');
      console.error('   Please check backups in:', this.backupDir);
      return false;
    }
  }
}

// Run rollback if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  const rollback = new RollbackService();
  rollback.run({ force })
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = RollbackService;
