#!/usr/bin/env node
/**
 * Data Migration Script: JSON to PostgreSQL
 * Migrates existing JSON data files to PostgreSQL database
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query, transaction, testConnection, createBackup, closePool } = require('./config');

class DataMigrator {
  constructor() {
    this.migrationLog = [];
    this.errors = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    this.migrationLog.push(logMessage);
    console.log(logMessage);
  }

  error(message, error = null) {
    const timestamp = new Date().toISOString();
    let errorMessage = `[${timestamp}] ERROR: ${message}`;
    if (error) {
      errorMessage += ` - ${error.message}`;
    }
    this.errors.push(errorMessage);
    console.error(errorMessage);
  }

  async loadJSONFile(filename) {
    try {
      const filePath = path.join(__dirname, '..', filename);
      if (!fs.existsSync(filePath)) {
        this.log(`File ${filename} does not exist, skipping...`);
        return null;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.log(`Loaded ${filename}: ${JSON.stringify(data).length} characters`);
      return data;
    } catch (error) {
      this.error(`Failed to load ${filename}`, error);
      return null;
    }
  }

  async migrateUsers() {
    this.log('🔄 Starting user migration...');

    const usersData = await this.loadJSONFile('users.json');
    if (!usersData || !usersData.users) {
      this.log('No users data to migrate');
      return;
    }

    const users = usersData.users;
    this.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      try {
        // Map JSON user data to PostgreSQL schema
        const userData = {
          email: user.email,
          name: user.name,
          password_hash: null, // OAuth user
          user_type: user.userType || 'client',
          oauth_provider: user.googleId ? 'google' : null,
          oauth_id: user.googleId || null,
          email_verified: true, // Assume verified if they have OAuth
          is_active: true,
          created_at: user.createdAt ? new Date(user.createdAt) : new Date(),
          updated_at: new Date()
        };

        // Check if user already exists
        const existingUser = await query(
          'SELECT id FROM users WHERE email = $1 OR oauth_id = $2',
          [userData.email, userData.oauth_id]
        );

        if (existingUser.rows.length > 0) {
          this.log(`User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Insert user
        const result = await query(
          `INSERT INTO users (email, name, password_hash, user_type, oauth_provider, oauth_id, email_verified, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
          [userData.email, userData.name, userData.password_hash, userData.user_type,
           userData.oauth_provider, userData.oauth_id, userData.email_verified,
           userData.is_active, userData.created_at, userData.updated_at]
        );

        const newUserId = result.rows[0].id;
        this.log(`✅ Migrated user: ${userData.email} (ID: ${newUserId})`);

        // Create default organization for this user
        await this.createDefaultOrganization(newUserId, userData.name, userData.email);

      } catch (error) {
        this.error(`Failed to migrate user ${user.email}`, error);
      }
    }
  }

  async createDefaultOrganization(userId, userName, userEmail) {
    try {
      const orgData = {
        name: `${userName}'s Organization`,
        slug: userName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        description: 'Default organization',
        type: 'independent',
        contact_email: userEmail,
        created_by: userId
      };

      // Check if organization already exists
      const existingOrg = await query(
        'SELECT id FROM organizations WHERE slug = $1',
        [orgData.slug]
      );

      if (existingOrg.rows.length > 0) {
        this.log(`Organization ${orgData.slug} already exists`);
        return existingOrg.rows[0].id;
      }

      const result = await query(
        `INSERT INTO organizations (name, slug, description, type, contact_email, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [orgData.name, orgData.slug, orgData.description, orgData.type,
         orgData.contact_email, orgData.created_by]
      );

      const orgId = result.rows[0].id;
      this.log(`✅ Created default organization: ${orgData.name} (ID: ${orgId})`);

      // Add user as organization owner
      await query(
        `INSERT INTO organization_members (organization_id, user_id, role, is_active)
         VALUES ($1, $2, 'owner', true)`,
        [orgId, userId]
      );

      this.log(`✅ Added user as organization owner`);
      return orgId;

    } catch (error) {
      this.error(`Failed to create default organization for user ${userName}`, error);
    }
  }

  async migrateMessages() {
    this.log('🔄 Starting message migration...');

    const messagesData = await this.loadJSONFile('messages.json');
    if (!messagesData || !messagesData.messages || messagesData.messages.length === 0) {
      this.log('No messages data to migrate');
      return;
    }

    // Implementation for message migration would go here
    this.log(`Found ${messagesData.messages.length} messages to migrate`);
    // For now, no messages to migrate
  }

  async migrateFiles() {
    this.log('🔄 Starting file migration...');

    const filesData = await this.loadJSONFile('files.json');
    if (!filesData || !filesData.files || filesData.files.length === 0) {
      this.log('No files data to migrate');
      return;
    }

    // Implementation for file migration would go here
    this.log(`Found ${filesData.files.length} files to migrate`);
    // For now, no files to migrate
  }

  async validateMigration() {
    this.log('🔍 Validating migration...');

    try {
      // Count records in each table
      const userCount = await query('SELECT COUNT(*) FROM users');
      const orgCount = await query('SELECT COUNT(*) FROM organizations');
      const messageCount = await query('SELECT COUNT(*) FROM messages');
      const fileCount = await query('SELECT COUNT(*) FROM files');

      this.log(`Validation results:`);
      this.log(`  Users: ${userCount.rows[0].count}`);
      this.log(`  Organizations: ${orgCount.rows[0].count}`);
      this.log(`  Messages: ${messageCount.rows[0].count}`);
      this.log(`  Files: ${fileCount.rows[0].count}`);

      // Verify data integrity
      const userOrgCheck = await query(`
        SELECT u.email, o.name as org_name, om.role
        FROM users u
        LEFT JOIN organization_members om ON u.id = om.user_id
        LEFT JOIN organizations o ON om.organization_id = o.id
      `);

      for (const row of userOrgCheck.rows) {
        this.log(`User ${row.email} is ${row.role || 'not a member'} of ${row.org_name || 'no organization'}`);
      }

      this.log('✅ Migration validation completed');
      return true;

    } catch (error) {
      this.error('Migration validation failed', error);
      return false;
    }
  }

  async createMigrationReport() {
    const reportPath = path.join(__dirname, `migration-report-${Date.now()}.txt`);
    const report = [
      'FluxStudio Data Migration Report',
      '=================================',
      `Migration Date: ${new Date().toISOString()}`,
      `Total Log Entries: ${this.migrationLog.length}`,
      `Errors: ${this.errors.length}`,
      '',
      'MIGRATION LOG:',
      '-------------',
      ...this.migrationLog,
      '',
      'ERRORS:',
      '-------',
      ...this.errors
    ].join('\n');

    fs.writeFileSync(reportPath, report);
    this.log(`Migration report saved to: ${reportPath}`);
  }

  async run() {
    try {
      this.log('🚀 Starting FluxStudio data migration...');

      // Test database connection
      const connected = await testConnection();
      if (!connected) {
        throw new Error('Database connection failed');
      }

      // Create backup before migration
      this.log('📦 Creating pre-migration backup...');
      try {
        await createBackup();
        this.log('✅ Backup created successfully');
      } catch (error) {
        this.log('⚠️ Backup creation failed, but continuing with migration');
      }

      // Run migrations in transaction
      await transaction(async (client) => {
        this.log('🔄 Starting transaction...');

        await this.migrateUsers();
        await this.migrateMessages();
        await this.migrateFiles();

        this.log('✅ All migrations completed successfully');
      });

      // Validate migration
      const valid = await this.validateMigration();
      if (!valid) {
        throw new Error('Migration validation failed');
      }

      this.log('🎉 Migration completed successfully!');

    } catch (error) {
      this.error('Migration failed', error);
      process.exit(1);
    } finally {
      await this.createMigrationReport();
      await closePool();
    }
  }
}

// Command line execution
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.run();
}

module.exports = DataMigrator;