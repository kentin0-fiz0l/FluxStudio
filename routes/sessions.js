/**
 * Session Management Routes
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Endpoints:
 * - GET    /api/sessions          — List active sessions for current user
 * - DELETE /api/sessions/:id      — Revoke a specific session
 * - DELETE /api/sessions          — Revoke all sessions except current
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const {
  listSessions,
  removeSession,
  revokeAllSessions,
} = require('../lib/auth/sessionManager');
const { logAction } = require('../lib/auditLog');
const { createLogger } = require('../lib/logger');
const log = createLogger('Sessions');
const { zodValidateParams } = require('../middleware/zodValidateParams');
const { revokeSessionParamsSchema } = require('../lib/schemas');

router.use(authenticateToken);

/**
 * GET /api/sessions
 *
 * Returns all active sessions for the authenticated user.
 */
router.get('/', async (req, res) => {
  try {
    const sessions = await listSessions(req.user.id);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.id,
        deviceInfo: s.device_info,
        ipAddress: s.ip_address,
        lastActiveAt: s.last_active_at,
        createdAt: s.created_at,
        isCurrent: s.token_id === req.user.tokenId,
      })),
    });
  } catch (error) {
    log.error('List failed', error);
    res.status(500).json({ success: false, error: 'Failed to list sessions', code: 'LIST_SESSIONS_ERROR' });
  }
});

/**
 * DELETE /api/sessions/:id
 *
 * Revoke a specific session by its database ID.
 */
router.delete('/:id', zodValidateParams(revokeSessionParamsSchema), async (req, res) => {
  try {
    const { query: dbQuery } = require('../database/config');

    // Verify session belongs to user
    const result = await dbQuery(
      `SELECT token_id FROM active_sessions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }

    await removeSession(result.rows[0].token_id);
    await logAction(req.user.id, 'session_revoke', 'session', req.params.id, {}, req);

    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    log.error('Revoke failed', error);
    res.status(500).json({ success: false, error: 'Failed to revoke session', code: 'REVOKE_SESSION_ERROR' });
  }
});

/**
 * DELETE /api/sessions
 *
 * Revoke all sessions except the current one.
 */
router.delete('/', async (req, res) => {
  try {
    await revokeAllSessions(req.user.id, req.user.tokenId);
    await logAction(req.user.id, 'session_revoke_all', 'session', null, {}, req);

    res.json({ success: true, message: 'All other sessions revoked' });
  } catch (error) {
    log.error('Revoke all failed', error);
    res.status(500).json({ success: false, error: 'Failed to revoke sessions', code: 'REVOKE_ALL_SESSIONS_ERROR' });
  }
});

module.exports = router;
