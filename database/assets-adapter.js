/**
 * Assets Database Adapter - FluxStudio
 *
 * Provides database operations for the Assets system.
 * Assets are reusable, tagged, versioned creative elements that reference files.
 *
 * Features:
 * - CRUD operations for assets
 * - Version management
 * - Tag management with search
 * - Project linking
 */

const { query, transaction } = require('./config');
const { v4: uuidv4 } = require('uuid');

/**
 * Determine asset kind from mime type
 */
function determineAssetKind(mimeType) {
  if (!mimeType) return 'other';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'document';
  if (mimeType.includes('word') || mimeType.includes('document') ||
      mimeType.includes('spreadsheet') || mimeType.includes('presentation')) {
    return 'document';
  }

  return 'other';
}

class AssetsAdapter {
  /**
   * Create a new asset
   *
   * @param {Object} assetData
   * @returns {Object} Created asset record
   */
  async createAsset({
    organizationId,
    ownerId,
    name,
    kind,
    primaryFileId,
    description,
    tags = []
  }) {
    const id = uuidv4();
    const tagsArray = Array.isArray(tags) ? tags : [];

    const result = await query(`
      INSERT INTO assets (
        id, organization_id, owner_id, name, kind, primary_file_id,
        status, description, tags, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      id,
      organizationId || null,
      ownerId,
      name,
      kind || 'other',
      primaryFileId,
      description || null,
      tagsArray
    ]);

    const asset = result.rows[0];

    // Insert tags into asset_tags table for search optimization
    if (tagsArray.length > 0) {
      await this._syncAssetTags(id, tagsArray);
    }

    return this._transformAsset(asset);
  }

  /**
   * Get asset by ID with relations
   *
   * @param {string} assetId
   * @returns {Object|null} Asset with versions and projects
   */
  async getAssetById(assetId) {
    const assetResult = await query(`
      SELECT
        a.*,
        f.name as file_name,
        f.mime_type as file_mime_type,
        f.size as file_size,
        f.file_url as file_url,
        f.thumbnail_url as file_thumbnail_url,
        u.name as owner_name,
        u.email as owner_email
      FROM assets a
      LEFT JOIN files f ON a.primary_file_id = f.id
      LEFT JOIN users u ON a.owner_id = u.id
      WHERE a.id = $1
    `, [assetId]);

    if (assetResult.rows.length === 0) return null;

    const asset = this._transformAsset(assetResult.rows[0]);

    // Get versions
    asset.versions = await this.getAssetVersions(assetId);

    // Get projects
    asset.projects = await this.getAssetProjects(assetId);

    return asset;
  }

  /**
   * List assets with filtering, search, and pagination
   *
   * @param {Object} options
   * @returns {Object} { assets, total }
   */
  async listAssets({
    organizationId,
    ownerId,
    search,
    kind,
    status = 'active',
    limit = 50,
    offset = 0
  }) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Filter by organization
    if (organizationId) {
      conditions.push(`a.organization_id = $${paramIndex}`);
      params.push(organizationId);
      paramIndex++;
    }

    // Filter by owner
    if (ownerId) {
      conditions.push(`a.owner_id = $${paramIndex}`);
      params.push(ownerId);
      paramIndex++;
    }

    // Filter by kind
    if (kind && kind !== 'all') {
      conditions.push(`a.kind = $${paramIndex}`);
      params.push(kind);
      paramIndex++;
    }

    // Filter by status
    if (status && status !== 'all') {
      conditions.push(`a.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Search in name, description, and tags
    if (search) {
      conditions.push(`(
        a.name ILIKE $${paramIndex} OR
        a.description ILIKE $${paramIndex} OR
        EXISTS (
          SELECT 1 FROM asset_tags at
          WHERE at.asset_id = a.id AND LOWER(at.tag) LIKE LOWER($${paramIndex})
        )
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM assets a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get assets with file info and usage count
    const assetsResult = await query(`
      SELECT
        a.*,
        f.name as file_name,
        f.mime_type as file_mime_type,
        f.size as file_size,
        f.file_url as file_url,
        f.thumbnail_url as file_thumbnail_url,
        u.name as owner_name,
        (SELECT COUNT(*) FROM project_assets pa WHERE pa.asset_id = a.id) as usage_count
      FROM assets a
      LEFT JOIN files f ON a.primary_file_id = f.id
      LEFT JOIN users u ON a.owner_id = u.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const assets = assetsResult.rows.map(row => ({
      ...this._transformAsset(row),
      usageCount: parseInt(row.usage_count, 10)
    }));

    return { assets, total };
  }

  /**
   * Create a new asset version
   *
   * @param {Object} versionData
   * @returns {Object} Created version
   */
  async createAssetVersion({
    assetId,
    fileId,
    label,
    format,
    width,
    height,
    durationMs
  }) {
    // Get max version number
    const maxResult = await query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM asset_versions WHERE asset_id = $1',
      [assetId]
    );
    const nextVersion = parseInt(maxResult.rows[0].max_version, 10) + 1;

    const id = uuidv4();
    const result = await query(`
      INSERT INTO asset_versions (
        id, asset_id, file_id, version_number, label, width, height, duration_ms, format, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      id, assetId, fileId, nextVersion,
      label || `Version ${nextVersion}`,
      width || null, height || null, durationMs || null, format || null
    ]);

    return this._transformVersion(result.rows[0]);
  }

  /**
   * Get all versions for an asset
   *
   * @param {string} assetId
   * @returns {Array} Versions sorted by version_number DESC
   */
  async getAssetVersions(assetId) {
    const result = await query(`
      SELECT
        av.*,
        f.name as file_name,
        f.mime_type as file_mime_type,
        f.size as file_size,
        f.file_url as file_url,
        f.thumbnail_url as file_thumbnail_url
      FROM asset_versions av
      LEFT JOIN files f ON av.file_id = f.id
      WHERE av.asset_id = $1
      ORDER BY av.version_number DESC
    `, [assetId]);

    return result.rows.map(row => this._transformVersion(row));
  }

  /**
   * Attach an asset to a project
   *
   * @param {Object} options
   * @returns {boolean} Success
   */
  async attachAssetToProject({ assetId, projectId, role = 'reference', sortOrder = 0 }) {
    try {
      const id = uuidv4();
      await query(`
        INSERT INTO project_assets (id, project_id, asset_id, role, sort_order, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (project_id, asset_id, role) DO UPDATE SET
          sort_order = EXCLUDED.sort_order
      `, [id, projectId, assetId, role, sortOrder]);

      return true;
    } catch (error) {
      console.error('Error attaching asset to project:', error);
      throw error;
    }
  }

  /**
   * Detach an asset from a project
   *
   * @param {Object} options
   * @returns {boolean} Success
   */
  async detachAssetFromProject({ assetId, projectId }) {
    try {
      await query(
        'DELETE FROM project_assets WHERE asset_id = $1 AND project_id = $2',
        [assetId, projectId]
      );
      return true;
    } catch (error) {
      console.error('Error detaching asset from project:', error);
      throw error;
    }
  }

  /**
   * Get assets attached to a project
   *
   * @param {string} projectId
   * @returns {Array} Assets with project info
   */
  async getProjectAssets(projectId) {
    const result = await query(`
      SELECT
        a.*,
        f.name as file_name,
        f.mime_type as file_mime_type,
        f.size as file_size,
        f.file_url as file_url,
        f.thumbnail_url as file_thumbnail_url,
        pa.role as project_role,
        pa.sort_order,
        pa.created_at as attached_at
      FROM assets a
      JOIN project_assets pa ON a.id = pa.asset_id
      LEFT JOIN files f ON a.primary_file_id = f.id
      WHERE pa.project_id = $1
      ORDER BY pa.sort_order ASC, pa.created_at DESC
    `, [projectId]);

    return result.rows.map(row => ({
      ...this._transformAsset(row),
      projectRole: row.project_role,
      sortOrder: row.sort_order,
      attachedAt: row.attached_at
    }));
  }

  /**
   * Get projects an asset is attached to
   *
   * @param {string} assetId
   * @returns {Array} Project summaries
   */
  async getAssetProjects(assetId) {
    const result = await query(`
      SELECT p.id, p.name, p.status, pa.role, pa.created_at as attached_at
      FROM projects p
      JOIN project_assets pa ON p.id = pa.project_id
      WHERE pa.asset_id = $1
      ORDER BY pa.created_at DESC
    `, [assetId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      role: row.role,
      attachedAt: row.attached_at
    }));
  }

  /**
   * Update asset metadata
   *
   * @param {string} assetId
   * @param {Object} updates
   * @returns {Object|null} Updated asset
   */
  async updateAssetMetadata(assetId, { name, description, tags, status, kind }) {
    const setClauses = ['updated_at = NOW()'];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      setClauses.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (tags !== undefined) {
      const tagsArray = Array.isArray(tags) ? tags : [];
      setClauses.push(`tags = $${paramIndex}`);
      params.push(tagsArray);
      paramIndex++;

      // Sync tags to asset_tags table
      await this._syncAssetTags(assetId, tagsArray);
    }

    if (status !== undefined) {
      setClauses.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (kind !== undefined) {
      setClauses.push(`kind = $${paramIndex}`);
      params.push(kind);
      paramIndex++;
    }

    params.push(assetId);

    const result = await query(`
      UPDATE assets
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformAsset(result.rows[0]);
  }

  /**
   * Set primary asset version (updates primary_file_id)
   *
   * @param {string} assetId
   * @param {string} versionId
   * @returns {boolean} Success
   */
  async setPrimaryAssetVersion(assetId, versionId) {
    // Get the file_id from the version
    const versionResult = await query(
      'SELECT file_id FROM asset_versions WHERE id = $1 AND asset_id = $2',
      [versionId, assetId]
    );

    if (versionResult.rows.length === 0) {
      throw new Error('Version not found or does not belong to this asset');
    }

    const fileId = versionResult.rows[0].file_id;

    await query(
      'UPDATE assets SET primary_file_id = $1, updated_at = NOW() WHERE id = $2',
      [fileId, assetId]
    );

    return true;
  }

  /**
   * Get asset statistics for a user
   *
   * @param {string} ownerId
   * @returns {Object} Stats
   */
  async getAssetStats(ownerId) {
    const result = await query(`
      SELECT
        COUNT(*) as total_assets,
        COUNT(*) FILTER (WHERE kind = 'image') as image_count,
        COUNT(*) FILTER (WHERE kind = 'video') as video_count,
        COUNT(*) FILTER (WHERE kind = 'audio') as audio_count,
        COUNT(*) FILTER (WHERE kind = 'document') as document_count,
        COUNT(*) FILTER (WHERE kind = 'pdf') as pdf_count,
        COUNT(*) FILTER (WHERE kind = 'other') as other_count,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(*) FILTER (WHERE status = 'archived') as archived_count
      FROM assets
      WHERE owner_id = $1
    `, [ownerId]);

    const row = result.rows[0];
    return {
      totalAssets: parseInt(row.total_assets, 10),
      byKind: {
        image: parseInt(row.image_count, 10),
        video: parseInt(row.video_count, 10),
        audio: parseInt(row.audio_count, 10),
        document: parseInt(row.document_count, 10),
        pdf: parseInt(row.pdf_count, 10),
        other: parseInt(row.other_count, 10)
      },
      byStatus: {
        active: parseInt(row.active_count, 10),
        archived: parseInt(row.archived_count, 10)
      }
    };
  }

  /**
   * Delete an asset
   *
   * @param {string} assetId
   * @returns {boolean} Success
   */
  async deleteAsset(assetId) {
    // Asset versions, tags, and project_assets will be deleted via CASCADE
    const result = await query(
      'DELETE FROM assets WHERE id = $1 RETURNING id',
      [assetId]
    );
    return result.rows.length > 0;
  }

  // ==================== Helper Methods ====================

  /**
   * Sync tags to asset_tags table
   */
  async _syncAssetTags(assetId, tags) {
    // Delete existing tags
    await query('DELETE FROM asset_tags WHERE asset_id = $1', [assetId]);

    // Insert new tags
    if (tags.length > 0) {
      const values = tags.map((tag, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
      const params = tags.flatMap(tag => [uuidv4(), assetId, tag.trim()]);

      await query(`
        INSERT INTO asset_tags (id, asset_id, tag)
        VALUES ${values}
        ON CONFLICT (asset_id, tag) DO NOTHING
      `, params);
    }
  }

  /**
   * Transform database row to API response format
   */
  _transformAsset(row) {
    if (!row) return null;

    return {
      id: row.id,
      organizationId: row.organization_id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      name: row.name,
      kind: row.kind,
      status: row.status,
      description: row.description,
      tags: row.tags || [],
      primaryFileId: row.primary_file_id,
      primaryFile: row.file_url ? {
        id: row.primary_file_id,
        name: row.file_name,
        mimeType: row.file_mime_type,
        size: row.file_size,
        fileUrl: row.file_url,
        thumbnailUrl: row.file_thumbnail_url
      } : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Transform version row to API response format
   */
  _transformVersion(row) {
    if (!row) return null;

    return {
      id: row.id,
      assetId: row.asset_id,
      fileId: row.file_id,
      versionNumber: row.version_number,
      label: row.label,
      width: row.width,
      height: row.height,
      durationMs: row.duration_ms,
      format: row.format,
      file: row.file_url ? {
        name: row.file_name,
        mimeType: row.file_mime_type,
        size: row.file_size,
        fileUrl: row.file_url,
        thumbnailUrl: row.file_thumbnail_url
      } : null,
      createdAt: row.created_at
    };
  }
}

// Export singleton instance and helper function
const assetsAdapter = new AssetsAdapter();
module.exports = assetsAdapter;
module.exports.determineAssetKind = determineAssetKind;
