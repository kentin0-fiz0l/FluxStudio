/**
 * Documents Routes - Project-Level Collaborative Documents API
 *
 * Provides endpoints for:
 * - Document CRUD operations
 * - Version history management
 * - Permission-based access control
 *
 * All endpoints require authentication and project membership.
 */

const express = require('express');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const documentsAdapter = require('../database/documents-adapter');

const router = express.Router();

/**
 * GET /api/projects/:projectId/documents
 * List all documents for a project
 */
router.get('/projects/:projectId/documents', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { includeArchived, limit, offset } = req.query;

    const options = {
      includeArchived: includeArchived === 'true',
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    };

    const documents = await documentsAdapter.getProjectDocuments(projectId, userId, options);

    res.json({
      success: true,
      documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error listing documents:', error);

    if (error.message.includes('access')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to view documents in this project'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list documents'
    });
  }
});

/**
 * POST /api/projects/:projectId/documents
 * Create a new document
 */
router.post('/projects/:projectId/documents', authenticateToken, rateLimitByUser(20, 60000), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { title, documentType, metadata } = req.body;

    const document = await documentsAdapter.createDocument(projectId, userId, {
      title,
      documentType,
      metadata
    });

    res.status(201).json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Error creating document:', error);

    if (error.message.includes('access')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to create documents in this project'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create document'
    });
  }
});

/**
 * GET /api/documents/:documentId
 * Get document details
 */
router.get('/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const document = await documentsAdapter.getDocument(documentId, userId);

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Error getting document:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or access denied'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document'
    });
  }
});

/**
 * PATCH /api/documents/:documentId
 * Update document metadata (title, type, archived status)
 */
router.patch('/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const document = await documentsAdapter.updateDocumentMetadata(documentId, userId, updates);

    res.json({
      success: true,
      document
    });
  } catch (error) {
    console.error('Error updating document:', error);

    if (error.message.includes('Viewers cannot edit')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions: Viewers cannot edit documents'
      });
    }

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or access denied'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update document'
    });
  }
});

/**
 * DELETE /api/documents/:documentId
 * Delete (archive) a document
 */
router.delete('/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    await documentsAdapter.deleteDocument(documentId, userId);

    res.json({
      success: true,
      message: 'Document archived successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);

    if (error.message.includes('Insufficient permissions')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or access denied'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete document'
    });
  }
});

/**
 * GET /api/documents/:documentId/versions
 * Get version history for a document
 */
router.get('/documents/:documentId/versions', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;
    const { limit, offset } = req.query;

    const options = {
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    };

    const versions = await documentsAdapter.getDocumentVersions(documentId, userId, options);

    res.json({
      success: true,
      versions,
      count: versions.length
    });
  } catch (error) {
    console.error('Error getting document versions:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Document not found or access denied'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document versions'
    });
  }
});

/**
 * GET /api/documents/:documentId/versions/:versionNumber
 * Get a specific version snapshot
 */
router.get('/documents/:documentId/versions/:versionNumber', authenticateToken, async (req, res) => {
  try {
    const { documentId, versionNumber } = req.params;
    const userId = req.user.id;

    const snapshot = await documentsAdapter.getVersionSnapshot(
      documentId,
      parseInt(versionNumber),
      userId
    );

    // Return binary snapshot
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(snapshot);
  } catch (error) {
    console.error('Error getting version snapshot:', error);

    if (error.message.includes('not found') || error.message.includes('access denied')) {
      return res.status(404).json({
        success: false,
        error: 'Version not found or access denied'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get version snapshot'
    });
  }
});

/**
 * GET /api/documents/:documentId/versions/:v1/diff/:v2
 * Get diff between two versions (TODO: Implement text comparison)
 */
router.get('/documents/:documentId/versions/:v1/diff/:v2', authenticateToken, async (req, res) => {
  try {
    const { documentId, v1, v2 } = req.params;
    const userId = req.user.id;

    // TODO: Load both versions, apply to Yjs docs, extract text, calculate diff
    // For now, return version metadata
    const versions = await documentsAdapter.getDocumentVersions(documentId, userId, {
      limit: 100,
      offset: 0
    });

    const version1 = versions.find(v => v.versionNumber === parseInt(v1));
    const version2 = versions.find(v => v.versionNumber === parseInt(v2));

    if (!version1 || !version2) {
      return res.status(404).json({
        success: false,
        error: 'One or both versions not found'
      });
    }

    res.json({
      success: true,
      diff: {
        v1: version1,
        v2: version2,
        note: 'Diff computation not yet implemented - returns version metadata only'
      }
    });
  } catch (error) {
    console.error('Error computing diff:', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compute diff'
    });
  }
});

module.exports = router;
