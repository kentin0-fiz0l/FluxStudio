/**
 * Assets Database Adapter
 *
 * Handles all database operations for the Assets system including:
 * - Asset CRUD operations
 * - Version management
 * - Relations/lineage tracking
 * - Metadata management
 * - Tags and comments
 */

const pool = require('./pool');

// ==================== ASSETS ====================

/**
 * Create a new asset
 */
async function createAsset({
  name,
  description,
  assetType = 'file',
  fileId,
  createdBy,
  projectId,
  organizationId
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create the asset
    const assetResult = await client.query(
      `INSERT INTO assets (
        name, description, asset_type, current_file_id,
        created_by, project_id, organization_id, current_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
      RETURNING *`,
      [name, description, assetType, fileId, createdBy, projectId, organizationId]
    );

    const asset = assetResult.rows[0];

    // Create initial version if fileId provided
    if (fileId) {
      await client.query(
        `INSERT INTO asset_versions (asset_id, version_number, file_id, created_by, change_summary)
         VALUES ($1, 1, $2, $3, 'Initial version')`,
        [asset.id, fileId, createdBy]
      );
    }

    await client.query('COMMIT');

    return formatAsset(asset);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get asset by ID with optional includes
 */
async function getAssetById(assetId, userId, { includeVersions = false, includeRelations = false } = {}) {
  // Get the asset
  const assetResult = await pool.query(
    `SELECT a.*,
            u.name as creator_name,
            u.email as creator_email,
            p.name as project_name,
            o.name as organization_name,
            f.name as file_name,
            f.file_url,
            f.thumbnail_url,
            f.mime_type,
            f.size as file_size
     FROM assets a
     LEFT JOIN users u ON u.id = a.created_by
     LEFT JOIN projects p ON p.id = a.project_id
     LEFT JOIN organizations o ON o.id = a.organization_id
     LEFT JOIN files f ON f.id = a.current_file_id
     WHERE a.id = $1 AND a.status != 'deleted'`,
    [assetId]
  );

  if (assetResult.rows.length === 0) {
    return null;
  }

  const asset = formatAsset(assetResult.rows[0]);

  // Include versions if requested
  if (includeVersions) {
    const versionsResult = await pool.query(
      `SELECT av.*,
              u.name as creator_name,
              f.name as file_name,
              f.file_url,
              f.thumbnail_url,
              f.size as file_size
       FROM asset_versions av
       LEFT JOIN users u ON u.id = av.created_by
       LEFT JOIN files f ON f.id = av.file_id
       WHERE av.asset_id = $1
       ORDER BY av.version_number DESC`,
      [assetId]
    );
    asset.versions = versionsResult.rows.map(formatVersion);
  }

  // Include relations if requested
  if (includeRelations) {
    const relationsResult = await pool.query(
      `SELECT ar.*,
              sa.name as source_name,
              ta.name as target_name,
              CASE
                WHEN ar.source_asset_id = $1 THEN 'outgoing'
                ELSE 'incoming'
              END as direction
       FROM asset_relations ar
       LEFT JOIN assets sa ON sa.id = ar.source_asset_id
       LEFT JOIN assets ta ON ta.id = ar.target_asset_id
       WHERE ar.source_asset_id = $1 OR ar.target_asset_id = $1`,
      [assetId]
    );
    asset.relations = relationsResult.rows.map(formatRelation);
  }

  return asset;
}

/**
 * List assets with filters and pagination
 */
async function listAssets(userId, {
  search,
  assetType,
  projectId,
  organizationId,
  status = 'active',
  tags,
  limit = 50,
  offset = 0,
  sortBy = 'created_at',
  sortOrder = 'DESC'
} = {}) {
  const conditions = ['a.status = $1'];
  const params = [status];
  let paramIndex = 2;

  // User must have access (own, project member, or org member)
  conditions.push(`(
    a.created_by = $${paramIndex}
    OR a.project_id IN (SELECT project_id FROM project_members WHERE user_id = $${paramIndex})
    OR a.organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = $${paramIndex})
  )`);
  params.push(userId);
  paramIndex++;

  if (search) {
    conditions.push(`(a.name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  if (assetType && assetType !== 'all') {
    conditions.push(`a.asset_type = $${paramIndex}`);
    params.push(assetType);
    paramIndex++;
  }

  if (projectId) {
    conditions.push(`a.project_id = $${paramIndex}`);
    params.push(projectId);
    paramIndex++;
  }

  if (organizationId) {
    conditions.push(`a.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  }

  if (tags && tags.length > 0) {
    conditions.push(`a.id IN (SELECT asset_id FROM asset_tags WHERE tag = ANY($${paramIndex}))`);
    params.push(tags);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Validate sort column
  const validSortColumns = ['created_at', 'updated_at', 'name', 'current_version'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM assets a WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get assets
  const assetsResult = await pool.query(
    `SELECT a.*,
            u.name as creator_name,
            u.email as creator_email,
            p.name as project_name,
            f.name as file_name,
            f.file_url,
            f.thumbnail_url,
            f.mime_type,
            f.size as file_size
     FROM assets a
     LEFT JOIN users u ON u.id = a.created_by
     LEFT JOIN projects p ON p.id = a.project_id
     LEFT JOIN files f ON f.id = a.current_file_id
     WHERE ${whereClause}
     ORDER BY a.${sortColumn} ${order}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    assets: assetsResult.rows.map(formatAsset),
    total,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Update asset
 */
async function updateAsset(assetId, userId, updates) {
  const allowedFields = ['name', 'description', 'asset_type', 'status', 'project_id'];
  const setClause = [];
  const params = [assetId, userId];
  let paramIndex = 3;

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(dbKey)) {
      setClause.push(`${dbKey} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (setClause.length === 0) {
    return getAssetById(assetId, userId);
  }

  const result = await pool.query(
    `UPDATE assets SET ${setClause.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND (created_by = $2 OR project_id IN (
       SELECT project_id FROM project_members WHERE user_id = $2 AND role IN ('owner', 'admin', 'editor')
     ))
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getAssetById(assetId, userId);
}

/**
 * Delete asset (soft delete)
 */
async function deleteAsset(assetId, userId) {
  const result = await pool.query(
    `UPDATE assets SET status = 'deleted', updated_at = NOW()
     WHERE id = $1 AND (created_by = $2 OR project_id IN (
       SELECT project_id FROM project_members WHERE user_id = $2 AND role IN ('owner', 'admin')
     ))
     RETURNING id`,
    [assetId, userId]
  );

  return result.rows.length > 0;
}

// ==================== VERSIONS ====================

/**
 * Create new version of asset
 */
async function createVersion(assetId, userId, { fileId, changeSummary }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current version number
    const assetResult = await client.query(
      `SELECT current_version FROM assets WHERE id = $1 FOR UPDATE`,
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      throw new Error('Asset not found');
    }

    const newVersionNumber = assetResult.rows[0].current_version + 1;

    // Create version record
    const versionResult = await client.query(
      `INSERT INTO asset_versions (asset_id, version_number, file_id, created_by, change_summary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [assetId, newVersionNumber, fileId, userId, changeSummary]
    );

    // Update asset's current version
    await client.query(
      `UPDATE assets SET current_version = $1, current_file_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [newVersionNumber, fileId, assetId]
    );

    await client.query('COMMIT');

    return formatVersion(versionResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all versions of an asset
 */
async function getVersions(assetId) {
  const result = await pool.query(
    `SELECT av.*,
            u.name as creator_name,
            f.name as file_name,
            f.file_url,
            f.thumbnail_url,
            f.size as file_size
     FROM asset_versions av
     LEFT JOIN users u ON u.id = av.created_by
     LEFT JOIN files f ON f.id = av.file_id
     WHERE av.asset_id = $1
     ORDER BY av.version_number DESC`,
    [assetId]
  );

  return result.rows.map(formatVersion);
}

/**
 * Get specific version
 */
async function getVersion(assetId, versionNumber) {
  const result = await pool.query(
    `SELECT av.*,
            u.name as creator_name,
            f.name as file_name,
            f.file_url,
            f.thumbnail_url,
            f.size as file_size,
            f.mime_type
     FROM asset_versions av
     LEFT JOIN users u ON u.id = av.created_by
     LEFT JOIN files f ON f.id = av.file_id
     WHERE av.asset_id = $1 AND av.version_number = $2`,
    [assetId, versionNumber]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return formatVersion(result.rows[0]);
}

/**
 * Revert asset to a specific version
 */
async function revertToVersion(assetId, versionNumber, userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get the version to revert to
    const versionResult = await client.query(
      `SELECT file_id FROM asset_versions WHERE asset_id = $1 AND version_number = $2`,
      [assetId, versionNumber]
    );

    if (versionResult.rows.length === 0) {
      throw new Error('Version not found');
    }

    const fileId = versionResult.rows[0].file_id;

    // Get current version
    const assetResult = await client.query(
      `SELECT current_version FROM assets WHERE id = $1 FOR UPDATE`,
      [assetId]
    );

    const newVersionNumber = assetResult.rows[0].current_version + 1;

    // Create new version pointing to old file
    await client.query(
      `INSERT INTO asset_versions (asset_id, version_number, file_id, created_by, change_summary)
       VALUES ($1, $2, $3, $4, $5)`,
      [assetId, newVersionNumber, fileId, userId, `Reverted to version ${versionNumber}`]
    );

    // Update asset
    await client.query(
      `UPDATE assets SET current_version = $1, current_file_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [newVersionNumber, fileId, assetId]
    );

    await client.query('COMMIT');

    return getAssetById(assetId, userId, { includeVersions: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==================== RELATIONS ====================

/**
 * Create relation between assets
 */
async function createRelation(sourceAssetId, targetAssetId, relationType, userId, { description, metadata } = {}) {
  const result = await pool.query(
    `INSERT INTO asset_relations (source_asset_id, target_asset_id, relation_type, description, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (source_asset_id, target_asset_id, relation_type) DO NOTHING
     RETURNING *`,
    [sourceAssetId, targetAssetId, relationType, description, JSON.stringify(metadata || {}), userId]
  );

  if (result.rows.length === 0) {
    // Relation already exists
    const existing = await pool.query(
      `SELECT * FROM asset_relations
       WHERE source_asset_id = $1 AND target_asset_id = $2 AND relation_type = $3`,
      [sourceAssetId, targetAssetId, relationType]
    );
    return formatRelation(existing.rows[0]);
  }

  return formatRelation(result.rows[0]);
}

/**
 * Get relations for an asset
 */
async function getRelations(assetId, { direction = 'both', relationType } = {}) {
  let query = `
    SELECT ar.*,
           sa.name as source_name,
           ta.name as target_name,
           CASE
             WHEN ar.source_asset_id = $1 THEN 'outgoing'
             ELSE 'incoming'
           END as direction
    FROM asset_relations ar
    LEFT JOIN assets sa ON sa.id = ar.source_asset_id
    LEFT JOIN assets ta ON ta.id = ar.target_asset_id
    WHERE `;

  const conditions = [];
  const params = [assetId];
  let paramIndex = 2;

  if (direction === 'outgoing') {
    conditions.push('ar.source_asset_id = $1');
  } else if (direction === 'incoming') {
    conditions.push('ar.target_asset_id = $1');
  } else {
    conditions.push('(ar.source_asset_id = $1 OR ar.target_asset_id = $1)');
  }

  if (relationType) {
    conditions.push(`ar.relation_type = $${paramIndex}`);
    params.push(relationType);
  }

  query += conditions.join(' AND ');

  const result = await pool.query(query, params);
  return result.rows.map(formatRelation);
}

/**
 * Delete relation
 */
async function deleteRelation(relationId, userId) {
  const result = await pool.query(
    `DELETE FROM asset_relations WHERE id = $1 AND created_by = $2 RETURNING id`,
    [relationId, userId]
  );

  return result.rows.length > 0;
}

// ==================== METADATA ====================

/**
 * Set metadata for asset
 */
async function setMetadata(assetId, key, value, userId, { valueType = 'string', category } = {}) {
  const result = await pool.query(
    `INSERT INTO asset_metadata (asset_id, key, value, value_type, category, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (asset_id, key) DO UPDATE SET
       value = EXCLUDED.value,
       value_type = EXCLUDED.value_type,
       category = EXCLUDED.category,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING *`,
    [assetId, key, value, valueType, category, userId]
  );

  return formatMetadata(result.rows[0]);
}

/**
 * Get all metadata for asset
 */
async function getMetadata(assetId, { category } = {}) {
  let query = `SELECT * FROM asset_metadata WHERE asset_id = $1`;
  const params = [assetId];

  if (category) {
    query += ` AND category = $2`;
    params.push(category);
  }

  query += ` ORDER BY category, key`;

  const result = await pool.query(query, params);
  return result.rows.map(formatMetadata);
}

/**
 * Delete metadata
 */
async function deleteMetadata(assetId, key) {
  const result = await pool.query(
    `DELETE FROM asset_metadata WHERE asset_id = $1 AND key = $2 RETURNING id`,
    [assetId, key]
  );

  return result.rows.length > 0;
}

// ==================== TAGS ====================

/**
 * Add tag to asset
 */
async function addTag(assetId, tag, userId) {
  const result = await pool.query(
    `INSERT INTO asset_tags (asset_id, tag, created_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (asset_id, tag) DO NOTHING
     RETURNING *`,
    [assetId, tag.toLowerCase().trim(), userId]
  );

  return result.rows.length > 0 ? formatTag(result.rows[0]) : null;
}

/**
 * Get tags for asset
 */
async function getTags(assetId) {
  const result = await pool.query(
    `SELECT * FROM asset_tags WHERE asset_id = $1 ORDER BY tag`,
    [assetId]
  );

  return result.rows.map(formatTag);
}

/**
 * Remove tag from asset
 */
async function removeTag(assetId, tag) {
  const result = await pool.query(
    `DELETE FROM asset_tags WHERE asset_id = $1 AND tag = $2 RETURNING id`,
    [assetId, tag.toLowerCase().trim()]
  );

  return result.rows.length > 0;
}

/**
 * Get popular tags
 */
async function getPopularTags(userId, limit = 20) {
  const result = await pool.query(
    `SELECT tag, COUNT(*) as count
     FROM asset_tags at
     JOIN assets a ON a.id = at.asset_id
     WHERE a.status = 'active' AND (
       a.created_by = $1
       OR a.project_id IN (SELECT project_id FROM project_members WHERE user_id = $1)
     )
     GROUP BY tag
     ORDER BY count DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

// ==================== COMMENTS ====================

/**
 * Add comment to asset
 */
async function addComment(assetId, userId, { content, versionId, parentCommentId }) {
  const result = await pool.query(
    `INSERT INTO asset_comments (asset_id, version_id, content, parent_comment_id, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [assetId, versionId, content, parentCommentId, userId]
  );

  return getCommentById(result.rows[0].id);
}

/**
 * Get comment by ID
 */
async function getCommentById(commentId) {
  const result = await pool.query(
    `SELECT ac.*,
            u.name as author_name,
            u.email as author_email
     FROM asset_comments ac
     LEFT JOIN users u ON u.id = ac.created_by
     WHERE ac.id = $1`,
    [commentId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return formatComment(result.rows[0]);
}

/**
 * Get comments for asset
 */
async function getComments(assetId, { versionId, includeReplies = true } = {}) {
  let query = `
    SELECT ac.*,
           u.name as author_name,
           u.email as author_email
    FROM asset_comments ac
    LEFT JOIN users u ON u.id = ac.created_by
    WHERE ac.asset_id = $1`;

  const params = [assetId];
  let paramIndex = 2;

  if (versionId) {
    query += ` AND ac.version_id = $${paramIndex}`;
    params.push(versionId);
    paramIndex++;
  }

  if (!includeReplies) {
    query += ` AND ac.parent_comment_id IS NULL`;
  }

  query += ` ORDER BY ac.created_at ASC`;

  const result = await pool.query(query, params);
  return result.rows.map(formatComment);
}

/**
 * Update comment
 */
async function updateComment(commentId, userId, content) {
  const result = await pool.query(
    `UPDATE asset_comments SET content = $1, updated_at = NOW()
     WHERE id = $2 AND created_by = $3
     RETURNING *`,
    [content, commentId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getCommentById(commentId);
}

/**
 * Delete comment
 */
async function deleteComment(commentId, userId) {
  const result = await pool.query(
    `DELETE FROM asset_comments WHERE id = $1 AND created_by = $2 RETURNING id`,
    [commentId, userId]
  );

  return result.rows.length > 0;
}

/**
 * Resolve comment
 */
async function resolveComment(commentId, userId) {
  const result = await pool.query(
    `UPDATE asset_comments SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [userId, commentId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getCommentById(commentId);
}

// ==================== STATS ====================

/**
 * Get asset statistics for user
 */
async function getStats(userId) {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total_assets,
       COUNT(DISTINCT project_id) as projects_with_assets,
       SUM(current_version) as total_versions,
       COUNT(CASE WHEN asset_type = 'media' THEN 1 END) as media_assets,
       COUNT(CASE WHEN asset_type = 'document' THEN 1 END) as document_assets,
       COUNT(CASE WHEN asset_type = 'design' THEN 1 END) as design_assets,
       COUNT(CASE WHEN asset_type = 'code' THEN 1 END) as code_assets,
       COUNT(CASE WHEN asset_type = 'file' THEN 1 END) as file_assets
     FROM assets
     WHERE status = 'active' AND (
       created_by = $1
       OR project_id IN (SELECT project_id FROM project_members WHERE user_id = $1)
       OR organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = $1)
     )`,
    [userId]
  );

  const stats = result.rows[0];

  return {
    totalAssets: parseInt(stats.total_assets, 10),
    projectsWithAssets: parseInt(stats.projects_with_assets, 10),
    totalVersions: parseInt(stats.total_versions, 10) || 0,
    byType: {
      media: parseInt(stats.media_assets, 10),
      document: parseInt(stats.document_assets, 10),
      design: parseInt(stats.design_assets, 10),
      code: parseInt(stats.code_assets, 10),
      file: parseInt(stats.file_assets, 10)
    }
  };
}

// ==================== HELPERS ====================

function formatAsset(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    assetType: row.asset_type,
    currentVersion: row.current_version,
    currentFileId: row.current_file_id,
    createdBy: row.created_by,
    creatorName: row.creator_name,
    creatorEmail: row.creator_email,
    projectId: row.project_id,
    projectName: row.project_name,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    status: row.status,
    isLocked: row.is_locked,
    lockedBy: row.locked_by,
    lockedAt: row.locked_at,
    fileName: row.file_name,
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatVersion(row) {
  return {
    id: row.id,
    assetId: row.asset_id,
    versionNumber: row.version_number,
    fileId: row.file_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    changeSummary: row.change_summary,
    createdBy: row.created_by,
    creatorName: row.creator_name,
    createdAt: row.created_at
  };
}

function formatRelation(row) {
  return {
    id: row.id,
    sourceAssetId: row.source_asset_id,
    sourceName: row.source_name,
    targetAssetId: row.target_asset_id,
    targetName: row.target_name,
    relationType: row.relation_type,
    direction: row.direction,
    description: row.description,
    metadata: row.metadata,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function formatMetadata(row) {
  return {
    id: row.id,
    assetId: row.asset_id,
    key: row.key,
    value: row.value,
    valueType: row.value_type,
    category: row.category,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function formatTag(row) {
  return {
    id: row.id,
    assetId: row.asset_id,
    tag: row.tag,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

function formatComment(row) {
  return {
    id: row.id,
    assetId: row.asset_id,
    versionId: row.version_id,
    content: row.content,
    parentCommentId: row.parent_comment_id,
    createdBy: row.created_by,
    authorName: row.author_name,
    authorEmail: row.author_email,
    isResolved: row.is_resolved,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  // Assets
  createAsset,
  getAssetById,
  listAssets,
  updateAsset,
  deleteAsset,

  // Versions
  createVersion,
  getVersions,
  getVersion,
  revertToVersion,

  // Relations
  createRelation,
  getRelations,
  deleteRelation,

  // Metadata
  setMetadata,
  getMetadata,
  deleteMetadata,

  // Tags
  addTag,
  getTags,
  removeTag,
  getPopularTags,

  // Comments
  addComment,
  getCommentById,
  getComments,
  updateComment,
  deleteComment,
  resolveComment,

  // Stats
  getStats
};
