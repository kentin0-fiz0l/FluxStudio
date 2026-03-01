/**
 * Media Routes - Media Transcoding and HLS Streaming API
 *
 * Provides endpoints for:
 * - Submitting media transcoding jobs
 * - Checking transcoding status
 * - Monitoring active transcoding jobs (admin)
 * - Serving HLS manifests with access control
 *
 * Extracted from server-unified.js during Sprint 18 decomposition.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('Media');
const { zodValidate } = require('../middleware/zodValidate');
const { transcodeSchema } = require('../lib/schemas');

const router = express.Router();

// Lazy-load transcoding service
let transcodingService = null;
function getTranscodingService() {
  if (!transcodingService) {
    transcodingService = require('../services/transcoding-service-do');
  }
  return transcodingService;
}

/**
 * Middleware to verify user has admin role
 */
const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role;
  const adminRoles = ['admin', 'moderator', 'analyst'];
  if (!userRole || !adminRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Submit transcoding job
router.post('/transcode', authenticateToken, zodValidate(transcodeSchema), async (req, res) => {
  try {
    const { fileId } = req.body;

    const fileResult = await query(
      'SELECT id, name, file_url, uploaded_by FROM files WHERE id = $1',
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    if (file.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const spacesKey = file.file_url.includes('digitaloceanspaces.com/')
      ? file.file_url.split('digitaloceanspaces.com/')[1]
      : file.file_url;

    const job = await getTranscodingService().createTranscodingJob({
      fileId: file.id,
      fileName: file.name,
      spacesKey: spacesKey,
      userId: req.user.id
    });

    res.json({
      message: 'Transcoding job submitted successfully',
      jobId: job.jobId,
      status: job.status,
      estimatedCompletion: '5-10 minutes',
      hlsUrl: job.outputUrl
    });

  } catch (error) {
    log.error('Transcoding submission error', error);
    res.status(500).json({
      error: 'Failed to submit transcoding job',
      details: error.message
    });
  }
});

// Get transcoding status for a file
router.get('/transcode/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const status = await getTranscodingService().getTranscodingStatus(fileId);

    if (!status) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      fileId: status.id,
      fileName: status.name,
      status: status.transcoding_status,
      jobStatus: status.job_status,
      progress: status.progress || 0,
      hlsManifestUrl: status.hls_manifest_url,
      drmProtected: status.drm_protected,
      errorMessage: status.error_message,
      createdAt: status.created_at,
      completedAt: status.completed_at
    });

  } catch (error) {
    log.error('Get transcoding status error', error);
    res.status(500).json({
      error: 'Failed to get transcoding status',
      details: error.message
    });
  }
});

// Admin endpoint: Monitor all in-progress transcoding jobs
router.post('/monitor-jobs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await getTranscodingService().monitorJobs();

    res.json({
      message: 'Job monitoring completed',
      jobsChecked: result.checked,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error('Job monitoring error', error);
    res.status(500).json({
      error: 'Failed to monitor jobs',
      details: error.message
    });
  }
});

// Get HLS manifest (with access control)
router.get('/:fileId/manifest', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const fileResult = await query(
      `SELECT id, hls_manifest_url, drm_protected, is_public, uploaded_by
       FROM files
       WHERE id = $1`,
      [fileId]
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    // Check access permissions
    if (!file.is_public && file.uploaded_by !== req.user.id) {
      const membershipCheck = await query(
        `SELECT 1 FROM (
          SELECT 1 FROM project_members pm
          JOIN files f ON f.project_id = pm.project_id
          WHERE f.id = $1 AND pm.user_id = $2

          UNION

          SELECT 1 FROM organization_members om
          JOIN projects p ON p.organization_id = om.organization_id
          JOIN files f ON f.project_id = p.id
          WHERE f.id = $1 AND om.user_id = $2

          UNION

          SELECT 1 FROM projects p
          JOIN files f ON f.project_id = p.id
          WHERE f.id = $1 AND p.owner_id = $2
        ) AS access_check
        LIMIT 1`,
        [fileId, req.user.id]
      );

      if (membershipCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (!file.hls_manifest_url) {
      return res.status(404).json({
        error: 'HLS manifest not available',
        suggestion: 'File may not be transcoded yet'
      });
    }

    res.json({
      manifestUrl: file.hls_manifest_url,
      drmProtected: file.drm_protected,
      licenseServerUrl: file.drm_protected
        ? `${process.env.FAIRPLAY_LICENSE_SERVER_URL || 'https://fluxstudio.art/fps'}/license?contentId=${fileId}`
        : null
    });

  } catch (error) {
    log.error('Get manifest error', error);
    res.status(500).json({
      error: 'Failed to get manifest',
      details: error.message
    });
  }
});

module.exports = router;
