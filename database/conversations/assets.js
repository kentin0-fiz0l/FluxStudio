/**
 * Conversations Assets Adapter
 * Asset retrieval and message hydration
 */

const { query } = require('../config');

/**
 * Get asset info for a message by asset ID
 * Returns file details needed for message rendering
 */
async function getAssetById(assetId) {
  if (!assetId) return null;

  const result = await query(`
    SELECT
      a.id,
      a.name,
      a.kind,
      a.owner_id,
      a.organization_id,
      a.description,
      a.created_at,
      f.id as file_id,
      f.name as file_name,
      f.original_name as file_original_name,
      f.mime_type,
      f.size as size_bytes,
      f.file_url,
      f.thumbnail_url,
      f.storage_key
    FROM assets a
    LEFT JOIN files f ON a.primary_file_id = f.id
    WHERE a.id = $1 AND a.status = 'active'
  `, [assetId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    description: row.description,
    createdAt: row.created_at,
    file: {
      id: row.file_id,
      name: row.file_name,
      originalName: row.file_original_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      url: row.file_url,
      thumbnailUrl: row.thumbnail_url,
      storageKey: row.storage_key
    }
  };
}

/**
 * Hydrate messages with asset info
 */
async function hydrateMessagesWithAssets(messages) {
  if (!messages || messages.length === 0) return messages;

  // Collect all asset IDs
  const assetIds = [...new Set(
    messages
      .filter(m => m.assetId)
      .map(m => m.assetId)
  )];

  if (assetIds.length === 0) return messages;

  // Batch fetch asset info
  const placeholders = assetIds.map((_, i) => `$${i + 1}`).join(',');
  const assetsResult = await query(`
    SELECT
      a.id,
      a.name,
      a.kind,
      a.owner_id,
      a.organization_id,
      a.description,
      a.created_at,
      f.id as file_id,
      f.name as file_name,
      f.original_name as file_original_name,
      f.mime_type,
      f.size as size_bytes,
      f.file_url,
      f.thumbnail_url,
      f.storage_key
    FROM assets a
    LEFT JOIN files f ON a.primary_file_id = f.id
    WHERE a.id IN (${placeholders}) AND a.status = 'active'
  `, assetIds);

  // Build asset map
  const assetMap = {};
  for (const row of assetsResult.rows) {
    assetMap[row.id] = {
      id: row.id,
      name: row.name,
      kind: row.kind,
      ownerId: row.owner_id,
      organizationId: row.organization_id,
      description: row.description,
      createdAt: row.created_at,
      file: {
        id: row.file_id,
        name: row.file_name,
        originalName: row.file_original_name,
        mimeType: row.mime_type,
        sizeBytes: row.size_bytes,
        url: row.file_url,
        thumbnailUrl: row.thumbnail_url,
        storageKey: row.storage_key
      }
    };
  }

  // Attach asset info to messages
  return messages.map(message => ({
    ...message,
    asset: message.assetId ? assetMap[message.assetId] || null : null
  }));
}

module.exports = {
  getAssetById,
  hydrateMessagesWithAssets
};
