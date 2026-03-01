/**
 * Documents Database Adapter
 * Provides database operations for project-level collaborative documents
 */

const { query, generateCuid } = require('./config');
const { createLogger } = require('../lib/logger');
const log = createLogger('DB:Documents');

class DocumentsAdapter {
  /**
   * Get all documents for a project (with permission checking via project membership)
   */
  async getProjectDocuments(projectId, userId, options = {}) {
    try {
      const { includeArchived = false, limit = 50, offset = 0 } = options;

      // Check if user has access to project
      const accessCheck = await query(`
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = $1 AND pm.user_id = $2 AND pm.is_active = true
        LIMIT 1
      `, [projectId, userId]);

      if (accessCheck.rows.length === 0) {
        throw new Error('User does not have access to this project');
      }

      // Get documents for project
      let sql = `
        SELECT
          d.*,
          u_owner.name as owner_name,
          u_owner.email as owner_email,
          u_editor.name as last_edited_by_name,
          u_editor.email as last_edited_by_email,
          (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) as version_count
        FROM documents d
        LEFT JOIN users u_owner ON d.owner_id = u_owner.id
        LEFT JOIN users u_editor ON d.last_edited_by = u_editor.id
        WHERE d.project_id = $1
      `;

      const params = [projectId];
      let paramIndex = 2;

      if (!includeArchived) {
        sql += ` AND d.is_archived = false`;
      }

      sql += ` ORDER BY d.last_edited_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      return result.rows.map(this.transformDocument);
    } catch (error) {
      log.error('Error getting project documents', error);
      throw error;
    }
  }

  /**
   * Create a new document
   */
  async createDocument(projectId, userId, data) {
    try {
      // Check if user has access to project
      const accessCheck = await query(`
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = $1 AND pm.user_id = $2 AND pm.is_active = true
        LIMIT 1
      `, [projectId, userId]);

      if (accessCheck.rows.length === 0) {
        throw new Error('User does not have access to this project');
      }

      // Generate room_id for collaboration
      const documentId = generateCuid();
      const roomId = `project-${projectId}-doc-${documentId}`;
      const now = new Date();

      // Create empty Yjs document snapshot (minimal)
      const emptySnapshot = Buffer.from([0, 0]); // Minimal valid Yjs snapshot

      const result = await query(`
        INSERT INTO documents (
          room_id, project_id, owner_id, title, document_type,
          snapshot, last_edited_by, last_edited_at,
          created_at, updated_at, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *
      `, [
        roomId,
        projectId,
        userId,
        data.title || 'Untitled Document',
        data.documentType || 'rich-text',
        emptySnapshot,
        userId,
        now,
        now,
        now,
        JSON.stringify(data.metadata || {})
      ]);

      return this.transformDocument(result.rows[0]);
    } catch (error) {
      log.error('Error creating document', error);
      throw error;
    }
  }

  /**
   * Get a single document by ID (with permission checking)
   */
  async getDocument(documentId, userId) {
    try {
      const result = await query(`
        SELECT
          d.*,
          u_owner.name as owner_name,
          u_owner.email as owner_email,
          u_editor.name as last_edited_by_name,
          u_editor.email as last_edited_by_email,
          pm.role as user_role,
          (SELECT COUNT(*) FROM document_versions dv WHERE dv.document_id = d.id) as version_count
        FROM documents d
        LEFT JOIN users u_owner ON d.owner_id = u_owner.id
        LEFT JOIN users u_editor ON d.last_edited_by = u_editor.id
        LEFT JOIN project_members pm ON d.project_id = pm.project_id AND pm.user_id = $2
        WHERE d.id = $1 AND pm.is_active = true
      `, [documentId, userId]);

      if (result.rows.length === 0) {
        throw new Error('Document not found or access denied');
      }

      return this.transformDocument(result.rows[0]);
    } catch (error) {
      log.error('Error getting document', error);
      throw error;
    }
  }

  /**
   * Get document by room_id (for collaboration server)
   */
  async getDocumentByRoomId(roomId, userId) {
    try {
      const result = await query(`
        SELECT
          d.*,
          pm.role as user_role
        FROM documents d
        LEFT JOIN project_members pm ON d.project_id = pm.project_id AND pm.user_id = $2
        WHERE d.room_id = $1 AND pm.is_active = true
      `, [roomId, userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.transformDocument(result.rows[0]);
    } catch (error) {
      log.error('Error getting document by room_id', error);
      throw error;
    }
  }

  /**
   * Update document metadata (title, type, archived status)
   */
  async updateDocumentMetadata(documentId, userId, updates) {
    try {
      // Check permission
      const doc = await this.getDocument(documentId, userId);
      if (!doc) {
        throw new Error('Document not found or access denied');
      }

      // Viewers cannot edit
      if (doc.userRole === 'viewer') {
        throw new Error('Viewers cannot edit documents');
      }

      const allowedFields = ['title', 'document_type', 'is_archived', 'metadata'];
      const updateFields = [];
      const params = [documentId];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(updates)) {
        const dbField = this.toSnakeCase(key);
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(key === 'metadata' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);

      const result = await query(`
        UPDATE documents SET ${updateFields.join(', ')}
        WHERE id = $1 RETURNING *
      `, params);

      return result.rows.length > 0 ? this.transformDocument(result.rows[0]) : null;
    } catch (error) {
      log.error('Error updating document metadata', error);
      throw error;
    }
  }

  /**
   * Delete (archive) a document
   */
  async deleteDocument(documentId, userId) {
    try {
      // Check permission
      const doc = await this.getDocument(documentId, userId);
      if (!doc) {
        throw new Error('Document not found or access denied');
      }

      // Only owner, manager, or admin can delete
      if (doc.userRole === 'viewer' || doc.userRole === 'reviewer') {
        throw new Error('Insufficient permissions to delete document');
      }

      await query(`
        UPDATE documents SET is_archived = true, updated_at = NOW()
        WHERE id = $1
      `, [documentId]);

      return true;
    } catch (error) {
      log.error('Error deleting document', error);
      throw error;
    }
  }

  /**
   * Get version history for a document
   */
  async getDocumentVersions(documentId, userId, options = {}) {
    try {
      // Check permission
      const doc = await this.getDocument(documentId, userId);
      if (!doc) {
        throw new Error('Document not found or access denied');
      }

      const { limit = 20, offset = 0 } = options;

      const result = await query(`
        SELECT
          dv.*,
          u.name as created_by_name,
          u.email as created_by_email
        FROM document_versions dv
        LEFT JOIN users u ON dv.created_by = u.id
        WHERE dv.document_id = $1
        ORDER BY dv.version_number DESC
        LIMIT $2 OFFSET $3
      `, [documentId, limit, offset]);

      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        versionNumber: row.version_number,
        isFullSnapshot: row.is_full_snapshot,
        changeDescription: row.change_description,
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        createdByEmail: row.created_by_email,
        createdAt: row.created_at,
        snapshotSize: row.snapshot ? row.snapshot.length : 0,
        diffSize: row.diff ? row.diff.length : 0
      }));
    } catch (error) {
      log.error('Error getting document versions', error);
      throw error;
    }
  }

  /**
   * Create a version snapshot
   */
  async createVersionSnapshot(documentId, versionNumber, snapshot, userId, options = {}) {
    try {
      const { isFullSnapshot = false, changeDescription = null } = options;

      const result = await query(`
        INSERT INTO document_versions (
          document_id, version_number, snapshot, is_full_snapshot,
          change_description, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        documentId,
        versionNumber,
        snapshot,
        isFullSnapshot,
        changeDescription,
        userId
      ]);

      return result.rows[0];
    } catch (error) {
      log.error('Error creating version snapshot', error);
      throw error;
    }
  }

  /**
   * Get a specific version snapshot
   */
  async getVersionSnapshot(documentId, versionNumber, userId) {
    try {
      // Check permission
      const doc = await this.getDocument(documentId, userId);
      if (!doc) {
        throw new Error('Document not found or access denied');
      }

      const result = await query(`
        SELECT snapshot FROM document_versions
        WHERE document_id = $1 AND version_number = $2
      `, [documentId, versionNumber]);

      if (result.rows.length === 0) {
        throw new Error('Version not found');
      }

      return result.rows[0].snapshot;
    } catch (error) {
      log.error('Error getting version snapshot', error);
      throw error;
    }
  }

  /**
   * Helper: Transform database row to camelCase object
   */
  transformDocument(row) {
    if (!row) return null;

    return {
      id: row.id,
      roomId: row.room_id,
      projectId: row.project_id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      title: row.title,
      documentType: row.document_type,
      isArchived: row.is_archived,
      lastEditedBy: row.last_edited_by,
      lastEditedByName: row.last_edited_by_name,
      lastEditedByEmail: row.last_edited_by_email,
      lastEditedAt: row.last_edited_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
      userRole: row.user_role,
      versionCount: parseInt(row.version_count) || 0
    };
  }

  /**
   * Helper: Convert camelCase to snake_case
   */
  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
module.exports = new DocumentsAdapter();
