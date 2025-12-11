/**
 * Connectors Database Adapter
 * Provides database operations for external connectors (GitHub, Google Drive, Dropbox, OneDrive)
 */

const { query, transaction } = require('./config');
const oauthManager = require('../lib/oauth-manager');

class ConnectorsAdapter {
  // ========================================
  // CONNECTOR STATUS AND MANAGEMENT
  // ========================================

  /**
   * Get all connectors with their status for a user
   */
  async getUserConnectors(userId) {
    try {
      const result = await query(
        `SELECT provider, provider_username, provider_email, scope, expires_at,
                last_used_at, created_at, is_active,
                CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN true ELSE false END as is_expired
         FROM oauth_tokens
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map(row => ({
        provider: row.provider,
        username: row.provider_username,
        email: row.provider_email,
        scope: row.scope,
        expiresAt: row.expires_at,
        lastUsedAt: row.last_used_at,
        connectedAt: row.created_at,
        isActive: row.is_active,
        isExpired: row.is_expired
      }));
    } catch (error) {
      console.error('Error getting user connectors:', error);
      return [];
    }
  }

  /**
   * Check if user has active connection for provider
   */
  async isConnected(userId, provider) {
    try {
      const result = await query(
        `SELECT is_active, expires_at FROM oauth_tokens
         WHERE user_id = $1 AND provider = $2`,
        [userId, provider]
      );

      if (result.rows.length === 0) return false;

      const { is_active, expires_at } = result.rows[0];
      if (!is_active) return false;
      if (expires_at && new Date(expires_at) < new Date()) return false;

      return true;
    } catch (error) {
      console.error('Error checking connector status:', error);
      return false;
    }
  }

  /**
   * Disconnect a connector
   */
  async disconnectConnector(userId, provider) {
    try {
      await oauthManager.disconnectIntegration(userId, provider);
      return true;
    } catch (error) {
      console.error('Error disconnecting connector:', error);
      return false;
    }
  }

  // ========================================
  // CONNECTOR FILES
  // ========================================

  /**
   * Store imported file from connector
   */
  async storeConnectorFile(fileData) {
    try {
      const result = await query(
        `INSERT INTO connector_files
         (user_id, organization_id, project_id, provider, provider_file_id, provider_path,
          name, mime_type, size_bytes, file_type, local_path, last_synced_at,
          provider_modified_at, sync_status, provider_metadata, version, checksum, parent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16, $17)
         ON CONFLICT (user_id, provider, provider_file_id)
         DO UPDATE SET
           name = EXCLUDED.name,
           mime_type = EXCLUDED.mime_type,
           size_bytes = EXCLUDED.size_bytes,
           local_path = COALESCE(EXCLUDED.local_path, connector_files.local_path),
           last_synced_at = NOW(),
           provider_modified_at = EXCLUDED.provider_modified_at,
           sync_status = EXCLUDED.sync_status,
           provider_metadata = EXCLUDED.provider_metadata,
           version = EXCLUDED.version,
           checksum = EXCLUDED.checksum,
           updated_at = NOW()
         RETURNING *`,
        [
          fileData.userId,
          fileData.organizationId || null,
          fileData.projectId || null,
          fileData.provider,
          fileData.providerFileId,
          fileData.providerPath || null,
          fileData.name,
          fileData.mimeType || null,
          fileData.sizeBytes || null,
          fileData.fileType || 'file',
          fileData.localPath || null,
          fileData.providerModifiedAt || null,
          fileData.syncStatus || 'synced',
          JSON.stringify(fileData.providerMetadata || {}),
          fileData.version || null,
          fileData.checksum || null,
          fileData.parentId || null
        ]
      );

      return this.transformConnectorFile(result.rows[0]);
    } catch (error) {
      console.error('Error storing connector file:', error);
      throw error;
    }
  }

  /**
   * Get connector files for user
   */
  async getConnectorFiles(userId, options = {}) {
    try {
      const { provider, projectId, parentId, limit = 100, offset = 0 } = options;

      let queryText = `
        SELECT * FROM connector_files
        WHERE user_id = $1 AND deleted_at IS NULL
      `;
      const params = [userId];
      let paramIndex = 2;

      if (provider) {
        queryText += ` AND provider = $${paramIndex++}`;
        params.push(provider);
      }

      if (projectId) {
        queryText += ` AND project_id = $${paramIndex++}`;
        params.push(projectId);
      }

      if (parentId !== undefined) {
        if (parentId === null) {
          queryText += ` AND parent_id IS NULL`;
        } else {
          queryText += ` AND parent_id = $${paramIndex++}`;
          params.push(parentId);
        }
      }

      queryText += ` ORDER BY file_type DESC, name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await query(queryText, params);
      return result.rows.map(this.transformConnectorFile);
    } catch (error) {
      console.error('Error getting connector files:', error);
      return [];
    }
  }

  /**
   * Get a single connector file by ID
   */
  async getConnectorFileById(fileId, userId) {
    try {
      const result = await query(
        `SELECT * FROM connector_files WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [fileId, userId]
      );
      return result.rows.length > 0 ? this.transformConnectorFile(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting connector file:', error);
      return null;
    }
  }

  /**
   * Link connector file to project
   */
  async linkFileToProject(fileId, projectId, userId) {
    try {
      const result = await query(
        `UPDATE connector_files SET project_id = $1, updated_at = NOW()
         WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
         RETURNING *`,
        [projectId, fileId, userId]
      );
      return result.rows.length > 0 ? this.transformConnectorFile(result.rows[0]) : null;
    } catch (error) {
      console.error('Error linking file to project:', error);
      return null;
    }
  }

  /**
   * Delete connector file
   */
  async deleteConnectorFile(fileId, userId) {
    try {
      const result = await query(
        `UPDATE connector_files SET deleted_at = NOW() WHERE id = $1 AND user_id = $2`,
        [fileId, userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting connector file:', error);
      return false;
    }
  }

  /**
   * Update file sync status
   */
  async updateFileSyncStatus(fileId, status, error = null) {
    try {
      await query(
        `UPDATE connector_files SET sync_status = $1, sync_error = $2, updated_at = NOW()
         WHERE id = $3`,
        [status, error, fileId]
      );
      return true;
    } catch (error) {
      console.error('Error updating file sync status:', error);
      return false;
    }
  }

  // ========================================
  // SYNC JOBS
  // ========================================

  /**
   * Create a sync job
   */
  async createSyncJob(jobData) {
    try {
      const result = await query(
        `INSERT INTO connector_sync_jobs (user_id, provider, job_type, status, total_items, metadata)
         VALUES ($1, $2, $3, 'pending', $4, $5)
         RETURNING *`,
        [
          jobData.userId,
          jobData.provider,
          jobData.jobType,
          jobData.totalItems || 0,
          JSON.stringify(jobData.metadata || {})
        ]
      );
      return this.transformSyncJob(result.rows[0]);
    } catch (error) {
      console.error('Error creating sync job:', error);
      throw error;
    }
  }

  /**
   * Update sync job progress
   */
  async updateSyncJobProgress(jobId, processed, failed = 0) {
    try {
      await query(
        `UPDATE connector_sync_jobs
         SET processed_items = $1, failed_items = $2, status = 'running',
             started_at = COALESCE(started_at, NOW()), updated_at = NOW()
         WHERE id = $3`,
        [processed, failed, jobId]
      );
      return true;
    } catch (error) {
      console.error('Error updating sync job progress:', error);
      return false;
    }
  }

  /**
   * Complete sync job
   */
  async completeSyncJob(jobId, status = 'completed', errorMessage = null, errorDetails = null) {
    try {
      await query(
        `UPDATE connector_sync_jobs
         SET status = $1, completed_at = NOW(), error_message = $2, error_details = $3, updated_at = NOW()
         WHERE id = $4`,
        [status, errorMessage, errorDetails ? JSON.stringify(errorDetails) : null, jobId]
      );
      return true;
    } catch (error) {
      console.error('Error completing sync job:', error);
      return false;
    }
  }

  /**
   * Get recent sync jobs for user
   */
  async getSyncJobs(userId, provider = null, limit = 10) {
    try {
      let queryText = `SELECT * FROM connector_sync_jobs WHERE user_id = $1`;
      const params = [userId];

      if (provider) {
        queryText += ` AND provider = $2`;
        params.push(provider);
      }

      queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await query(queryText, params);
      return result.rows.map(this.transformSyncJob);
    } catch (error) {
      console.error('Error getting sync jobs:', error);
      return [];
    }
  }

  // ========================================
  // PROVIDER-SPECIFIC METHODS
  // ========================================

  /**
   * Get GitHub repositories for user
   */
  async getGitHubRepos(userId) {
    try {
      const accessToken = await oauthManager.getAccessToken(userId, 'github');
      const axios = require('axios');

      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          sort: 'updated',
          per_page: 100
        }
      });

      return response.data.map(repo => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        language: repo.language,
        updatedAt: repo.updated_at,
        size: repo.size * 1024, // KB to bytes
        owner: {
          login: repo.owner.login,
          avatarUrl: repo.owner.avatar_url
        }
      }));
    } catch (error) {
      console.error('Error getting GitHub repos:', error);
      throw error;
    }
  }

  /**
   * Get GitHub repository contents
   */
  async getGitHubRepoContents(userId, owner, repo, path = '') {
    try {
      const accessToken = await oauthManager.getAccessToken(userId, 'github');
      const axios = require('axios');

      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const items = Array.isArray(response.data) ? response.data : [response.data];

      return items.map(item => ({
        id: item.sha,
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'folder' : 'file',
        size: item.size || 0,
        downloadUrl: item.download_url,
        htmlUrl: item.html_url,
        sha: item.sha
      }));
    } catch (error) {
      console.error('Error getting GitHub repo contents:', error);
      throw error;
    }
  }

  /**
   * Get Google Drive files for user
   */
  async getGoogleDriveFiles(userId, folderId = 'root') {
    try {
      const accessToken = await oauthManager.getAccessToken(userId, 'google_drive');
      const axios = require('axios');

      const query = folderId === 'root'
        ? "'root' in parents and trashed = false"
        : `'${folderId}' in parents and trashed = false`;

      const response = await axios.get('https://www.googleapis.com/drive/v3/files', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          q: query,
          fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink, parents)',
          pageSize: 100,
          orderBy: 'folder,name'
        }
      });

      return response.data.files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        type: file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        size: parseInt(file.size) || 0,
        modifiedAt: file.modifiedTime,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
        parentId: file.parents ? file.parents[0] : null
      }));
    } catch (error) {
      console.error('Error getting Google Drive files:', error);
      throw error;
    }
  }

  /**
   * Get Dropbox files for user
   */
  async getDropboxFiles(userId, path = '') {
    try {
      const accessToken = await oauthManager.getAccessToken(userId, 'dropbox');
      const axios = require('axios');

      const response = await axios.post(
        'https://api.dropboxapi.com/2/files/list_folder',
        {
          path: path || '',
          recursive: false,
          include_mounted_folders: true,
          include_non_downloadable_files: true
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.entries.map(entry => ({
        id: entry.id,
        name: entry.name,
        path: entry.path_lower,
        type: entry['.tag'] === 'folder' ? 'folder' : 'file',
        size: entry.size || 0,
        modifiedAt: entry.client_modified || entry.server_modified,
        contentHash: entry.content_hash
      }));
    } catch (error) {
      console.error('Error getting Dropbox files:', error);
      throw error;
    }
  }

  /**
   * Get OneDrive files for user
   */
  async getOneDriveFiles(userId, folderId = 'root') {
    try {
      const accessToken = await oauthManager.getAccessToken(userId, 'onedrive');
      const axios = require('axios');

      const endpoint = folderId === 'root'
        ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
        : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          '$select': 'id,name,size,lastModifiedDateTime,file,folder,webUrl,parentReference',
          '$orderby': 'name'
        }
      });

      return response.data.value.map(item => ({
        id: item.id,
        name: item.name,
        type: item.folder ? 'folder' : 'file',
        mimeType: item.file?.mimeType,
        size: item.size || 0,
        modifiedAt: item.lastModifiedDateTime,
        webUrl: item.webUrl,
        parentId: item.parentReference?.id
      }));
    } catch (error) {
      console.error('Error getting OneDrive files:', error);
      throw error;
    }
  }

  /**
   * Import file from connector to FluxStudio
   */
  async importFile(userId, provider, providerFileId, options = {}) {
    try {
      // Create sync job
      const job = await this.createSyncJob({
        userId,
        provider,
        jobType: 'import',
        totalItems: 1,
        metadata: { providerFileId, options }
      });

      // Get file from provider
      let fileData;
      switch (provider) {
        case 'github':
          fileData = await this.importGitHubFile(userId, providerFileId, options);
          break;
        case 'google_drive':
          fileData = await this.importGoogleDriveFile(userId, providerFileId);
          break;
        case 'dropbox':
          fileData = await this.importDropboxFile(userId, providerFileId);
          break;
        case 'onedrive':
          fileData = await this.importOneDriveFile(userId, providerFileId);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Store in connector_files
      const storedFile = await this.storeConnectorFile({
        userId,
        organizationId: options.organizationId,
        projectId: options.projectId,
        provider,
        providerFileId,
        ...fileData
      });

      // Complete job
      await this.completeSyncJob(job.id, 'completed');

      return storedFile;
    } catch (error) {
      console.error('Error importing file:', error);
      throw error;
    }
  }

  /**
   * Import GitHub file
   */
  async importGitHubFile(userId, fileId, options = {}) {
    const accessToken = await oauthManager.getAccessToken(userId, 'github');
    const axios = require('axios');

    // fileId format: "owner/repo/path"
    const [owner, repo, ...pathParts] = fileId.split('/');
    const path = pathParts.join('/');

    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    return {
      name: response.data.name,
      providerPath: response.data.path,
      mimeType: this.getMimeType(response.data.name),
      sizeBytes: response.data.size,
      fileType: response.data.type === 'dir' ? 'folder' : 'file',
      version: response.data.sha,
      checksum: response.data.sha,
      providerMetadata: {
        downloadUrl: response.data.download_url,
        htmlUrl: response.data.html_url,
        repo: `${owner}/${repo}`
      }
    };
  }

  /**
   * Import Google Drive file
   */
  async importGoogleDriveFile(userId, fileId) {
    const accessToken = await oauthManager.getAccessToken(userId, 'google_drive');
    const axios = require('axios');

    const response = await axios.get(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          fields: 'id,name,mimeType,size,modifiedTime,webViewLink,webContentLink'
        }
      }
    );

    return {
      name: response.data.name,
      mimeType: response.data.mimeType,
      sizeBytes: parseInt(response.data.size) || 0,
      fileType: response.data.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
      providerModifiedAt: response.data.modifiedTime,
      providerMetadata: {
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
      }
    };
  }

  /**
   * Import Dropbox file
   */
  async importDropboxFile(userId, filePath) {
    const accessToken = await oauthManager.getAccessToken(userId, 'dropbox');
    const axios = require('axios');

    const response = await axios.post(
      'https://api.dropboxapi.com/2/files/get_metadata',
      { path: filePath },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      name: response.data.name,
      providerPath: response.data.path_lower,
      mimeType: this.getMimeType(response.data.name),
      sizeBytes: response.data.size || 0,
      fileType: response.data['.tag'] === 'folder' ? 'folder' : 'file',
      providerModifiedAt: response.data.client_modified,
      checksum: response.data.content_hash,
      providerMetadata: {
        id: response.data.id,
        rev: response.data.rev
      }
    };
  }

  /**
   * Import OneDrive file
   */
  async importOneDriveFile(userId, itemId) {
    const accessToken = await oauthManager.getAccessToken(userId, 'onedrive');
    const axios = require('axios');

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    return {
      name: response.data.name,
      mimeType: response.data.file?.mimeType,
      sizeBytes: response.data.size || 0,
      fileType: response.data.folder ? 'folder' : 'file',
      providerModifiedAt: response.data.lastModifiedDateTime,
      checksum: response.data.file?.hashes?.sha256Hash,
      providerMetadata: {
        webUrl: response.data.webUrl,
        downloadUrl: response.data['@microsoft.graph.downloadUrl']
      }
    };
  }

  // ========================================
  // UTILITIES
  // ========================================

  getMimeType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'jsx': 'application/javascript',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  transformConnectorFile(row) {
    return {
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      provider: row.provider,
      providerFileId: row.provider_file_id,
      providerPath: row.provider_path,
      name: row.name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      fileType: row.file_type,
      localPath: row.local_path,
      lastSyncedAt: row.last_synced_at,
      providerModifiedAt: row.provider_modified_at,
      syncStatus: row.sync_status,
      syncError: row.sync_error,
      providerMetadata: row.provider_metadata || {},
      version: row.version,
      checksum: row.checksum,
      parentId: row.parent_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  transformSyncJob(row) {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      jobType: row.job_type,
      status: row.status,
      totalItems: row.total_items,
      processedItems: row.processed_items,
      failedItems: row.failed_items,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = new ConnectorsAdapter();
