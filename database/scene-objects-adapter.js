/**
 * Scene Objects Database Adapter - FluxStudio Drill Writer
 *
 * Provides database operations for 3D scene objects attached to formations.
 * Supports props, primitives, custom compositions, and imported models.
 */

const { query } = require('./config');
const { v4: uuidv4 } = require('uuid');

class SceneObjectsAdapter {
  /**
   * List all scene objects for a formation
   */
  async listByFormation(formationId) {
    const result = await query(
      'SELECT * FROM formation_scene_objects WHERE formation_id = $1 ORDER BY layer ASC',
      [formationId]
    );
    return result.rows.map(row => this._transform(row));
  }

  /**
   * Get a single scene object by ID
   */
  async getById(id) {
    const result = await query(
      'SELECT * FROM formation_scene_objects WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return this._transform(result.rows[0]);
  }

  /**
   * Create a single scene object
   */
  async create({ formationId, id, name, type, position, source, attachedToPerformerId, visible, locked, layer }) {
    const objectId = id || uuidv4();
    const result = await query(`
      INSERT INTO formation_scene_objects (
        id, formation_id, name, type, position_data, source_data,
        attached_to_performer_id, visible, locked, layer, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      objectId,
      formationId,
      name,
      type,
      JSON.stringify(position),
      JSON.stringify(source),
      attachedToPerformerId || null,
      visible !== undefined ? visible : true,
      locked !== undefined ? locked : false,
      layer !== undefined ? layer : 0
    ]);
    return this._transform(result.rows[0]);
  }

  /**
   * Update a scene object
   */
  async update(id, updates) {
    const setClauses = ['updated_at = NOW()'];
    const params = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex}`);
      params.push(updates.name);
      paramIndex++;
    }

    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex}`);
      params.push(updates.type);
      paramIndex++;
    }

    if (updates.position !== undefined) {
      setClauses.push(`position_data = $${paramIndex}`);
      params.push(JSON.stringify(updates.position));
      paramIndex++;
    }

    if (updates.source !== undefined) {
      setClauses.push(`source_data = $${paramIndex}`);
      params.push(JSON.stringify(updates.source));
      paramIndex++;
    }

    if (updates.attachedToPerformerId !== undefined) {
      setClauses.push(`attached_to_performer_id = $${paramIndex}`);
      params.push(updates.attachedToPerformerId);
      paramIndex++;
    }

    if (updates.visible !== undefined) {
      setClauses.push(`visible = $${paramIndex}`);
      params.push(updates.visible);
      paramIndex++;
    }

    if (updates.locked !== undefined) {
      setClauses.push(`locked = $${paramIndex}`);
      params.push(updates.locked);
      paramIndex++;
    }

    if (updates.layer !== undefined) {
      setClauses.push(`layer = $${paramIndex}`);
      params.push(updates.layer);
      paramIndex++;
    }

    params.push(id);

    const result = await query(`
      UPDATE formation_scene_objects
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) return null;
    return this._transform(result.rows[0]);
  }

  /**
   * Remove a scene object
   */
  async remove(id) {
    await query('DELETE FROM formation_scene_objects WHERE id = $1', [id]);
  }

  /**
   * Bulk sync all scene objects for a formation.
   * Deletes objects not in the incoming array, upserts the rest.
   */
  async bulkSync(formationId, objects) {
    // Get existing IDs
    const existingResult = await query(
      'SELECT id FROM formation_scene_objects WHERE formation_id = $1',
      [formationId]
    );
    const existingIds = new Set(existingResult.rows.map(r => r.id));

    // Determine which incoming IDs we have
    const incomingIds = new Set(objects.map(o => o.id));

    // Delete objects not in the incoming set
    for (const existingId of existingIds) {
      if (!incomingIds.has(existingId)) {
        await query('DELETE FROM formation_scene_objects WHERE id = $1', [existingId]);
      }
    }

    // Upsert each object
    for (const obj of objects) {
      await query(`
        INSERT INTO formation_scene_objects (
          id, formation_id, name, type, position_data, source_data,
          attached_to_performer_id, visible, locked, layer, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          position_data = EXCLUDED.position_data,
          source_data = EXCLUDED.source_data,
          attached_to_performer_id = EXCLUDED.attached_to_performer_id,
          visible = EXCLUDED.visible,
          locked = EXCLUDED.locked,
          layer = EXCLUDED.layer,
          updated_at = NOW()
      `, [
        obj.id,
        formationId,
        obj.name,
        obj.type,
        JSON.stringify(obj.position),
        JSON.stringify(obj.source),
        obj.attachedToPerformerId || null,
        obj.visible !== undefined ? obj.visible : true,
        obj.locked !== undefined ? obj.locked : false,
        obj.layer !== undefined ? obj.layer : 0
      ]);
    }

    // Return the final state
    return this.listByFormation(formationId);
  }

  /**
   * Transform a DB row to a camelCase scene object
   */
  _transform(row) {
    return {
      id: row.id,
      formationId: row.formation_id,
      name: row.name,
      type: row.type,
      position: row.position_data,
      source: row.source_data,
      attachedToPerformerId: row.attached_to_performer_id || undefined,
      visible: row.visible,
      locked: row.locked,
      layer: row.layer,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = new SceneObjectsAdapter();
