/**
 * Authentication Database Adapter
 * Provides database operations for the auth service
 */

const { userQueries, organizationQueries, query } = require('./config');

class AuthAdapter {

  // User management
  async getUsers() {
    try {
      const result = await query('SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC');
      return result.rows.map(this.transformUser);
    } catch (error) {
      console.error('Error getting users:', error);
      // Fallback to empty array to maintain compatibility
      return [];
    }
  }

  async getUserById(id) {
    try {
      const result = await userQueries.findById(id);
      return result.rows.length > 0 ? this.transformUser(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async getUserByEmail(email) {
    try {
      const result = await userQueries.findByEmail(email);
      return result.rows.length > 0 ? this.transformUser(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async createUser(userData) {
    try {
      const result = await userQueries.create({
        email: userData.email,
        name: userData.name,
        password_hash: userData.password,
        user_type: userData.userType || 'client',
        oauth_provider: userData.googleId ? 'google' : null,
        oauth_id: userData.googleId || null
      });

      const newUser = this.transformUser(result.rows[0]);

      // Create default organization for new user
      await this.createDefaultOrganization(newUser.id, newUser.name, newUser.email);

      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id, updates) {
    try {
      // Map frontend field names to database field names
      const dbUpdates = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.userType) dbUpdates.user_type = updates.userType;
      if (updates.password) dbUpdates.password_hash = updates.password;
      if (updates.avatar_url) dbUpdates.avatar_url = updates.avatar_url;
      if (updates.phone) dbUpdates.phone = updates.phone;
      if (updates.timezone) dbUpdates.timezone = updates.timezone;

      dbUpdates.updated_at = new Date();

      const result = await userQueries.update(id, dbUpdates);
      return result.rows.length > 0 ? this.transformUser(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async saveUsers(users) {
    // This method exists for backwards compatibility
    // In database mode, individual user operations are preferred
    console.warn('saveUsers() called - this method is deprecated in database mode');
    // For now, just return success - individual user operations handle persistence
    return true;
  }

  // Transform database user to frontend format
  // Supports both FluxStudio schema (password_hash) and MetMap schema (passwordHash mapped to password_hash)
  transformUser(dbUser) {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      // Include password hash for authentication (used by server-unified.js)
      password: dbUser.password_hash || dbUser.passwordHash,
      passwordHash: dbUser.password_hash || dbUser.passwordHash,
      userType: dbUser.user_type || 'client',
      googleId: dbUser.oauth_id,
      avatar_url: dbUser.avatar_url || dbUser.image,
      image: dbUser.image || dbUser.avatar_url,
      phone: dbUser.phone,
      timezone: dbUser.timezone,
      preferences: dbUser.preferences,
      emailVerified: dbUser.email_verified || dbUser.emailVerified,
      isActive: dbUser.is_active !== false,
      lastLogin: dbUser.last_login,
      createdAt: dbUser.created_at || dbUser.createdAt,
      updatedAt: dbUser.updated_at || dbUser.updatedAt
    };
  }

  // Organization management
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

      const result = await organizationQueries.create(orgData);
      const orgId = result.rows[0].id;

      // Add user as organization owner
      await query(
        `INSERT INTO organization_members (organization_id, user_id, role, is_active)
         VALUES ($1, $2, 'owner', true)`,
        [orgId, userId]
      );

      return orgId;
    } catch (error) {
      console.error('Error creating default organization:', error);
      throw error;
    }
  }

  // File management (placeholder - files are handled separately)
  async getFiles() {
    try {
      const result = await query('SELECT * FROM files ORDER BY created_at DESC');
      return result.rows.map(this.transformFile);
    } catch (error) {
      console.error('Error getting files:', error);
      return [];
    }
  }

  async saveFiles(files) {
    console.warn('saveFiles() called - this method is deprecated in database mode');
    return true;
  }

  transformFile(dbFile) {
    return {
      id: dbFile.id,
      name: dbFile.name,
      originalName: dbFile.original_name,
      description: dbFile.description,
      filePath: dbFile.file_path,
      fileUrl: dbFile.file_url,
      thumbnailUrl: dbFile.thumbnail_url,
      mimeType: dbFile.mime_type,
      fileSize: dbFile.file_size,
      width: dbFile.width,
      height: dbFile.height,
      duration: dbFile.duration,
      pages: dbFile.pages,
      category: dbFile.category,
      status: dbFile.status,
      version: dbFile.version,
      isLatest: dbFile.is_latest,
      parentFileId: dbFile.parent_file_id,
      projectId: dbFile.project_id,
      organizationId: dbFile.organization_id,
      uploadedBy: dbFile.uploaded_by,
      metadata: dbFile.metadata,
      createdAt: dbFile.created_at,
      updatedAt: dbFile.updated_at
    };
  }

  // Team management (placeholder)
  async getTeams() {
    try {
      const result = await query('SELECT * FROM teams ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error getting teams:', error);
      return [];
    }
  }

  async saveTeams(teams) {
    console.warn('saveTeams() called - this method is deprecated in database mode');
    return true;
  }

  // Health check
  async healthCheck() {
    try {
      const result = await query('SELECT NOW() as timestamp, COUNT(*) as user_count FROM users');
      return {
        status: 'ok',
        database: 'connected',
        timestamp: result.rows[0].timestamp,
        userCount: parseInt(result.rows[0].user_count)
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message
      };
    }
  }
}

module.exports = new AuthAdapter();