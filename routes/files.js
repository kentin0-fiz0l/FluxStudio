/**
 * Files Routes - File Upload, Management, and Project Attachment API
 *
 * Provides endpoints for:
 * - File listing and search
 * - File upload (single and bulk)
 * - File attachment to projects (many-to-many)
 * - File download and streaming
 * - File deletion
 *
 * All endpoints require authentication.
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const { validateInput } = require('../middleware/security');
const { csrfProtection } = require('../middleware/csrf');
const { validateUploadedFiles } = require('../lib/fileValidator');
const filesAdapter = require('../database/files-adapter');
const fileStorage = require('../storage');
const { query } = require('../database/config');

const router = express.Router();

// Configure multer for file uploads (memory storage for processing)
const fileUploadStorage = multer.memoryStorage();
const fileUpload = multer({
  storage: fileUploadStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10
  }
});

// Helper function to check project access
async function canUserAccessProject(userId, projectId) {
  try {
    const result = await query(`
      SELECT 1 FROM project_members
      WHERE project_id = $1 AND user_id = $2
      UNION
      SELECT 1 FROM projects
      WHERE id = $1 AND manager_id = $2
    `, [projectId, userId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
}

// MIME type mapping for file serving
const mimeTypes = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'mp4': 'video/mp4',
  'mp3': 'audio/mpeg',
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'json': 'application/json'
};

// Allowed file extensions
const allowedExtensions = [
  'stl', 'obj', 'gltf', 'glb', 'gcode', '3mf', // 3D files
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', // Images
  'pdf', 'doc', 'docx', 'txt', 'md' // Documents
];

/**
 * GET /api/files
 * List files with filtering and pagination
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      projectId,
      type,
      source,
      search,
      limit = 50,
      offset = 0,
      sort = 'created_at DESC'
    } = req.query;

    const result = await filesAdapter.listFiles({
      userId: req.user.id,
      projectId,
      type,
      source,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort
    });

    res.json({
      success: true,
      files: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * GET /api/files/:fileId
 * Get single file details
 */
router.get('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await filesAdapter.getFileById(fileId, req.user.id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({ success: true, file });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

/**
 * POST /api/files/upload
 * Upload one or more files
 */
router.post('/upload', authenticateToken, fileUpload.array('files', 10), validateUploadedFiles, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, organizationId } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      // Validate file size
      if (file.size > 100 * 1024 * 1024) {
        return res.status(400).json({
          error: 'File too large',
          filename: file.originalname,
          maxSize: '100MB'
        });
      }

      // Validate file type
      const ext = file.originalname.toLowerCase().split('.').pop();
      if (!allowedExtensions.includes(ext)) {
        return res.status(400).json({
          error: 'File type not allowed',
          filename: file.originalname,
          allowed: allowedExtensions
        });
      }

      // Upload to storage
      const storageKey = await fileStorage.upload(file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        userId
      });

      // Create database record
      const newFile = await filesAdapter.createFile({
        userId,
        organizationId,
        projectId,
        name: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
        source: 'upload'
      });

      uploadedFiles.push(newFile);
    }

    res.status(201).json({
      success: true,
      files: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

/**
 * DELETE /api/files/:fileId
 * Delete a file
 */
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await filesAdapter.getFileById(fileId, userId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from storage
    if (file.storageKey) {
      await fileStorage.delete(file.storageKey);
    }

    // Delete from database
    await filesAdapter.deleteFile(fileId, userId);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ==================== Project Files Join Table Endpoints ====================

/**
 * GET /api/files/:fileId/projects
 * Get projects a file is attached to (via project_files join table)
 */
router.get('/:fileId/projects', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const projects = await filesAdapter.getFileProjects(fileId);
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error getting file projects:', error);
    res.status(500).json({ error: 'Failed to get file projects' });
  }
});

/**
 * POST /api/files/:fileId/attach
 * Attach file to project (via project_files join table - allows many-to-many)
 */
router.post('/:fileId/attach', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { projectId, role = 'reference', notes } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Verify file exists and user has access
    const file = await filesAdapter.getFileById(fileId, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Attach file to project
    await filesAdapter.attachFileToProject({
      fileId,
      projectId,
      role,
      addedBy: req.user.id,
      notes
    });

    res.json({ success: true, message: 'File attached to project' });
  } catch (error) {
    console.error('Error attaching file to project:', error);
    res.status(500).json({ error: 'Failed to attach file to project' });
  }
});

/**
 * DELETE /api/files/:fileId/attach/:projectId
 * Detach file from project (via project_files join table)
 */
router.delete('/:fileId/attach/:projectId', authenticateToken, async (req, res) => {
  try {
    const { fileId, projectId } = req.params;

    await filesAdapter.detachFileFromProject({ fileId, projectId });

    res.json({ success: true, message: 'File detached from project' });
  } catch (error) {
    console.error('Error detaching file from project:', error);
    res.status(500).json({ error: 'Failed to detach file from project' });
  }
});

/**
 * GET /api/project-files/:projectId
 * Get files attached to project (via project_files join table)
 */
router.get('/project-files/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await filesAdapter.getProjectFiles(projectId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      files: result.files,
      total: result.total,
      hasMore: result.hasMore
    });
  } catch (error) {
    console.error('Error getting project files:', error);
    res.status(500).json({ error: 'Failed to get project files' });
  }
});

/**
 * POST /api/projects/:projectId/attach-file
 * Attach existing file to project (alternative route matching REST conventions)
 */
router.post('/projects/:projectId/attach-file', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fileId, role = 'reference', notes } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    // Verify file exists
    const file = await filesAdapter.getFileById(fileId, req.user.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    await filesAdapter.attachFileToProject({
      fileId,
      projectId,
      role,
      addedBy: req.user.id,
      notes
    });

    res.json({ success: true, message: 'File attached to project', file });
  } catch (error) {
    console.error('Error attaching file to project:', error);
    res.status(500).json({ error: 'Failed to attach file to project' });
  }
});

/**
 * DELETE /api/projects/:projectId/files/:fileId/detach
 * Detach file from project (alternative route)
 */
router.delete('/projects/:projectId/files/:fileId/detach', authenticateToken, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;

    await filesAdapter.detachFileFromProject({ fileId, projectId });

    res.json({ success: true, message: 'File detached from project' });
  } catch (error) {
    console.error('Error detaching file from project:', error);
    res.status(500).json({ error: 'Failed to detach file from project' });
  }
});

/**
 * GET /api/projects/:projectId/files
 * Get project files (with print status)
 */
router.get('/projects/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Check project access
    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not have permission to access this project'
      });
    }

    // Get files linked to project from database
    const result = await query(`
      SELECT
        pf.id,
        pf.filename as name,
        pf.file_size as size,
        pf.created_at as "uploadedAt",
        pf.uploaded_by as "uploadedBy",
        pj.status as "printStatus",
        pj.progress as "printProgress",
        pj.id as "printJobId"
      FROM printing_files pf
      LEFT JOIN print_jobs pj ON pf.filename = pj.file_name
        AND pj.project_id = pf.project_id
        AND pj.status IN ('queued', 'printing')
      WHERE pf.project_id = $1
      ORDER BY pf.created_at DESC
    `, [projectId]);

    // Add file type detection
    const files = result.rows.map(file => ({
      ...file,
      type: file.name ? file.name.split('.').pop()?.toLowerCase() : 'unknown',
      printStatus: file.printStatus || 'idle'
    }));

    res.json(files);

  } catch (error) {
    console.error('Failed to get project files:', error.message);
    res.status(500).json({
      error: 'Failed to get project files',
      message: error.message
    });
  }
});

/**
 * POST /api/projects/:projectId/files/upload
 * Upload files to project
 */
router.post('/projects/:projectId/files/upload',
  authenticateToken,
  fileUpload.array('files', 10),
  validateUploadedFiles,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      // Check project access
      const hasAccess = await canUserAccessProject(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'You do not have permission to access this project'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Validate file sizes (max 100MB per file)
      const MAX_FILE_SIZE = 100 * 1024 * 1024;
      for (const file of req.files) {
        if (file.size > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: 'File too large',
            filename: file.originalname,
            maxSize: '100MB'
          });
        }
      }

      // Validate file types
      for (const file of req.files) {
        const ext = file.originalname.toLowerCase().split('.').pop();
        if (!allowedExtensions.includes(ext)) {
          return res.status(400).json({
            error: 'File type not allowed',
            filename: file.originalname,
            allowed: allowedExtensions
          });
        }
      }

      const { createId } = require('@paralleldrive/cuid2');
      const uploadedFiles = [];

      for (const file of req.files) {
        try {
          // Check if already linked
          const existingLink = await query(
            'SELECT id FROM printing_files WHERE filename = $1 AND project_id = $2',
            [file.originalname, projectId]
          );

          if (existingLink.rows.length === 0) {
            const fileId = createId();
            await query(`
              INSERT INTO printing_files (
                id, project_id, filename, file_size, uploaded_by
              ) VALUES ($1, $2, $3, $4, $5)
            `, [
              fileId,
              projectId,
              file.originalname,
              file.size,
              userId
            ]);

            uploadedFiles.push({
              id: fileId,
              name: file.originalname,
              size: file.size,
              type: file.originalname.split('.').pop()?.toLowerCase()
            });
          }
        } catch (linkError) {
          console.error('File link error:', linkError.message);
        }
      }

      res.json({
        success: true,
        files: uploadedFiles,
        message: `${uploadedFiles.length} file(s) uploaded successfully`
      });

    } catch (error) {
      console.error('File upload error:', error.message);
      res.status(500).json({
        error: 'File upload failed',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/projects/:projectId/files/:fileId
 * Delete project file
 */
router.delete('/projects/:projectId/files/:fileId', csrfProtection, authenticateToken, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const userId = req.user.id;

    // Check project access
    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'You do not have permission to access this project'
      });
    }

    // Get file info
    const fileResult = await query(
      'SELECT filename FROM printing_files WHERE id = $1 AND project_id = $2',
      [fileId, projectId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from database
    await query('DELETE FROM printing_files WHERE id = $1', [fileId]);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File deletion error:', error.message);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

/**
 * GET /files/storage/*storageKey
 * Serve stored files (for file URLs)
 */
router.get('/storage/*', authenticateToken, async (req, res) => {
  try {
    // Get the storage key from the wildcard parameter
    const storageKey = req.params[0];

    // Check if file exists
    const exists = await fileStorage.exists(storageKey);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get file stream
    const stream = await fileStorage.getFileStream(storageKey);

    // Try to determine mime type from extension
    const ext = storageKey.split('.').pop()?.toLowerCase();

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=31536000');

    stream.pipe(res);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

module.exports = router;
