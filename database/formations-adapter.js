/**
 * Formations Database Adapter - FluxStudio Drill Writer
 *
 * Provides database operations for the Drill Writer formations system.
 * Formations are animated sequences of performer positions for marching band drill design.
 *
 * Features:
 * - CRUD operations for formations
 * - Performer management
 * - Keyframe and position management
 * - Bulk save operations
 */

const { query, transaction } = require('./config');
const { v4: uuidv4 } = require('uuid');

class FormationsAdapter {
  // ==================== Formation Operations ====================

  /**
   * Create a new formation
   *
   * @param {Object} formationData
   * @returns {Object} Created formation record
   */
  async createFormation({
    projectId,
    name,
    description,
    stageWidth = 100,
    stageHeight = 53.3,
    gridSize = 2,
    createdBy
  }) {
    const id = uuidv4();

    const result = await query(`
      INSERT INTO formations (
        id, project_id, name, description, stage_width, stage_height, grid_size,
        created_by, is_archived, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW(), NOW())
      RETURNING *
    `, [
      id,
      projectId,
      name,
      description || null,
      stageWidth,
      stageHeight,
      gridSize,
      createdBy
    ]);

    // Create initial keyframe at time 0
    const keyframeId = uuidv4();
    await query(`
      INSERT INTO formation_keyframes (
        id, formation_id, timestamp_ms, transition, duration, sort_order, created_at, updated_at
      )
      VALUES ($1, $2, 0, 'linear', 1000, 0, NOW(), NOW())
    `, [keyframeId, id]);

    return this._transformFormation(result.rows[0]);
  }

  /**
   * Get formation by ID with all related data
   *
   * @param {string} formationId
   * @returns {Object|null} Formation with performers, keyframes, and positions
   */
  async getFormationById(formationId) {
    const formationResult = await query(`
      SELECT
        f.*,
        u.name as creator_name,
        p.name as project_name
      FROM formations f
      LEFT JOIN users u ON f.created_by = u.id
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1
    `, [formationId]);

    if (formationResult.rows.length === 0) return null;

    const formation = this._transformFormation(formationResult.rows[0]);

    // Get performers
    const performersResult = await query(`
      SELECT * FROM formation_performers
      WHERE formation_id = $1
      ORDER BY sort_order ASC
    `, [formationId]);
    formation.performers = performersResult.rows.map(row => this._transformPerformer(row));

    // Get keyframes with positions
    const keyframesResult = await query(`
      SELECT * FROM formation_keyframes
      WHERE formation_id = $1
      ORDER BY sort_order ASC
    `, [formationId]);

    formation.keyframes = [];
    for (const kfRow of keyframesResult.rows) {
      const keyframe = this._transformKeyframe(kfRow);

      // Get positions for this keyframe
      const positionsResult = await query(`
        SELECT * FROM formation_positions
        WHERE keyframe_id = $1
      `, [kfRow.id]);

      keyframe.positions = {};
      for (const posRow of positionsResult.rows) {
        keyframe.positions[posRow.performer_id] = {
          x: parseFloat(posRow.x),
          y: parseFloat(posRow.y),
          rotation: parseFloat(posRow.rotation)
        };
      }

      formation.keyframes.push(keyframe);
    }

    return formation;
  }

  /**
   * List formations for a project
   *
   * @param {Object} options
   * @returns {Array} Array of formations
   */
  async listFormationsForProject({ projectId, includeArchived = false }) {
    const conditions = ['f.project_id = $1'];
    const params = [projectId];

    if (!includeArchived) {
      conditions.push('f.is_archived = FALSE');
    }

    const result = await query(`
      SELECT
        f.*,
        u.name as creator_name,
        (SELECT COUNT(*) FROM formation_performers WHERE formation_id = f.id) as performer_count,
        (SELECT COUNT(*) FROM formation_keyframes WHERE formation_id = f.id) as keyframe_count
      FROM formations f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY f.updated_at DESC
    `, params);

    return result.rows.map(row => ({
      ...this._transformFormation(row),
      performerCount: parseInt(row.performer_count) || 0,
      keyframeCount: parseInt(row.keyframe_count) || 0
    }));
  }

  /**
   * Update formation metadata
   *
   * @param {string} formationId
   * @param {Object} updates
   * @returns {Object|null} Updated formation
   */
  async updateFormation(formationId, { name, description, stageWidth, stageHeight, gridSize, isArchived, audioTrack }) {
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

    if (stageWidth !== undefined) {
      setClauses.push(`stage_width = $${paramIndex}`);
      params.push(stageWidth);
      paramIndex++;
    }

    if (stageHeight !== undefined) {
      setClauses.push(`stage_height = $${paramIndex}`);
      params.push(stageHeight);
      paramIndex++;
    }

    if (gridSize !== undefined) {
      setClauses.push(`grid_size = $${paramIndex}`);
      params.push(gridSize);
      paramIndex++;
    }

    if (isArchived !== undefined) {
      setClauses.push(`is_archived = $${paramIndex}`);
      params.push(isArchived);
      paramIndex++;
    }

    // Handle audio track updates
    if (audioTrack !== undefined) {
      if (audioTrack === null) {
        // Remove audio track
        setClauses.push(`audio_id = NULL`);
        setClauses.push(`audio_url = NULL`);
        setClauses.push(`audio_filename = NULL`);
        setClauses.push(`audio_duration = NULL`);
      } else {
        setClauses.push(`audio_id = $${paramIndex}`);
        params.push(audioTrack.id);
        paramIndex++;

        setClauses.push(`audio_url = $${paramIndex}`);
        params.push(audioTrack.url);
        paramIndex++;

        setClauses.push(`audio_filename = $${paramIndex}`);
        params.push(audioTrack.filename);
        paramIndex++;

        setClauses.push(`audio_duration = $${paramIndex}`);
        params.push(audioTrack.duration);
        paramIndex++;
      }
    }

    params.push(formationId);

    const result = await query(`
      UPDATE formations
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformFormation(result.rows[0]);
  }

  /**
   * Delete a formation
   *
   * @param {string} formationId
   */
  async deleteFormation(formationId) {
    await query('DELETE FROM formations WHERE id = $1', [formationId]);
  }

  // ==================== Performer Operations ====================

  /**
   * Add a performer to a formation
   *
   * @param {Object} performerData
   * @returns {Object} Created performer
   */
  async addPerformer({ formationId, name, label, color, groupName }) {
    const id = uuidv4();

    // Get next sort order
    const orderResult = await query(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order
      FROM formation_performers WHERE formation_id = $1
    `, [formationId]);
    const sortOrder = orderResult.rows[0].next_order;

    const result = await query(`
      INSERT INTO formation_performers (
        id, formation_id, name, label, color, group_name, sort_order, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [id, formationId, name, label, color || '#3B82F6', groupName || null, sortOrder]);

    const performer = this._transformPerformer(result.rows[0]);

    // Add default position at center for all existing keyframes
    const keyframesResult = await query(`
      SELECT id FROM formation_keyframes WHERE formation_id = $1
    `, [formationId]);

    for (const kf of keyframesResult.rows) {
      await this.setPosition({
        keyframeId: kf.id,
        performerId: id,
        x: 50,
        y: 50,
        rotation: 0
      });
    }

    return performer;
  }

  /**
   * Update a performer
   *
   * @param {string} performerId
   * @param {Object} updates
   * @returns {Object|null} Updated performer
   */
  async updatePerformer(performerId, { name, label, color, groupName }) {
    const setClauses = ['updated_at = NOW()'];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (label !== undefined) {
      setClauses.push(`label = $${paramIndex}`);
      params.push(label);
      paramIndex++;
    }

    if (color !== undefined) {
      setClauses.push(`color = $${paramIndex}`);
      params.push(color);
      paramIndex++;
    }

    if (groupName !== undefined) {
      setClauses.push(`group_name = $${paramIndex}`);
      params.push(groupName);
      paramIndex++;
    }

    params.push(performerId);

    const result = await query(`
      UPDATE formation_performers
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformPerformer(result.rows[0]);
  }

  /**
   * Delete a performer
   *
   * @param {string} performerId
   */
  async deletePerformer(performerId) {
    await query('DELETE FROM formation_performers WHERE id = $1', [performerId]);
  }

  // ==================== Keyframe Operations ====================

  /**
   * Add a keyframe to a formation
   *
   * @param {Object} keyframeData
   * @returns {Object} Created keyframe
   */
  async addKeyframe({ formationId, timestampMs, transition = 'linear', duration = 1000 }) {
    const id = uuidv4();

    // Get next sort order
    const orderResult = await query(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order
      FROM formation_keyframes WHERE formation_id = $1
    `, [formationId]);
    const sortOrder = orderResult.rows[0].next_order;

    const result = await query(`
      INSERT INTO formation_keyframes (
        id, formation_id, timestamp_ms, transition, duration, sort_order, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [id, formationId, timestampMs, transition, duration, sortOrder]);

    const keyframe = this._transformKeyframe(result.rows[0]);

    // Copy positions from previous keyframe or set defaults
    const prevKeyframe = await query(`
      SELECT id FROM formation_keyframes
      WHERE formation_id = $1 AND sort_order < $2
      ORDER BY sort_order DESC
      LIMIT 1
    `, [formationId, sortOrder]);

    if (prevKeyframe.rows.length > 0) {
      // Copy positions from previous keyframe
      const positions = await query(`
        SELECT performer_id, x, y, rotation FROM formation_positions
        WHERE keyframe_id = $1
      `, [prevKeyframe.rows[0].id]);

      for (const pos of positions.rows) {
        await this.setPosition({
          keyframeId: id,
          performerId: pos.performer_id,
          x: parseFloat(pos.x),
          y: parseFloat(pos.y),
          rotation: parseFloat(pos.rotation)
        });
      }
    } else {
      // Set default positions for all performers
      const performers = await query(`
        SELECT id FROM formation_performers WHERE formation_id = $1
      `, [formationId]);

      for (const performer of performers.rows) {
        await this.setPosition({
          keyframeId: id,
          performerId: performer.id,
          x: 50,
          y: 50,
          rotation: 0
        });
      }
    }

    return keyframe;
  }

  /**
   * Update a keyframe
   *
   * @param {string} keyframeId
   * @param {Object} updates
   * @returns {Object|null} Updated keyframe
   */
  async updateKeyframe(keyframeId, { timestampMs, transition, duration }) {
    const setClauses = ['updated_at = NOW()'];
    const params = [];
    let paramIndex = 1;

    if (timestampMs !== undefined) {
      setClauses.push(`timestamp_ms = $${paramIndex}`);
      params.push(timestampMs);
      paramIndex++;
    }

    if (transition !== undefined) {
      setClauses.push(`transition = $${paramIndex}`);
      params.push(transition);
      paramIndex++;
    }

    if (duration !== undefined) {
      setClauses.push(`duration = $${paramIndex}`);
      params.push(duration);
      paramIndex++;
    }

    params.push(keyframeId);

    const result = await query(`
      UPDATE formation_keyframes
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transformKeyframe(result.rows[0]);
  }

  /**
   * Delete a keyframe
   *
   * @param {string} keyframeId
   */
  async deleteKeyframe(keyframeId) {
    await query('DELETE FROM formation_keyframes WHERE id = $1', [keyframeId]);
  }

  // ==================== Position Operations ====================

  /**
   * Set or update a performer position at a keyframe
   *
   * @param {Object} positionData
   * @returns {Object} Position data
   */
  async setPosition({ keyframeId, performerId, x, y, rotation = 0 }) {
    const id = uuidv4();

    const result = await query(`
      INSERT INTO formation_positions (
        id, keyframe_id, performer_id, x, y, rotation, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (keyframe_id, performer_id)
      DO UPDATE SET x = $4, y = $5, rotation = $6, updated_at = NOW()
      RETURNING *
    `, [id, keyframeId, performerId, x, y, rotation]);

    return {
      performerId: result.rows[0].performer_id,
      x: parseFloat(result.rows[0].x),
      y: parseFloat(result.rows[0].y),
      rotation: parseFloat(result.rows[0].rotation)
    };
  }

  /**
   * Bulk save all positions for a formation
   * Used when saving the entire formation state
   *
   * @param {string} formationId
   * @param {Object} data - { performers, keyframes with positions }
   */
  async saveFormation(formationId, { name, performers, keyframes }) {
    // Update formation name if provided
    if (name) {
      await this.updateFormation(formationId, { name });
    }

    // Get existing performers and keyframes
    const existingPerformers = await query(`
      SELECT id FROM formation_performers WHERE formation_id = $1
    `, [formationId]);
    const existingPerformerIds = new Set(existingPerformers.rows.map(p => p.id));

    const existingKeyframes = await query(`
      SELECT id FROM formation_keyframes WHERE formation_id = $1
    `, [formationId]);
    const existingKeyframeIds = new Set(existingKeyframes.rows.map(k => k.id));

    // Process performers
    const newPerformerIds = new Set();
    for (let i = 0; i < performers.length; i++) {
      const performer = performers[i];
      newPerformerIds.add(performer.id);

      if (existingPerformerIds.has(performer.id)) {
        // Update existing performer
        await this.updatePerformer(performer.id, {
          name: performer.name,
          label: performer.label,
          color: performer.color,
          groupName: performer.group
        });
        await query(`
          UPDATE formation_performers SET sort_order = $1 WHERE id = $2
        `, [i, performer.id]);
      } else {
        // Insert new performer
        await query(`
          INSERT INTO formation_performers (
            id, formation_id, name, label, color, group_name, sort_order, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [performer.id, formationId, performer.name, performer.label, performer.color, performer.group || null, i]);
      }
    }

    // Delete removed performers
    for (const existingId of existingPerformerIds) {
      if (!newPerformerIds.has(existingId)) {
        await this.deletePerformer(existingId);
      }
    }

    // Process keyframes
    const newKeyframeIds = new Set();
    for (let i = 0; i < keyframes.length; i++) {
      const keyframe = keyframes[i];
      newKeyframeIds.add(keyframe.id);

      if (existingKeyframeIds.has(keyframe.id)) {
        // Update existing keyframe
        await this.updateKeyframe(keyframe.id, {
          timestampMs: keyframe.timestamp,
          transition: keyframe.transition,
          duration: keyframe.duration
        });
        await query(`
          UPDATE formation_keyframes SET sort_order = $1 WHERE id = $2
        `, [i, keyframe.id]);
      } else {
        // Insert new keyframe
        await query(`
          INSERT INTO formation_keyframes (
            id, formation_id, timestamp_ms, transition, duration, sort_order, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [keyframe.id, formationId, keyframe.timestamp || 0, keyframe.transition || 'linear', keyframe.duration || 1000, i]);
      }

      // Update positions for this keyframe
      if (keyframe.positions) {
        // Delete existing positions for this keyframe
        await query(`DELETE FROM formation_positions WHERE keyframe_id = $1`, [keyframe.id]);

        // Insert new positions
        const positions = keyframe.positions instanceof Map
          ? Object.fromEntries(keyframe.positions)
          : keyframe.positions;

        for (const [performerId, pos] of Object.entries(positions)) {
          if (newPerformerIds.has(performerId)) {
            await this.setPosition({
              keyframeId: keyframe.id,
              performerId,
              x: pos.x,
              y: pos.y,
              rotation: pos.rotation || 0
            });
          }
        }
      }
    }

    // Delete removed keyframes
    for (const existingId of existingKeyframeIds) {
      if (!newKeyframeIds.has(existingId)) {
        await this.deleteKeyframe(existingId);
      }
    }

    // Update formation timestamp
    await query(`UPDATE formations SET updated_at = NOW() WHERE id = $1`, [formationId]);

    // Return the updated formation
    return this.getFormationById(formationId);
  }

  // ==================== Transform Helpers ====================

  _transformFormation(row) {
    // Build audioTrack object if audio data exists
    const audioTrack = row.audio_id ? {
      id: row.audio_id,
      url: row.audio_url,
      filename: row.audio_filename,
      duration: row.audio_duration ? parseInt(row.audio_duration) : 0
    } : undefined;

    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      stageWidth: parseFloat(row.stage_width),
      stageHeight: parseFloat(row.stage_height),
      gridSize: parseFloat(row.grid_size),
      audioTrack,
      musicTrackUrl: row.music_track_url || (audioTrack ? audioTrack.url : undefined),
      musicDuration: row.music_duration || (audioTrack ? audioTrack.duration : undefined),
      isArchived: row.is_archived,
      createdBy: row.created_by,
      creatorName: row.creator_name,
      projectName: row.project_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _transformPerformer(row) {
    return {
      id: row.id,
      formationId: row.formation_id,
      name: row.name,
      label: row.label,
      color: row.color,
      group: row.group_name,
      sortOrder: row.sort_order
    };
  }

  _transformKeyframe(row) {
    return {
      id: row.id,
      formationId: row.formation_id,
      timestamp: row.timestamp_ms,
      transition: row.transition,
      duration: row.duration,
      sortOrder: row.sort_order
    };
  }
}

module.exports = new FormationsAdapter();
