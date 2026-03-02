/**
 * Account Routes — GDPR Data Export & Deletion
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Endpoints:
 * - GET    /api/account/export        — Download personal data (JSON)
 * - POST   /api/account/delete        — Request account deletion (30-day delay)
 * - DELETE /api/account/delete         — Cancel pending deletion
 * - GET    /api/account/delete/status  — Check deletion request status
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { logAction } = require('../lib/auditLog');
const { zodValidate } = require('../middleware/zodValidate');
const { deleteAccountSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('Account');

router.use(authenticateToken);

/**
 * GET /api/account/export
 *
 * GDPR Article 20 — Data portability.
 * Returns all personal data as a downloadable JSON file.
 */
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.id;

    // Gather user profile
    const userResult = await query(
      `SELECT id, name, email, user_type, avatar_url, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'ACCOUNT_NOT_FOUND' });
    }

    // Gather projects
    const projectsResult = await query(
      `SELECT id, name, description, status, created_at
       FROM projects WHERE manager_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Gather files
    const filesResult = await query(
      `SELECT id, original_name, file_type, file_size, created_at
       FROM files WHERE uploaded_by = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Gather audit log entries for this user
    const auditResult = await query(
      `SELECT action, resource_type, resource_id, details, ip_address, created_at
       FROM audit_logs WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1000`,
      [userId]
    );

    // Gather org memberships
    const orgsResult = await query(
      `SELECT o.id, o.name, om.role, om.joined_at
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1`,
      [userId]
    );

    const exportData = {
      exportDate: new Date().toISOString(),
      profile: userResult.rows[0],
      organizations: orgsResult.rows,
      projects: projectsResult.rows,
      files: filesResult.rows.map(f => ({
        id: f.id,
        name: f.original_name,
        type: f.file_type,
        size: f.file_size,
        uploadedAt: f.created_at,
      })),
      auditLog: auditResult.rows,
    };

    await logAction(userId, 'data_export', 'user', userId, {}, req);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=fluxstudio-data-export.json');
    res.json(exportData);
  } catch (error) {
    log.error('Export failed', error);
    res.status(500).json({ success: false, error: 'Failed to export data', code: 'EXPORT_FAILED' });
  }
});

/**
 * POST /api/account/delete
 *
 * GDPR Article 17 — Right to erasure.
 * Schedules account deletion after a 30-day cooling-off period.
 */
router.post('/delete', zodValidate(deleteAccountSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 30);

    await query(
      `INSERT INTO deletion_requests (user_id, reason, scheduled_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         reason = EXCLUDED.reason,
         scheduled_at = EXCLUDED.scheduled_at,
         status = 'pending',
         completed_at = NULL,
         created_at = NOW()`,
      [userId, reason || null, scheduledAt]
    );

    await logAction(userId, 'deletion_request', 'user', userId, { reason, scheduledAt }, req);

    res.json({
      success: true,
      message: 'Account deletion scheduled',
      scheduledAt: scheduledAt.toISOString(),
    });
  } catch (error) {
    log.error('Delete request failed', error);
    res.status(500).json({ success: false, error: 'Failed to schedule deletion', code: 'DELETION_SCHEDULE_FAILED' });
  }
});

/**
 * DELETE /api/account/delete
 *
 * Cancel a pending deletion request.
 */
router.delete('/delete', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `UPDATE deletion_requests SET status = 'cancelled'
       WHERE user_id = $1 AND status = 'pending'
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'No pending deletion request found', code: 'DELETION_REQUEST_NOT_FOUND' });
    }

    await logAction(userId, 'deletion_cancelled', 'user', userId, {}, req);

    res.json({ success: true, message: 'Deletion request cancelled' });
  } catch (error) {
    log.error('Cancel delete failed', error);
    res.status(500).json({ success: false, error: 'Failed to cancel deletion', code: 'DELETION_CANCEL_FAILED' });
  }
});

/**
 * GET /api/account/delete/status
 *
 * Check if there is a pending deletion request.
 */
router.get('/delete/status', async (req, res) => {
  try {
    const result = await query(
      `SELECT status, reason, scheduled_at, created_at
       FROM deletion_requests
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ hasPendingDeletion: false });
    }

    const request = result.rows[0];
    res.json({
      hasPendingDeletion: request.status === 'pending',
      status: request.status,
      scheduledAt: request.scheduled_at,
      requestedAt: request.created_at,
    });
  } catch (error) {
    log.error('Delete status failed', error);
    res.status(500).json({ success: false, error: 'Failed to check deletion status', code: 'DELETION_STATUS_FAILED' });
  }
});

module.exports = router;
