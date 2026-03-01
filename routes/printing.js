/**
 * Printing Routes - FluxPrint Integration
 *
 * Provides API endpoints for:
 * - Printer status and control
 * - Print queue management
 * - File upload and management
 * - Print job tracking
 * - Project-file associations
 * - Quick print functionality
 * - Cost/time estimation
 *
 * Extracted from server-unified.js for Phase 4.5 Technical Debt Resolution
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { createLogger } = require('../lib/logger');
const log = createLogger('Printing');
const multer = require('multer');
const FormData = require('form-data');
const path = require('path');
const { createId } = require('@paralleldrive/cuid2');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { printRateLimit, rateLimit } = require('../middleware/security');
const { csrfProtection } = require('../middleware/csrf');
const { validateUploadedFiles } = require('../lib/fileValidator');
const printJobLogger = require('../services/printJobLogger');
const { zodValidate } = require('../middleware/zodValidate');
const { printFileLinkSchema, printJobLinkSchema, printJobStatusSchema, printJobSyncSchema, quickPrintSchema, printEstimateSchema } = require('../lib/schemas');

// FluxPrint service configuration
const FLUXPRINT_URL = process.env.FLUXPRINT_SERVICE_URL || 'http://localhost:5001';

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Constants
const PRINTABLE_EXTENSIONS = ['stl', 'obj', 'gltf', 'glb', 'gcode', '3mf'];

const MATERIAL_COSTS = {
  PLA: 0.02,
  PETG: 0.025,
  ABS: 0.022,
  TPU: 0.035,
  NYLON: 0.04
};

const QUALITY_TIME_MULTIPLIERS = {
  draft: 0.6,
  standard: 1.0,
  high: 1.4,
  ultra: 2.0
};

// ========================================
// MIDDLEWARE
// ========================================

/**
 * Check if FluxPrint is enabled
 */
const checkFluxPrintEnabled = (req, res, next) => {
  if (process.env.FLUXPRINT_ENABLED !== 'true') {
    return res.status(503).json({
      error: 'FluxPrint service not enabled',
      message: 'Set FLUXPRINT_ENABLED=true to enable printing features'
    });
  }
  next();
};

// ========================================
// HELPERS
// ========================================

/**
 * Proxy request to FluxPrint service
 */
async function proxyToFluxPrint(req, res, endpoint, method = 'GET') {
  try {
    const url = `${FLUXPRINT_URL}${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        ...req.headers,
        host: new URL(FLUXPRINT_URL).host,
      },
      timeout: 30000,
      validateStatus: () => true,
    };

    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      config.data = req.body;
    }

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    log.error('FluxPrint proxy error', { endpoint, error: error.message });
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'FluxPrint service unavailable',
        message: 'Unable to connect to FluxPrint service. Please ensure it is running on port 5001.'
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({
        error: 'FluxPrint service timeout',
        message: 'The request to FluxPrint service timed out.'
      });
    } else {
      res.status(500).json({
        error: 'Proxy error',
        message: error.message
      });
    }
  }
}

/**
 * Check if user can access project
 */
async function canUserAccessProject(userId, projectId) {
  try {
    const result = await query(`
      SELECT p.id
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.id = $1
        AND (p."clientId" = $2 OR pm.user_id = $2)
        AND p.deleted_at IS NULL
      LIMIT 1
    `, [projectId, userId]);

    return result.rows.length > 0;
  } catch (error) {
    log.error('Error checking project access', error);
    return false;
  }
}

/**
 * Calculate print estimate
 */
function calculateEstimate(material, quality, copies = 1) {
  const baseMaterialGrams = 50;
  const baseTimeHours = 3;
  const materialGrams = baseMaterialGrams * copies;
  const timeHours = baseTimeHours * QUALITY_TIME_MULTIPLIERS[quality] * copies;
  const materialCost = materialGrams * MATERIAL_COSTS[material];
  const totalCost = materialCost + 5; // $5 base print fee

  return {
    timeHours: Math.floor(timeHours),
    timeMinutes: Math.round((timeHours % 1) * 60),
    materialGrams,
    materialCost: parseFloat(materialCost.toFixed(2)),
    totalCost: parseFloat(totalCost.toFixed(2)),
    confidence: 'low'
  };
}

// ========================================
// PRINTER STATUS & CONTROL
// ========================================

router.get('/status', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/printer/status');
});

router.get('/job', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/job');
});

router.get('/temperature', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/printer/temperature');
});

// ========================================
// PRINT QUEUE
// ========================================

router.get('/queue', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/queue');
});

router.post('/queue', printRateLimit, checkFluxPrintEnabled, authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id } = req.body;

    if (project_id) {
      const projectAccessQuery = await query(`
        SELECT p.id, p."clientId" as owner_id, pm.role
        FROM projects p
        LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
        WHERE p.id = $1 AND p.deleted_at IS NULL
      `, [project_id, userId]);

      if (projectAccessQuery.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projectAccessQuery.rows[0];
      const isOwner = project.owner_id === userId;
      const memberRole = project.role;
      const canPrint = isOwner || memberRole === 'manager' || memberRole === 'editor';

      if (!canPrint) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'You need owner, manager, or editor role to queue print jobs'
        });
      }
    }

    const response = await axios.post(`${FLUXPRINT_URL}/api/queue`, req.body, {
      headers: { ...req.headers, host: new URL(FLUXPRINT_URL).host },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (response.status === 200 || response.status === 201) {
      try {
        const { file_name, project_id: reqProjectId, file_id, metadata } = req.body;
        const fluxprintQueueId = response.data?.queue_id || response.data?.id;

        await printJobLogger.createPrintJob({
          file_name,
          fluxprint_queue_id: fluxprintQueueId,
          project_id: reqProjectId || null,
          file_id: file_id || null,
          metadata: metadata || {},
        });
      } catch (logError) {
        log.error('Failed to log print job', { error: logError.message });
      }
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    log.error('FluxPrint queue POST error', { error: error.message });
    res.status(500).json({ error: 'Failed to add job to queue', message: error.message });
  }
});

router.delete('/queue/:id', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, `/api/queue/${req.params.id}`, 'DELETE');
});

router.post('/queue/reorder', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/queue/reorder', 'POST');
});

router.post('/queue/:id/start', checkFluxPrintEnabled, authenticateToken, async (req, res) => {
  await proxyToFluxPrint(req, res, `/api/queue/${req.params.id}/start`, 'POST');
});

router.delete('/queue', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/queue', 'DELETE');
});

// ========================================
// FILES
// ========================================

router.get('/files', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, '/api/files');
});

router.post('/files/upload', checkFluxPrintEnabled, authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const { project_id } = req.query;
    const userId = req.user.id;

    const formData = new FormData();

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        formData.append('files', file.buffer, {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
    }

    const response = await axios.post(`${FLUXPRINT_URL}/api/files/upload`, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 60000,
      validateStatus: () => true,
    });

    if (project_id && response.status === 200 && req.files && req.files.length > 0) {
      try {
        const hasAccess = await canUserAccessProject(userId, project_id);

        if (hasAccess) {
          for (const file of req.files) {
            const filename = file.originalname;
            const existingLink = await query(
              'SELECT id FROM printing_files WHERE filename = $1 AND project_id = $2',
              [filename, project_id]
            );

            if (existingLink.rows.length === 0) {
              await query(`
                INSERT INTO printing_files (id, project_id, filename, file_size, uploaded_by)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (project_id, filename) DO NOTHING
              `, [createId(), project_id, filename, file.size, userId]);
            }
          }
          response.data.linked_to_project = project_id;
        }
      } catch (linkError) {
        log.error('Auto-link error (non-fatal)', { error: linkError.message });
      }
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    log.error('FluxPrint file upload error', { error: error.message });
    res.status(500).json({ error: 'File upload failed', message: error.message });
  }
});

router.delete('/files/:filename', checkFluxPrintEnabled, async (req, res) => {
  await proxyToFluxPrint(req, res, `/api/files/${req.params.filename}`, 'DELETE');
});

// ========================================
// CAMERA
// ========================================

router.get('/camera/stream', checkFluxPrintEnabled, async (req, res) => {
  try {
    const response = await axios({
      method: 'GET',
      url: `${FLUXPRINT_URL}/api/camera/stream`,
      responseType: 'stream',
      timeout: 0,
    });

    res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    response.data.pipe(res);

    response.data.on('error', (error) => {
      log.error('Camera stream error', { error: error.message });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Camera stream error' });
      }
    });

    req.on('close', () => {
      response.data.destroy();
    });
  } catch (error) {
    log.error('FluxPrint camera stream error', { error: error.message });
    if (!res.headersSent) {
      res.status(503).json({ error: 'Camera stream unavailable', message: error.message });
    }
  }
});

// ========================================
// PRINT JOBS
// ========================================

router.get('/jobs/active', async (req, res) => {
  try {
    const activeJobs = await printJobLogger.getActiveJobs();
    res.json(activeJobs);
  } catch (error) {
    log.error('Failed to get active jobs', { error: error.message });
    res.status(500).json({ error: 'Failed to get active jobs', message: error.message });
  }
});

router.get('/jobs/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const history = await printJobLogger.getJobHistory(limit);
    res.json(history);
  } catch (error) {
    log.error('Failed to get job history', { error: error.message });
    res.status(500).json({ error: 'Failed to get job history', message: error.message });
  }
});

router.get('/jobs/history/filter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, limit = 100, offset = 0 } = req.query;

    let queryText = `
      SELECT pj.*, p.title as project_name,
        EXTRACT(EPOCH FROM (pj.completed_at - pj.started_at))::INTEGER as duration_seconds
      FROM print_jobs pj
      LEFT JOIN projects p ON pj.project_id = p.id
      WHERE (pj.completed_at IS NOT NULL OR pj.status IN ('failed', 'canceled'))
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (project_id) {
      const hasAccess = await canUserAccessProject(userId, project_id);
      if (!hasAccess) {
        return res.status(403).json({ error: 'You do not have permission to view this project' });
      }
      queryText += ` AND pj.project_id = $${paramIndex}`;
      queryParams.push(project_id);
      paramIndex++;
    }

    queryText += ` ORDER BY COALESCE(pj.completed_at, pj.canceled_at, pj.created_at) DESC`;
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryText, queryParams);
    res.json(result.rows);
  } catch (error) {
    log.error('Failed to get filtered job history', error);
    res.status(500).json({ error: 'Failed to get filtered job history', message: error.message });
  }
});

router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await query('SELECT * FROM print_jobs WHERE id = $1', [jobId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Print job not found' });
    }
  } catch (error) {
    log.error('Failed to get print job', { error: error.message });
    res.status(500).json({ error: 'Failed to get print job', message: error.message });
  }
});

router.post('/jobs/:jobId/link', zodValidate(printJobLinkSchema), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { project_id, file_id } = req.body;

    const linked = await printJobLogger.linkToProject(jobId, project_id, file_id);
    if (linked) {
      res.json({ success: true, job: linked });
    } else {
      res.status(404).json({ error: 'Print job not found' });
    }
  } catch (error) {
    log.error('Failed to link job to project', { error: error.message });
    res.status(500).json({ error: 'Failed to link job to project', message: error.message });
  }
});

router.patch('/jobs/:jobId/status', zodValidate(printJobStatusSchema), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, progress, error_message } = req.body;

    await printJobLogger.updateJobStatus(jobId, status, progress, { error_message });

    if (status === 'completed') {
      await printJobLogger.calculatePrintTime(jobId);
    }

    res.json({ success: true, jobId, status });
  } catch (error) {
    log.error('Failed to update job status', { error: error.message });
    res.status(500).json({ error: 'Failed to update job status', message: error.message });
  }
});

router.post('/jobs/sync/:fluxprintQueueId', zodValidate(printJobSyncSchema), async (req, res) => {
  try {
    const { fluxprintQueueId } = req.params;
    const { status, progress } = req.body;

    const updated = await printJobLogger.updateJobByFluxPrintId(
      parseInt(fluxprintQueueId),
      status,
      progress
    );

    if (updated) {
      if (status === 'completed') {
        await printJobLogger.calculatePrintTime(updated.id);
      }
      res.json({ success: true, job: updated });
    } else {
      res.status(404).json({ error: 'Print job not found' });
    }
  } catch (error) {
    log.error('Failed to sync job status', { error: error.message });
    res.status(500).json({ error: 'Failed to sync job status', message: error.message });
  }
});

// ========================================
// PROJECT STATS
// ========================================

router.get('/projects/:projectId/stats', async (req, res) => {
  try {
    const { projectId } = req.params;
    const stats = await printJobLogger.getProjectStats(projectId);
    res.json(stats || { message: 'No print jobs found for this project' });
  } catch (error) {
    log.error('Failed to get project stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get project stats', message: error.message });
  }
});

router.get('/projects/:projectId/stats/detailed', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this project' });
    }

    const result = await query(
      'SELECT * FROM project_print_stats_detailed WHERE project_id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.json({ project_id: projectId, message: 'No printing activity for this project yet' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    log.error('Failed to get detailed project stats', error);
    res.status(500).json({ error: 'Failed to get detailed project stats', message: error.message });
  }
});

router.get('/projects/:projectId/files', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const hasAccess = await canUserAccessProject(userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to view this project' });
    }

    const result = await query(`
      SELECT pf.*, u.email as uploaded_by_email, COUNT(pj.id) as print_count,
        MAX(pj.completed_at) as last_printed,
        SUM(pj.material_used) FILTER (WHERE pj.status = 'completed') as total_material_used
      FROM printing_files pf
      LEFT JOIN users u ON pf.uploaded_by = u.id
      LEFT JOIN print_jobs pj ON pf.filename = pj.file_name AND pj.project_id = pf.project_id
      WHERE pf.project_id = $1
      GROUP BY pf.id, u.email
      ORDER BY pf.upload_date DESC
      LIMIT $2 OFFSET $3
    `, [projectId, limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) FROM printing_files WHERE project_id = $1',
      [projectId]
    );

    res.json({
      files: result.rows,
      total_files: parseInt(countResult.rows[0].count),
      limit,
      offset
    });
  } catch (error) {
    log.error('Failed to get project files', error);
    res.status(500).json({ error: 'Failed to get project files', message: error.message });
  }
});

// ========================================
// FILE LINKING
// ========================================

router.post('/files/:filename/link', authenticateToken, zodValidate(printFileLinkSchema), async (req, res) => {
  try {
    const { filename } = req.params;
    const { project_id, file_id, metadata, notes } = req.body;
    const userId = req.user.id;

    if (filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const hasAccess = await canUserAccessProject(userId, project_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to access this project' });
    }

    const existingLink = await query(
      'SELECT id, project_id FROM printing_files WHERE filename = $1',
      [filename]
    );

    if (existingLink.rows.length > 0) {
      const existing = existingLink.rows[0];
      if (existing.project_id !== project_id) {
        return res.status(409).json({
          error: 'File already linked to another project',
          linked_to: existing.project_id
        });
      }
      return res.status(200).json({
        success: true,
        message: 'File already linked to this project',
        file: existing
      });
    }

    const fileRecordId = createId();
    const result = await query(`
      INSERT INTO printing_files (id, project_id, file_id, filename, uploaded_by, metadata, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [fileRecordId, project_id, file_id || null, filename, userId, metadata ? JSON.stringify(metadata) : '{}', notes || null]);

    res.status(201).json({ success: true, file: result.rows[0] });
  } catch (error) {
    log.error('Failed to link file to project', error);
    res.status(500).json({ error: 'Failed to link file to project', message: error.message });
  }
});

router.delete('/files/:filename/link', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const { project_id } = req.query;
    const userId = req.user.id;

    if (filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const existingLink = await query(
      'SELECT id, project_id FROM printing_files WHERE filename = $1',
      [filename]
    );

    if (existingLink.rows.length === 0) {
      return res.status(404).json({ error: 'File link not found' });
    }

    const linkedProjectId = existingLink.rows[0].project_id;

    if (project_id && linkedProjectId !== project_id) {
      return res.status(400).json({ error: 'File is not linked to the specified project' });
    }

    const hasAccess = await canUserAccessProject(userId, linkedProjectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to modify this project' });
    }

    await query('DELETE FROM printing_files WHERE filename = $1', [filename]);
    res.json({ success: true, message: 'File unlinked from project' });
  } catch (error) {
    log.error('Failed to unlink file', error);
    res.status(500).json({ error: 'Failed to unlink file', message: error.message });
  }
});

// ========================================
// QUICK PRINT
// ========================================

router.post('/quick-print', printRateLimit, csrfProtection, authenticateToken, zodValidate(quickPrintSchema), async (req, res) => {
  try {
    const { filename, projectId, config } = req.body;
    const userId = req.user.id;

    // Check project access and role
    const projectAccessQuery = await query(`
      SELECT p.id, p."clientId" as owner_id, pm.role
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `, [projectId, userId]);

    if (projectAccessQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectAccessQuery.rows[0];
    const isOwner = project.owner_id === userId;
    const memberRole = project.role;
    const canPrint = isOwner || memberRole === 'manager' || memberRole === 'editor';

    if (!canPrint) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'You need owner, manager, or editor role to print files'
      });
    }

    // Sanitize filename
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Validate file type
    const ext = filename.toLowerCase().split('.').pop();
    if (!PRINTABLE_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        error: 'File type not supported for printing',
        supported: PRINTABLE_EXTENSIONS
      });
    }

    // Queue job with FluxPrint
    const queuePayload = {
      file_name: filename,
      project_id: projectId,
      metadata: {
        material: config.material,
        quality: config.quality,
        copies: config.copies || 1,
        supports: config.supports || false,
        infill: config.infill || 20,
        notes: config.notes || '',
        queued_by: userId,
        queued_at: new Date().toISOString()
      }
    };

    const queueResponse = await axios.post(`${FLUXPRINT_URL}/api/queue`, queuePayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true
    });

    if (queueResponse.status !== 200 && queueResponse.status !== 201) {
      return res.status(queueResponse.status).json({
        error: 'Failed to queue print job',
        message: queueResponse.data?.error || 'FluxPrint service error'
      });
    }

    const fluxprintQueueId = queueResponse.data?.queue_id || queueResponse.data?.id;

    // Create database record
    const jobId = createId();
    await query(`
      INSERT INTO print_jobs (id, fluxprint_queue_id, file_name, project_id, status, progress, print_settings, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      jobId,
      fluxprintQueueId,
      filename,
      projectId,
      'queued',
      0,
      JSON.stringify({ material: config.material, quality: config.quality, supports: config.supports, infill: config.infill }),
      JSON.stringify({ copies: config.copies, notes: config.notes, queued_by: userId })
    ]);

    // Link file to project if not already linked
    try {
      const existingLink = await query(
        'SELECT id FROM printing_files WHERE filename = $1 AND project_id = $2',
        [filename, projectId]
      );

      if (existingLink.rows.length === 0) {
        await query(`
          INSERT INTO printing_files (id, project_id, filename, uploaded_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (project_id, filename) DO NOTHING
        `, [createId(), projectId, filename, userId]);
      }
    } catch (linkError) {
      log.error('File linking error (non-fatal)', { error: linkError.message });
    }

    // Calculate estimate
    const estimate = calculateEstimate(config.material, config.quality, config.copies || 1);

    // Broadcast to project room via WebSocket
    const printingNamespace = req.app.get('printingNamespace');
    if (printingNamespace) {
      printingNamespace.to(`project:${projectId}`).emit('print:status-update', {
        fileId: jobId,
        filename,
        projectId,
        status: 'queued',
        progress: 0,
        estimate,
        queueId: fluxprintQueueId
      });
    }

    res.json({
      success: true,
      jobId,
      queueId: fluxprintQueueId,
      estimate,
      message: 'Print job queued successfully'
    });
  } catch (error) {
    log.error('Quick print error', { error: error.message });
    res.status(500).json({ error: 'Failed to queue print job', message: error.message });
  }
});

// ========================================
// ESTIMATE
// ========================================

router.post('/estimate', authenticateToken, zodValidate(printEstimateSchema), async (req, res) => {
  try {
    const { filename, material, quality, copies = 1 } = req.body;

    // Try to get accurate estimate from FluxPrint slicer API
    let estimate;
    try {
      const slicerResponse = await axios.post(
        `${FLUXPRINT_URL}/api/slicer/estimate`,
        { filename, quality },
        { timeout: 10000, validateStatus: () => true }
      );

      if (slicerResponse.status === 200 && slicerResponse.data) {
        const slicerData = slicerResponse.data;
        estimate = {
          timeHours: Math.floor(slicerData.print_time_minutes / 60),
          timeMinutes: Math.round(slicerData.print_time_minutes % 60),
          materialGrams: slicerData.filament_used_g * copies,
          materialCost: parseFloat((slicerData.filament_used_g * copies * MATERIAL_COSTS[material]).toFixed(2)),
          totalCost: parseFloat((slicerData.filament_used_g * copies * MATERIAL_COSTS[material] + 5).toFixed(2)),
          confidence: 'high'
        };
      } else {
        throw new Error('Slicer API unavailable');
      }
    } catch (_slicerError) {
      log.info('Slicer API unavailable, using rough estimate');
      estimate = calculateEstimate(material, quality, copies);
    }

    res.json(estimate);
  } catch (error) {
    log.error('Estimate calculation error', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate estimate', message: error.message });
  }
});

module.exports = router;
