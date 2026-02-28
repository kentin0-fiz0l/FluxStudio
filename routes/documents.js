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
const { createLogger } = require('../lib/logger');
const log = createLogger('Documents');
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
    log.error('Error listing documents', error);

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
    log.error('Error creating document', error);

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
    log.error('Error getting document', error);

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
    log.error('Error updating document', error);

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
    log.error('Error deleting document', error);

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
    log.error('Error getting document versions', error);

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
    log.error('Error getting version snapshot', error);

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
 * Simple line-based diff algorithm
 * Computes the differences between two text strings
 */
function computeTextDiff(text1, text2) {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');

  const changes = [];
  let i = 0;
  let j = 0;

  // Simple LCS-based diff
  while (i < lines1.length || j < lines2.length) {
    if (i >= lines1.length) {
      // Remaining lines in text2 are additions
      changes.push({ type: 'add', line: j + 1, content: lines2[j] });
      j++;
    } else if (j >= lines2.length) {
      // Remaining lines in text1 are deletions
      changes.push({ type: 'remove', line: i + 1, content: lines1[i] });
      i++;
    } else if (lines1[i] === lines2[j]) {
      // Lines match - no change
      changes.push({ type: 'unchanged', line: i + 1, content: lines1[i] });
      i++;
      j++;
    } else {
      // Lines differ - check if it's a modification or add/remove
      // Look ahead to find matching lines
      let foundInText2 = lines2.slice(j, j + 5).indexOf(lines1[i]);
      let foundInText1 = lines1.slice(i, i + 5).indexOf(lines2[j]);

      if (foundInText2 > 0 && (foundInText1 < 0 || foundInText2 <= foundInText1)) {
        // Line from text1 found ahead in text2 - lines were added
        changes.push({ type: 'add', line: j + 1, content: lines2[j] });
        j++;
      } else if (foundInText1 > 0) {
        // Line from text2 found ahead in text1 - lines were removed
        changes.push({ type: 'remove', line: i + 1, content: lines1[i] });
        i++;
      } else {
        // Line was modified
        changes.push({ type: 'remove', line: i + 1, content: lines1[i] });
        changes.push({ type: 'add', line: j + 1, content: lines2[j] });
        i++;
        j++;
      }
    }
  }

  // Compute statistics
  const stats = {
    additions: changes.filter(c => c.type === 'add').length,
    deletions: changes.filter(c => c.type === 'remove').length,
    unchanged: changes.filter(c => c.type === 'unchanged').length
  };

  return { changes, stats };
}

/**
 * Extract text content from Yjs document snapshot
 * Handles common Yjs text structures
 */
function extractTextFromSnapshot(snapshot) {
  if (!snapshot || !Buffer.isBuffer(snapshot)) {
    return '';
  }

  try {
    // Try to decode the snapshot and extract text
    // Yjs snapshots are binary, so we need to decode them
    const Y = require('yjs');
    const ydoc = new Y.Doc();

    // Apply the snapshot to the doc
    Y.applyUpdate(ydoc, snapshot);

    // Try to extract text from common structures
    const ytext = ydoc.getText('content');
    if (ytext && ytext.toString()) {
      return ytext.toString();
    }

    // Try prosemirror/tiptap structure
    const yxml = ydoc.getXmlFragment('prosemirror');
    if (yxml) {
      return extractTextFromXmlFragment(yxml);
    }

    return '';
  } catch (error) {
    log.warn('Could not extract text from snapshot', error.message);
    return '';
  }
}

/**
 * Extract text from Yjs XmlFragment (for Tiptap/Prosemirror docs)
 */
function extractTextFromXmlFragment(fragment) {
  let text = '';

  const traverse = (node) => {
    if (!node) return;

    if (typeof node === 'string') {
      text += node;
      return;
    }

    if (node.toString) {
      const str = node.toString();
      if (str && typeof str === 'string') {
        text += str;
      }
    }

    // Traverse children if available
    if (node._content) {
      for (const child of node._content) {
        traverse(child);
      }
    }
  };

  traverse(fragment);
  return text;
}

/**
 * GET /api/documents/:documentId/versions/:v1/diff/:v2
 * Get diff between two versions
 */
router.get('/documents/:documentId/versions/:v1/diff/:v2', authenticateToken, async (req, res) => {
  try {
    const { documentId, v1, v2 } = req.params;
    const userId = req.user.id;

    // Get version metadata
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

    // Load both version snapshots
    let text1 = '';
    let text2 = '';

    try {
      const snapshot1 = await documentsAdapter.getVersionSnapshot(
        documentId,
        parseInt(v1),
        userId
      );
      text1 = extractTextFromSnapshot(snapshot1);
    } catch (err) {
      log.warn(`Could not load snapshot for version ${v1}`, err.message);
    }

    try {
      const snapshot2 = await documentsAdapter.getVersionSnapshot(
        documentId,
        parseInt(v2),
        userId
      );
      text2 = extractTextFromSnapshot(snapshot2);
    } catch (err) {
      log.warn(`Could not load snapshot for version ${v2}`, err.message);
    }

    // Compute diff
    const diff = computeTextDiff(text1, text2);

    res.json({
      success: true,
      diff: {
        v1: {
          versionNumber: version1.versionNumber,
          createdAt: version1.createdAt,
          createdBy: version1.createdBy,
          textLength: text1.length
        },
        v2: {
          versionNumber: version2.versionNumber,
          createdAt: version2.createdAt,
          createdBy: version2.createdBy,
          textLength: text2.length
        },
        changes: diff.changes,
        stats: diff.stats
      }
    });
  } catch (error) {
    log.error('Error computing diff', error);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compute diff'
    });
  }
});

module.exports = router;
