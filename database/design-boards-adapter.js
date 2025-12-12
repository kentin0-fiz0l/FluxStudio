/**
 * Design Boards Database Adapter - FluxStudio
 *
 * Provides database operations for the Design Boards system.
 * Design boards are 2D collaborative surfaces for placing nodes (text, shapes, assets).
 *
 * Features:
 * - CRUD operations for boards
 * - Node management (create, update, delete, bulk update)
 * - Board statistics
 */

const { query, transaction } = require('./config');
const { v4: uuidv4 } = require('uuid');

class DesignBoardsAdapter {
  // ==================== Board Operations ====================

  /**
   * Create a new design board
   *
   * @param {Object} boardData
   * @returns {Object} Created board record
   */
  async createBoard({
    projectId,
    organizationId,
    ownerId,
    name,
    description
  }) {
    const id = uuidv4();

    const result = await query(`
      INSERT INTO design_boards (
        id, project_id, organization_id, owner_id, name, description,
        is_archived, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW(), NOW())
      RETURNING *
    `, [
      id,
      projectId,
      organizationId || null,
      ownerId,
      name,
      description || null
    ]);

    return this._transformBoard(result.rows[0]);
  }

  /**
   * Get board by ID (without nodes)
   *
   * @param {string} boardId
   * @returns {Object|null} Board record
   */
  async getBoardById(boardId) {
    const result = await query(`
      SELECT
        b.*,
        u.name as owner_name,
        p.name as project_name,
        (SELECT COUNT(*) FROM design_board_nodes WHERE board_id = b.id) as node_count
      FROM design_boards b
      LEFT JOIN users u ON b.owner_id = u.id
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE b.id = $1
    `, [boardId]);

    if (result.rows.length === 0) return null;
    return this._transformBoard(result.rows[0]);
  }

  /**
   * List boards for a project
   *
   * @param {Object} options
   * @returns {Array} Array of boards
   */
  async listBoardsForProject({ projectId, includeArchived = false }) {
    const conditions = ['b.project_id = $1'];
    const params = [projectId];

    if (!includeArchived) {
      conditions.push('b.is_archived = FALSE');
    }

    const result = await query(`
      SELECT
        b.*,
        u.name as owner_name,
        (SELECT COUNT(*) FROM design_board_nodes WHERE board_id = b.id) as node_count
      FROM design_boards b
      LEFT JOIN users u ON b.owner_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY b.created_at DESC
    `, params);

    return result.rows.map(row => this._transformBoard(row));
  }

  /**
   * Update board metadata
   *
   * @param {string} boardId
   * @param {Object} updates
   * @returns {Object|null} Updated board
   */
  async updateBoard(boardId, { name, description, isArchived, thumbnailAssetId }) {
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

    if (isArchived !== undefined) {
      setClauses.push(`is_archived = $${paramIndex}`);
      params.push(isArchived);
      paramIndex++;
    }

    if (thumbnailAssetId !== undefined) {
      setClauses.push(`thumbnail_asset_id = $${paramIndex}`);
      params.push(thumbnailAssetId);
      paramIndex++;
    }

    params.push(boardId);

    const result = await query(`
      UPDATE design_boards
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformBoard(result.rows[0]);
  }

  /**
   * Delete a board (and all nodes via CASCADE)
   *
   * @param {string} boardId
   * @returns {boolean} Success
   */
  async deleteBoard(boardId) {
    const result = await query(
      'DELETE FROM design_boards WHERE id = $1 RETURNING id',
      [boardId]
    );
    return result.rows.length > 0;
  }

  // ==================== Node Operations ====================

  /**
   * Create a new node on a board
   *
   * @param {Object} nodeData
   * @returns {Object} Created node record
   */
  async createNode({
    boardId,
    type,
    assetId,
    x = 0,
    y = 0,
    width,
    height,
    zIndex = 0,
    rotation = 0,
    locked = false,
    data = {}
  }) {
    const id = uuidv4();

    // If no zIndex provided, get the max zIndex for this board and add 1
    let finalZIndex = zIndex;
    if (zIndex === 0) {
      const maxResult = await query(
        'SELECT COALESCE(MAX(z_index), 0) as max_z FROM design_board_nodes WHERE board_id = $1',
        [boardId]
      );
      finalZIndex = parseInt(maxResult.rows[0].max_z, 10) + 1;
    }

    const result = await query(`
      INSERT INTO design_board_nodes (
        id, board_id, type, asset_id, z_index, x, y, width, height,
        rotation, locked, data, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      id,
      boardId,
      type,
      assetId || null,
      finalZIndex,
      x,
      y,
      width || null,
      height || null,
      rotation,
      locked,
      JSON.stringify(data)
    ]);

    return this._transformNode(result.rows[0]);
  }

  /**
   * Get all nodes for a board
   *
   * @param {string} boardId
   * @returns {Array} Array of nodes sorted by z_index
   */
  async getNodesForBoard(boardId) {
    const result = await query(`
      SELECT
        n.*,
        a.name as asset_name,
        a.kind as asset_kind,
        a.primary_file_id,
        f.file_url as asset_file_url,
        f.thumbnail_url as asset_thumbnail_url,
        f.mime_type as asset_mime_type
      FROM design_board_nodes n
      LEFT JOIN assets a ON n.asset_id = a.id
      LEFT JOIN files f ON a.primary_file_id = f.id
      WHERE n.board_id = $1
      ORDER BY n.z_index ASC
    `, [boardId]);

    return result.rows.map(row => this._transformNode(row));
  }

  /**
   * Update a single node
   *
   * @param {string} nodeId
   * @param {Object} patch
   * @returns {Object|null} Updated node
   */
  async updateNode(nodeId, patch) {
    const setClauses = ['updated_at = NOW()'];
    const params = [];
    let paramIndex = 1;

    const allowedFields = ['x', 'y', 'width', 'height', 'z_index', 'rotation', 'locked', 'data'];
    const fieldMap = {
      x: 'x',
      y: 'y',
      width: 'width',
      height: 'height',
      zIndex: 'z_index',
      rotation: 'rotation',
      locked: 'locked',
      data: 'data'
    };

    for (const [key, value] of Object.entries(patch)) {
      const dbField = fieldMap[key];
      if (dbField && value !== undefined) {
        setClauses.push(`${dbField} = $${paramIndex}`);
        params.push(key === 'data' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (params.length === 0) {
      // No fields to update, return existing node
      const existing = await query('SELECT * FROM design_board_nodes WHERE id = $1', [nodeId]);
      return existing.rows.length > 0 ? this._transformNode(existing.rows[0]) : null;
    }

    params.push(nodeId);

    const result = await query(`
      UPDATE design_board_nodes
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformNode(result.rows[0]);
  }

  /**
   * Delete a node
   *
   * @param {string} nodeId
   * @returns {boolean} Success
   */
  async deleteNode(nodeId) {
    const result = await query(
      'DELETE FROM design_board_nodes WHERE id = $1 RETURNING id',
      [nodeId]
    );
    return result.rows.length > 0;
  }

  /**
   * Bulk update node positions
   *
   * @param {string} boardId
   * @param {Array} updates - Array of { id, x, y, zIndex? }
   * @returns {boolean} Success
   */
  async bulkUpdateNodePositions(boardId, updates) {
    if (!updates || updates.length === 0) return true;

    // Use a single transaction for all updates
    for (const update of updates) {
      const setClauses = ['updated_at = NOW()'];
      const params = [];
      let paramIndex = 1;

      if (update.x !== undefined) {
        setClauses.push(`x = $${paramIndex}`);
        params.push(update.x);
        paramIndex++;
      }

      if (update.y !== undefined) {
        setClauses.push(`y = $${paramIndex}`);
        params.push(update.y);
        paramIndex++;
      }

      if (update.zIndex !== undefined) {
        setClauses.push(`z_index = $${paramIndex}`);
        params.push(update.zIndex);
        paramIndex++;
      }

      if (params.length > 0) {
        params.push(update.id);
        params.push(boardId);

        await query(`
          UPDATE design_board_nodes
          SET ${setClauses.join(', ')}
          WHERE id = $${paramIndex} AND board_id = $${paramIndex + 1}
        `, params);
      }
    }

    return true;
  }

  // ==================== Statistics ====================

  /**
   * Get board statistics for a project
   *
   * @param {string} projectId
   * @returns {Object} Stats
   */
  async getBoardStatsForProject(projectId) {
    const result = await query(`
      SELECT
        COUNT(DISTINCT b.id) as board_count,
        COUNT(n.id) as node_count
      FROM design_boards b
      LEFT JOIN design_board_nodes n ON n.board_id = b.id
      WHERE b.project_id = $1 AND b.is_archived = FALSE
    `, [projectId]);

    const row = result.rows[0];
    return {
      boardCount: parseInt(row.board_count, 10),
      nodeCount: parseInt(row.node_count, 10)
    };
  }

  // ==================== Events (Audit Log) ====================

  /**
   * Log a board event
   *
   * @param {Object} eventData
   * @returns {Object} Created event
   */
  async logEvent({
    boardId,
    userId,
    eventType,
    payload
  }) {
    const id = uuidv4();

    const result = await query(`
      INSERT INTO design_board_events (id, board_id, user_id, event_type, payload, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [id, boardId, userId, eventType, JSON.stringify(payload)]);

    return result.rows[0];
  }

  // ==================== Helper Methods ====================

  /**
   * Transform database row to API response format for board
   */
  _transformBoard(row) {
    if (!row) return null;

    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      organizationId: row.organization_id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      name: row.name,
      description: row.description,
      thumbnailAssetId: row.thumbnail_asset_id,
      isArchived: row.is_archived,
      nodeCount: row.node_count !== undefined ? parseInt(row.node_count, 10) : 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Transform database row to API response format for node
   */
  _transformNode(row) {
    if (!row) return null;

    const node = {
      id: row.id,
      boardId: row.board_id,
      type: row.type,
      assetId: row.asset_id,
      zIndex: row.z_index,
      x: parseFloat(row.x),
      y: parseFloat(row.y),
      width: row.width ? parseFloat(row.width) : null,
      height: row.height ? parseFloat(row.height) : null,
      rotation: parseFloat(row.rotation),
      locked: row.locked,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    // Include asset info if present
    if (row.asset_name) {
      node.asset = {
        id: row.asset_id,
        name: row.asset_name,
        kind: row.asset_kind,
        fileUrl: row.asset_file_url,
        thumbnailUrl: row.asset_thumbnail_url,
        mimeType: row.asset_mime_type
      };
    }

    return node;
  }
}

// Export singleton instance
const designBoardsAdapter = new DesignBoardsAdapter();
module.exports = designBoardsAdapter;
