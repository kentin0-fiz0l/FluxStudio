/**
 * Files Database Adapter - FluxStudio
 *
 * Provides database operations for the unified files system.
 * Handles both direct uploads and connector-imported files.
 *
 * Features:
 * - CRUD operations for files
 * - File listing with filters, search, and pagination
 * - Preview management
 * - Project linking
 * - Authorization enforcement
 */

const { query, transaction } = require('./config');
const { v4: uuidv4, validate: uuidValidate } = require('uuid');

/**
 * Determine file_type from mime_type
 */
function determineFileType(mimeType) {
  if (!mimeType) return 'other';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';
  if (mimeType.includes('word') || mimeType.includes('document') ||
      mimeType.includes('spreadsheet') || mimeType.includes('presentation')) {
    return 'document';
  }
  if (mimeType.includes('zip') || mimeType.includes('compressed') ||
      mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('gzip')) {
    return 'archive';
  }

  return 'other';
}

/**
 * Get file extension from name
 */
function getExtension(name) {
  if (!name) return null;
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
}

class FilesAdapter {
  /**
   * Create a new file record
   *
   * @param {Object} fileData
   * @returns {Object} Created file record
   */
  async createFile({
    userId,
    organizationId,
    projectId,
    source = 'upload',
    provider,
    connectorFileId,
    name,
    originalName,
    mimeType,
    extension,
    sizeBytes,
    storageKey,
    fileType,
    description,
    fileUrl,
    thumbnailUrl,
    metadata = {}
  }) {
    const id = uuidv4();
    const calculatedFileType = fileType || determineFileType(mimeType);
    const calculatedExtension = extension || getExtension(name);

    const result = await query(`
      INSERT INTO files (
        id, name, original_name, mime_type, size, file_url, thumbnail_url,
        uploaded_by, project_id, organization_id, source, provider,
        connector_file_id, storage_key, extension, file_type, description, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      id, name, originalName || name, mimeType, sizeBytes, fileUrl, thumbnailUrl,
      userId, projectId || null, organizationId || null, source, provider || null,
      connectorFileId || null, storageKey, calculatedExtension, calculatedFileType,
      description || null, JSON.stringify(metadata)
    ]);

    return this._transformFile(result.rows[0]);
  }

  /**
   * List files with filtering, search, and pagination
   *
   * @param {Object} options
   * @returns {Object} { items, total, page, pageSize }
   */
  async listFiles({
    userId,
    organizationId,
    projectId,
    search,
    type,
    source,
    limit = 50,
    offset = 0,
    sort = 'created_at DESC'
  }) {
    const conditions = ['f.deleted_at IS NULL'];
    const params = [];
    let paramIndex = 1;

    // User must have access (owner or organization member)
    if (userId) {
      conditions.push(`(f.uploaded_by = $${paramIndex} OR f.organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = $${paramIndex}
      ))`);
      params.push(userId);
      paramIndex++;
    }

    // Filter by organization
    if (organizationId) {
      conditions.push(`f.organization_id = $${paramIndex}`);
      params.push(organizationId);
      paramIndex++;
    }

    // Filter by project
    if (projectId) {
      conditions.push(`f.project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    // Filter by file type
    if (type && type !== 'all') {
      conditions.push(`f.file_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    // Filter by source
    if (source && source !== 'all') {
      conditions.push(`f.source = $${paramIndex}`);
      params.push(source);
      paramIndex++;
    }

    // Search in name and description
    if (search) {
      conditions.push(`(
        f.name ILIKE $${paramIndex} OR
        f.original_name ILIKE $${paramIndex} OR
        f.description ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort parameter
    const allowedSorts = ['created_at DESC', 'created_at ASC', 'name ASC', 'name DESC', 'size DESC', 'size ASC'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at DESC';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM files f ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get files with pagination
    const filesResult = await query(`
      SELECT
        f.*,
        u.name as uploader_name,
        u.email as uploader_email,
        p.name as project_name,
        o.name as organization_name
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      LEFT JOIN projects p ON f.project_id = p.id
      LEFT JOIN organizations o ON f.organization_id = o.id
      ${whereClause}
      ORDER BY f.${safeSort}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const items = filesResult.rows.map(row => this._transformFile(row));

    return {
      items,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get a single file by ID
   *
   * @param {string} fileId - File ID
   * @param {string} userId - User requesting (for authorization)
   * @returns {Object|null} File record or null
   */
  async getFileById(fileId, userId) {
    if (!uuidValidate(fileId)) return null;

    const result = await query(`
      SELECT
        f.*,
        u.name as uploader_name,
        u.email as uploader_email,
        p.name as project_name,
        o.name as organization_name
      FROM files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      LEFT JOIN projects p ON f.project_id = p.id
      LEFT JOIN organizations o ON f.organization_id = o.id
      WHERE f.id = $1 AND f.deleted_at IS NULL
        AND (f.uploaded_by = $2 OR f.organization_id IN (
          SELECT organization_id FROM organization_members WHERE user_id = $2
        ))
    `, [fileId, userId]);

    if (result.rows.length === 0) return null;

    return this._transformFile(result.rows[0]);
  }

  /**
   * Get file by ID without authorization check (internal use)
   */
  async getFileByIdInternal(fileId) {
    if (!uuidValidate(fileId)) return null;

    const result = await query(`
      SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL
    `, [fileId]);

    if (result.rows.length === 0) return null;
    return this._transformFile(result.rows[0]);
  }

  /**
   * Update file name (rename)
   *
   * @param {string} fileId
   * @param {string} userId
   * @param {string} newName
   * @returns {Object|null} Updated file or null
   */
  async updateFileName(fileId, userId, newName) {
    const file = await this.getFileById(fileId, userId);
    if (!file) return null;

    const extension = getExtension(newName);

    const result = await query(`
      UPDATE files
      SET name = $1, extension = $2, updated_at = NOW()
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [newName, extension, fileId]);

    if (result.rows.length === 0) return null;
    return this._transformFile(result.rows[0]);
  }

  /**
   * Update file metadata
   *
   * @param {string} fileId
   * @param {string} userId
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated file or null
   */
  async updateFile(fileId, userId, updates) {
    const file = await this.getFileById(fileId, userId);
    if (!file) return null;

    const allowedFields = ['name', 'description', 'project_id', 'thumbnail_url', 'metadata'];
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        params.push(key === 'metadata' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) return file;

    setClauses.push('updated_at = NOW()');
    params.push(fileId);

    const result = await query(`
      UPDATE files
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformFile(result.rows[0]);
  }

  /**
   * Soft delete a file
   *
   * @param {string} fileId
   * @param {string} userId
   * @returns {boolean} Success
   */
  async deleteFile(fileId, userId) {
    const file = await this.getFileById(fileId, userId);
    if (!file) return false;

    await query(`
      UPDATE files SET deleted_at = NOW() WHERE id = $1
    `, [fileId]);

    return true;
  }

  /**
   * Hard delete a file (permanently remove)
   *
   * @param {string} fileId
   * @returns {Object|null} Deleted file data (for storage cleanup)
   */
  async hardDeleteFile(fileId) {
    const result = await query(`
      DELETE FROM files WHERE id = $1 RETURNING *
    `, [fileId]);

    if (result.rows.length === 0) return null;
    return this._transformFile(result.rows[0]);
  }

  /**
   * Link a file to a project
   *
   * @param {Object} options
   * @returns {Object|null} Updated file
   */
  async linkFileToProject({ fileId, userId, projectId }) {
    const file = await this.getFileById(fileId, userId);
    if (!file) return null;

    const result = await query(`
      UPDATE files
      SET project_id = $1, updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [projectId, fileId]);

    if (result.rows.length === 0) return null;
    return this._transformFile(result.rows[0]);
  }

  /**
   * Unlink a file from a project
   *
   * @param {string} fileId
   * @param {string} userId
   * @returns {Object|null} Updated file
   */
  async unlinkFileFromProject(fileId, userId) {
    const file = await this.getFileById(fileId, userId);
    if (!file) return null;

    const result = await query(`
      UPDATE files
      SET project_id = NULL, updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [fileId]);

    if (result.rows.length === 0) return null;
    return this._transformFile(result.rows[0]);
  }

  // ==================== Preview Methods ====================

  /**
   * Create a preview record
   *
   * @param {Object} previewData
   * @returns {Object} Created preview
   */
  async createPreview({
    fileId,
    previewType,
    storageKey,
    width,
    height,
    pageNumber,
    textContent,
    mimeType,
    sizeBytes,
    status = 'completed'
  }) {
    const id = uuidv4();

    const result = await query(`
      INSERT INTO file_previews (
        id, file_id, preview_type, storage_key, width, height,
        page_number, text_content, mime_type, size_bytes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (file_id, preview_type, COALESCE(page_number, 0))
      DO UPDATE SET
        storage_key = EXCLUDED.storage_key,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        text_content = EXCLUDED.text_content,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
    `, [
      id, fileId, previewType, storageKey, width || null, height || null,
      pageNumber || null, textContent || null, mimeType || null, sizeBytes || null, status
    ]);

    return result.rows[0];
  }

  /**
   * Get all previews for a file
   *
   * @param {string} fileId
   * @returns {Array} Preview records
   */
  async getPreviewsForFile(fileId) {
    const result = await query(`
      SELECT * FROM file_previews
      WHERE file_id = $1
      ORDER BY preview_type, page_number
    `, [fileId]);

    return result.rows;
  }

  /**
   * Get specific preview
   *
   * @param {string} fileId
   * @param {string} previewType
   * @param {number} pageNumber
   * @returns {Object|null} Preview record
   */
  async getPreview(fileId, previewType, pageNumber = null) {
    const result = await query(`
      SELECT * FROM file_previews
      WHERE file_id = $1 AND preview_type = $2
        AND (($3::int IS NULL AND page_number IS NULL) OR page_number = $3)
    `, [fileId, previewType, pageNumber]);

    return result.rows[0] || null;
  }

  /**
   * Delete previews for a file
   *
   * @param {string} fileId
   * @returns {Array} Deleted preview records (for storage cleanup)
   */
  async deletePreviewsForFile(fileId) {
    const result = await query(`
      DELETE FROM file_previews WHERE file_id = $1 RETURNING *
    `, [fileId]);

    return result.rows;
  }

  // ==================== Connector Integration ====================

  /**
   * Create a file from a connector import
   *
   * @param {Object} options
   * @returns {Object} Created file
   */
  async createFromConnector({
    userId,
    organizationId,
    projectId,
    provider,
    connectorFileId,
    name,
    mimeType,
    sizeBytes,
    storageKey,
    fileUrl,
    thumbnailUrl,
    metadata = {}
  }) {
    return this.createFile({
      userId,
      organizationId,
      projectId,
      source: 'connector',
      provider,
      connectorFileId,
      name,
      originalName: name,
      mimeType,
      sizeBytes,
      storageKey: storageKey || `connector://${provider}/${connectorFileId}`,
      fileUrl,
      thumbnailUrl,
      metadata: {
        ...metadata,
        importedAt: new Date().toISOString(),
        importedFrom: provider
      }
    });
  }

  /**
   * Get file by connector file ID
   *
   * @param {string} connectorFileId
   * @returns {Object|null} File record
   */
  async getFileByConnectorFileId(connectorFileId) {
    if (!uuidValidate(connectorFileId)) return null;

    const result = await query(`
      SELECT * FROM files
      WHERE connector_file_id = $1 AND deleted_at IS NULL
    `, [connectorFileId]);

    if (result.rows.length === 0) return null;
    return this._transformFile(result.rows[0]);
  }

  // ==================== Stats & Analytics ====================

  /**
   * Get file statistics for a user
   *
   * @param {string} userId
   * @returns {Object} Stats
   */
  async getFileStats(userId) {
    const result = await query(`
      SELECT
        COUNT(*) as total_files,
        COALESCE(SUM(size), 0) as total_size,
        COUNT(*) FILTER (WHERE file_type = 'image') as image_count,
        COUNT(*) FILTER (WHERE file_type = 'video') as video_count,
        COUNT(*) FILTER (WHERE file_type = 'audio') as audio_count,
        COUNT(*) FILTER (WHERE file_type = 'document') as document_count,
        COUNT(*) FILTER (WHERE file_type = 'pdf') as pdf_count,
        COUNT(*) FILTER (WHERE source = 'upload') as upload_count,
        COUNT(*) FILTER (WHERE source = 'connector') as connector_count
      FROM files
      WHERE uploaded_by = $1 AND deleted_at IS NULL
    `, [userId]);

    const row = result.rows[0];
    return {
      totalFiles: parseInt(row.total_files, 10),
      totalSize: parseInt(row.total_size, 10),
      byType: {
        image: parseInt(row.image_count, 10),
        video: parseInt(row.video_count, 10),
        audio: parseInt(row.audio_count, 10),
        document: parseInt(row.document_count, 10),
        pdf: parseInt(row.pdf_count, 10)
      },
      bySource: {
        upload: parseInt(row.upload_count, 10),
        connector: parseInt(row.connector_count, 10)
      }
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Transform database row to API response format
   */
  _transformFile(row) {
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      fileUrl: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      uploadedBy: row.uploaded_by,
      uploaderName: row.uploader_name,
      uploaderEmail: row.uploader_email,
      projectId: row.project_id,
      projectName: row.project_name,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      source: row.source,
      provider: row.provider,
      connectorFileId: row.connector_file_id,
      storageKey: row.storage_key,
      extension: row.extension,
      fileType: row.file_type,
      description: row.description,
      folderPath: row.folder_path,
      metadata: row.metadata || {},
      isImage: row.file_type === 'image',
      isVideo: row.file_type === 'video',
      isAudio: row.file_type === 'audio',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    };
  }
}

// Export singleton instance
const filesAdapter = new FilesAdapter();
module.exports = filesAdapter;
