/**
 * Data Validation Script
 * Sprint 3: Database Migration
 *
 * Validates data consistency between JSON files and PostgreSQL
 * Identifies discrepancies and provides detailed reports
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { query, testConnection } = require('./config');

class DataValidator {
  constructor() {
    this.dataDir = path.join(__dirname, '..');
    this.discrepancies = {
      users: [],
      projects: [],
      tasks: [],
      milestones: [],
      members: []
    };
    this.stats = {
      users: { json: 0, postgres: 0, matched: 0, missing: 0 },
      projects: { json: 0, postgres: 0, matched: 0, missing: 0 },
      tasks: { json: 0, postgres: 0, matched: 0, missing: 0 },
      milestones: { json: 0, postgres: 0, matched: 0, missing: 0 }
    };
  }

  async readJSONFile(filename) {
    try {
      const filePath = path.join(this.dataDir, filename);
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  async validateUsers() {
    console.log('\n🔍 Validating Users...');
    const jsonData = await this.readJSONFile('users.json');

    if (!jsonData || !jsonData.users) {
      console.log('⚠️  No JSON users data found');
      return;
    }

    this.stats.users.json = jsonData.users.length;

    const pgResult = await query('SELECT COUNT(*) as count FROM users');
    this.stats.users.postgres = parseInt(pgResult.rows[0].count);

    // Check each JSON user exists in PostgreSQL
    for (const user of jsonData.users) {
      const pgUser = await query('SELECT * FROM users WHERE id = $1', [user.id]);

      if (pgUser.rows.length === 0) {
        this.stats.users.missing++;
        this.discrepancies.users.push({
          id: user.id,
          email: user.email,
          issue: 'Missing in PostgreSQL'
        });
      } else {
        this.stats.users.matched++;

        // Validate key fields match
        const pg = pgUser.rows[0];
        if (pg.email !== user.email) {
          this.discrepancies.users.push({
            id: user.id,
            field: 'email',
            json: user.email,
            postgres: pg.email,
            issue: 'Field mismatch'
          });
        }
      }
    }

    console.log(`  JSON users: ${this.stats.users.json}`);
    console.log(`  PostgreSQL users: ${this.stats.users.postgres}`);
    console.log(`  Matched: ${this.stats.users.matched}`);
    console.log(`  Missing: ${this.stats.users.missing}`);
  }

  async validateProjects() {
    console.log('\n🔍 Validating Projects...');
    const jsonData = await this.readJSONFile('projects.json');

    if (!jsonData || !jsonData.projects) {
      console.log('⚠️  No JSON projects data found');
      return;
    }

    this.stats.projects.json = jsonData.projects.length;

    const pgResult = await query('SELECT COUNT(*) as count FROM projects');
    this.stats.projects.postgres = parseInt(pgResult.rows[0].count);

    // Check each JSON project exists in PostgreSQL
    for (const project of jsonData.projects) {
      const pgProject = await query('SELECT * FROM projects WHERE id = $1', [project.id]);

      if (pgProject.rows.length === 0) {
        this.stats.projects.missing++;
        this.discrepancies.projects.push({
          id: project.id,
          name: project.name,
          issue: 'Missing in PostgreSQL'
        });
      } else {
        this.stats.projects.matched++;

        // Validate key fields match
        const pg = pgProject.rows[0];
        if (pg.name !== project.name) {
          this.discrepancies.projects.push({
            id: project.id,
            field: 'name',
            json: project.name,
            postgres: pg.name,
            issue: 'Field mismatch'
          });
        }
        if (pg.status !== project.status) {
          this.discrepancies.projects.push({
            id: project.id,
            field: 'status',
            json: project.status,
            postgres: pg.status,
            issue: 'Field mismatch'
          });
        }
      }

      // Validate tasks for this project
      if (project.tasks && Array.isArray(project.tasks)) {
        await this.validateTasks(project.id, project.tasks);
      }

      // Validate milestones for this project
      if (project.milestones && Array.isArray(project.milestones)) {
        await this.validateMilestones(project.id, project.milestones);
      }
    }

    console.log(`  JSON projects: ${this.stats.projects.json}`);
    console.log(`  PostgreSQL projects: ${this.stats.projects.postgres}`);
    console.log(`  Matched: ${this.stats.projects.matched}`);
    console.log(`  Missing: ${this.stats.projects.missing}`);
  }

  async validateTasks(projectId, tasks) {
    this.stats.tasks.json += tasks.length;

    for (const task of tasks) {
      const pgTask = await query('SELECT * FROM tasks WHERE id = $1', [task.id]);

      if (pgTask.rows.length === 0) {
        this.stats.tasks.missing++;
        this.discrepancies.tasks.push({
          id: task.id,
          projectId: projectId,
          title: task.title,
          issue: 'Missing in PostgreSQL'
        });
      } else {
        this.stats.tasks.matched++;

        // Validate key fields
        const pg = pgTask.rows[0];
        if (pg.title !== task.title) {
          this.discrepancies.tasks.push({
            id: task.id,
            field: 'title',
            json: task.title,
            postgres: pg.title,
            issue: 'Field mismatch'
          });
        }
        if (pg.status !== task.status) {
          this.discrepancies.tasks.push({
            id: task.id,
            field: 'status',
            json: task.status,
            postgres: pg.status,
            issue: 'Field mismatch'
          });
        }
      }
    }

    const pgTaskCount = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE project_id = $1',
      [projectId]
    );
    this.stats.tasks.postgres = parseInt(pgTaskCount.rows[0].count);
  }

  async validateMilestones(projectId, milestones) {
    this.stats.milestones.json += milestones.length;

    for (const milestone of milestones) {
      const pgMilestone = await query('SELECT * FROM milestones WHERE id = $1', [milestone.id]);

      if (pgMilestone.rows.length === 0) {
        this.stats.milestones.missing++;
        this.discrepancies.milestones.push({
          id: milestone.id,
          projectId: projectId,
          name: milestone.name || milestone.title,
          issue: 'Missing in PostgreSQL'
        });
      } else {
        this.stats.milestones.matched++;
      }
    }

    const pgMilestoneCount = await query(
      'SELECT COUNT(*) as count FROM milestones WHERE project_id = $1',
      [projectId]
    );
    this.stats.milestones.postgres = parseInt(pgMilestoneCount.rows[0].count);
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Data Validation Report');
    console.log('='.repeat(60));

    // Summary
    let totalDiscrepancies = 0;
    Object.values(this.discrepancies).forEach(arr => {
      totalDiscrepancies += arr.length;
    });

    console.log(`\n✅ Total Discrepancies Found: ${totalDiscrepancies}`);

    // Detailed stats
    console.log('\n📋 STATISTICS:');
    Object.entries(this.stats).forEach(([category, stats]) => {
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  JSON Count: ${stats.json}`);
      console.log(`  PostgreSQL Count: ${stats.postgres}`);
      console.log(`  Matched: ${stats.matched}`);
      console.log(`  Missing: ${stats.missing}`);

      const accuracy = stats.json > 0
        ? ((stats.matched / stats.json) * 100).toFixed(1)
        : 100;
      console.log(`  Accuracy: ${accuracy}%`);
    });

    // Discrepancies details
    if (totalDiscrepancies > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('⚠️  DISCREPANCIES FOUND:');
      console.log('='.repeat(60));

      Object.entries(this.discrepancies).forEach(([category, items]) => {
        if (items.length > 0) {
          console.log(`\n${category.toUpperCase()} (${items.length} issues):`);
          items.slice(0, 5).forEach(item => {
            console.log(`  - ${JSON.stringify(item, null, 2)}`);
          });
          if (items.length > 5) {
            console.log(`  ... and ${items.length - 5} more issues`);
          }
        }
      });
    }

    console.log('\n' + '='.repeat(60));

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (totalDiscrepancies === 0) {
      console.log('  ✅ Data is consistent! Safe to proceed with migration.');
      console.log('  ✅ You can set USE_POSTGRES=true');
    } else {
      console.log('  ⚠️  Discrepancies found. Review before proceeding.');
      console.log('  ⚠️  Run migration again: node database/migrate-json-to-postgres.js');
      console.log('  ⚠️  Check application logs for errors');
    }

    return totalDiscrepancies === 0;
  }

  async run() {
    console.log('🚀 Starting Data Validation');
    console.log('='.repeat(60));

    try {
      // Test database connection
      const connected = await testConnection();
      if (!connected) {
        throw new Error('Failed to connect to PostgreSQL database');
      }

      // Run validations
      await this.validateUsers();
      await this.validateProjects();

      // Print report
      const isValid = this.printReport();

      return isValid;
    } catch (err) {
      console.error('\n❌ Validation failed:', err);
      return false;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DataValidator();
  validator.run()
    .then(isValid => {
      process.exit(isValid ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = DataValidator;
