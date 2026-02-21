/**
 * Compliance Routes — GDPR/CCPA Data Subject Rights
 *
 * Sprint 41 T2: GDPR/CCPA Compliance Tools
 *
 * Endpoints:
 * - POST   /data-export           — Request personal data export (rate limited: 1/24h)
 * - GET    /data-export/:id       — Check export status
 * - GET    /data-export/:id/download — Download export JSON
 * - POST   /delete-account        — Request account deletion (30-day grace)
 * - POST   /cancel-deletion       — Cancel pending deletion
 * - GET    /consents              — Get current consent settings
 * - PUT    /consents              — Update consent preferences
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const {
  exportUserData,
  createExportRequest,
  completeExportRequest,
  failExportRequest,
  hasRecentExport,
  getExportRequest,
} = require('../lib/compliance/dataExporter');
const {
  requestDeletion,
  cancelDeletion,
  getDeletionStatus,
} = require('../lib/compliance/accountDeletor');
const { logAction } = require('../lib/auditLog');

// All routes require authentication
router.use(authenticateToken);

// ========================================
// POST /data-export — Request data export
// ========================================

router.post('/data-export', async (req, res) => {
  try {
    const userId = req.user.id;

    // Rate limit: 1 export request per 24 hours
    const recent = await hasRecentExport(userId);
    if (recent) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You can only request one data export every 24 hours.',
      });
    }

    // Create the export request record
    const exportReq = await createExportRequest(userId);

    // Generate the export data (synchronous for now — ZIP deferred)
    try {
      const data = await exportUserData(userId);
      const dataStr = JSON.stringify(data);
      const dataSize = Buffer.byteLength(dataStr, 'utf8');

      await completeExportRequest(exportReq.id, dataSize);

      await logAction(userId, 'data_export_requested', 'user', userId, { exportId: exportReq.id }, req);

      res.status(201).json({
        success: true,
        exportId: exportReq.id,
        status: 'completed',
        message: 'Your data export is ready for download.',
      });
    } catch (exportError) {
      await failExportRequest(exportReq.id);
      throw exportError;
    }
  } catch (error) {
    console.error('[Compliance] Data export request failed:', error);
    res.status(500).json({ error: 'Failed to create data export' });
  }
});

// ========================================
// GET /data-export/:id — Check export status
// ========================================

router.get('/data-export/:id', async (req, res) => {
  try {
    const exportReq = await getExportRequest(req.params.id, req.user.id);
    if (!exportReq) {
      return res.status(404).json({ error: 'Export request not found' });
    }

    res.json({
      id: exportReq.id,
      status: exportReq.status,
      fileSize: exportReq.file_size,
      requestedAt: exportReq.requested_at,
      completedAt: exportReq.completed_at,
      expiresAt: exportReq.expires_at,
      downloadedAt: exportReq.downloaded_at,
    });
  } catch (error) {
    console.error('[Compliance] Export status check failed:', error);
    res.status(500).json({ error: 'Failed to check export status' });
  }
});

// ========================================
// GET /data-export/:id/download — Download export
// ========================================

router.get('/data-export/:id/download', async (req, res) => {
  try {
    const exportReq = await getExportRequest(req.params.id, req.user.id);
    if (!exportReq) {
      return res.status(404).json({ error: 'Export request not found' });
    }

    if (exportReq.status !== 'completed') {
      return res.status(400).json({ error: 'Export is not ready for download', status: exportReq.status });
    }

    if (exportReq.expires_at && new Date(exportReq.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Export has expired. Please request a new one.' });
    }

    // Generate the data fresh for download
    const data = await exportUserData(req.user.id);

    // Mark as downloaded
    await query(
      `UPDATE data_export_requests SET downloaded_at = NOW() WHERE id = $1`,
      [exportReq.id]
    );

    await logAction(req.user.id, 'data_export_downloaded', 'user', req.user.id, { exportId: exportReq.id }, req);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=fluxstudio-data-export.json');
    res.json(data);
  } catch (error) {
    console.error('[Compliance] Export download failed:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

// ========================================
// POST /delete-account — Request account deletion
// ========================================

router.post('/delete-account', async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const deletionReq = await requestDeletion(userId, reason || null);

    await logAction(userId, 'deletion_request', 'user', userId, {
      reason,
      gracePeriodEnds: deletionReq.grace_period_ends,
    }, req);

    res.status(201).json({
      success: true,
      message: 'Account deletion scheduled. You have 30 days to cancel.',
      gracePeriodEnds: deletionReq.grace_period_ends,
      requestedAt: deletionReq.created_at,
    });
  } catch (error) {
    console.error('[Compliance] Delete account request failed:', error);
    res.status(500).json({ error: 'Failed to schedule account deletion' });
  }
});

// ========================================
// POST /cancel-deletion — Cancel pending deletion
// ========================================

router.post('/cancel-deletion', async (req, res) => {
  try {
    const cancelled = await cancelDeletion(req.user.id);
    if (!cancelled) {
      return res.status(404).json({ error: 'No pending deletion request found' });
    }

    await logAction(req.user.id, 'deletion_cancelled', 'user', req.user.id, {}, req);

    res.json({
      success: true,
      message: 'Account deletion has been cancelled.',
    });
  } catch (error) {
    console.error('[Compliance] Cancel deletion failed:', error);
    res.status(500).json({ error: 'Failed to cancel deletion' });
  }
});

// ========================================
// GET /consents — Get current consent settings
// ========================================

const CONSENT_TYPES = ['marketing_emails', 'analytics_tracking', 'third_party_sharing'];

router.get('/consents', async (req, res) => {
  try {
    // Get the latest consent record for each type
    const result = await query(
      `SELECT DISTINCT ON (consent_type)
              consent_type, granted, created_at
       FROM consent_records
       WHERE user_id = $1 AND consent_type = ANY($2)
       ORDER BY consent_type, created_at DESC`,
      [req.user.id, CONSENT_TYPES]
    );

    // Build consents map, defaulting to false for types without records
    const consents = {};
    for (const type of CONSENT_TYPES) {
      const record = result.rows.find(r => r.consent_type === type);
      consents[type] = {
        granted: record ? record.granted : false,
        updatedAt: record ? record.created_at : null,
      };
    }

    // Also fetch deletion status
    const deletionStatus = await getDeletionStatus(req.user.id);

    res.json({
      consents,
      deletionStatus: deletionStatus ? {
        status: deletionStatus.status,
        gracePeriodEnds: deletionStatus.grace_period_ends,
        requestedAt: deletionStatus.created_at,
      } : null,
    });
  } catch (error) {
    console.error('[Compliance] Get consents failed:', error);
    res.status(500).json({ error: 'Failed to retrieve consent settings' });
  }
});

// ========================================
// PUT /consents — Update consent preferences
// ========================================

router.put('/consents', async (req, res) => {
  try {
    const { consents } = req.body;
    if (!consents || typeof consents !== 'object') {
      return res.status(400).json({ error: 'consents object is required' });
    }

    const userId = req.user.id;
    const ip = req.ip || req.connection?.remoteAddress || null;
    const updates = [];

    for (const [type, granted] of Object.entries(consents)) {
      if (!CONSENT_TYPES.includes(type)) continue;
      if (typeof granted !== 'boolean') continue;

      await query(
        `INSERT INTO consent_records (user_id, consent_type, granted, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [userId, type, granted, ip]
      );
      updates.push({ type, granted });
    }

    if (updates.length > 0) {
      await logAction(userId, 'consent_updated', 'user', userId, { updates }, req);
    }

    res.json({
      success: true,
      message: 'Consent preferences updated.',
      updated: updates,
    });
  } catch (error) {
    console.error('[Compliance] Update consents failed:', error);
    res.status(500).json({ error: 'Failed to update consent preferences' });
  }
});

module.exports = router;
