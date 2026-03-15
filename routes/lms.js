/**
 * LMS Integration Routes - FluxStudio
 *
 * Express router for LMS (Google Classroom, Canvas) integration.
 * Uses lms-oauth-service for real OAuth flows and API calls.
 *
 * Endpoints:
 * - GET  /providers             — available LMS providers and connection status
 * - GET  /:provider/courses     — list courses for a connected provider
 * - GET  /:provider/callback    — OAuth redirect handler
 * - POST /:provider/connect     — initiate OAuth flow (returns real auth URL)
 * - POST /:provider/share       — share a formation as an assignment
 * - DELETE /:provider/disconnect — remove OAuth connection
 */

const express = require('express');
const { createLogger } = require('../lib/logger');
const log = createLogger('LMS');
const { authenticateToken } = require('../lib/data-helpers');
const lmsOAuth = require('../services/lms-oauth-service');
const { zodValidate } = require('../middleware/zodValidate');
const { zodValidateParams } = require('../middleware/zodValidateParams');
const {
  lmsProviderParamsSchema,
  lmsConnectSchema,
  lmsShareSchema,
} = require('../lib/schemas');

const router = express.Router();

// ========================================
// Routes
// ========================================

/**
 * GET /providers — list available LMS providers and connection status.
 */
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionStatus = await lmsOAuth.getLMSConnectionStatus(userId);

    const providers = [
      {
        id: 'google_classroom',
        name: 'Google Classroom',
        icon: 'google-classroom',
        connected: !!connectionStatus.google_classroom?.connected,
      },
      {
        id: 'canvas_lms',
        name: 'Canvas LMS',
        icon: 'canvas',
        connected: !!connectionStatus.canvas_lms?.connected,
        baseUrl: connectionStatus.canvas_lms?.baseUrl || null,
      },
    ];

    log.info('Listing LMS providers', { userId });
    res.json({ providers });
  } catch (error) {
    // Handle missing table gracefully (migrations not run)
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      log.warn('LMS tables not yet created — returning defaults');
      return res.json({
        providers: [
          { id: 'google_classroom', name: 'Google Classroom', icon: 'google-classroom', connected: false },
          { id: 'canvas_lms', name: 'Canvas LMS', icon: 'canvas', connected: false },
        ],
      });
    }
    log.error('Error listing LMS providers', error, { userId: req.user?.id });
    res.status(500).json({ success: false, error: 'Failed to list providers', code: 'LMS_LIST_PROVIDERS_ERROR' });
  }
});

/**
 * GET /:provider/courses — list courses for a connected provider.
 */
router.get('/:provider/courses', authenticateToken, zodValidateParams(lmsProviderParamsSchema), async (req, res) => {
  const { provider } = req.params;

  try {
    const userId = req.user.id;
    let courses;

    if (provider === 'google_classroom') {
      courses = await lmsOAuth.getGoogleClassroomCourses(userId);
    } else {
      courses = await lmsOAuth.getCanvasCourses(userId);
    }

    log.info(`Listing courses for ${provider}`, { userId, count: courses.length });
    res.json({ courses });
  } catch (error) {
    log.error(`Error fetching courses for ${provider}`, error, { userId: req.user?.id, provider });
    const status = error.message?.includes('not connected') ? 401 : 500;
    const code = status === 401 ? 'LMS_NOT_CONNECTED' : 'LMS_LIST_COURSES_ERROR';
    res.status(status).json({ success: false, error: error.message, code });
  }
});

/**
 * GET /:provider/callback — OAuth redirect handler (browser redirect).
 */
router.get('/:provider/callback', zodValidateParams(lmsProviderParamsSchema), async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect(
      `${process.env.APP_URL || 'https://fluxstudio.art'}/auth/callback/${provider}?error=missing_params`,
    );
  }

  try {
    // The state token encodes the user_id via oauth_state_tokens table lookup,
    // but we need userId from the state token record. The consumeStateToken
    // inside each handler returns the user_id.

    if (provider === 'google_classroom') {
      // Look up user from state token before consuming
      const stateRow = await require('../database/config').query(
        `SELECT user_id FROM oauth_state_tokens WHERE state_token = $1 AND provider = $2 AND used = false AND expires_at > NOW()`,
        [state, provider],
      );
      if (stateRow.rows.length === 0) {
        throw new Error('Invalid or expired OAuth state');
      }
      const userId = stateRow.rows[0].user_id;
      await lmsOAuth.handleGoogleClassroomCallback(code, state, userId);
    } else {
      // Canvas: composite state = stateToken:base64(institutionUrl)
      const colonIdx = state.indexOf(':');
      const stateToken = colonIdx > -1 ? state.substring(0, colonIdx) : state;

      const stateRow = await require('../database/config').query(
        `SELECT user_id FROM oauth_state_tokens WHERE state_token = $1 AND provider = $2 AND used = false AND expires_at > NOW()`,
        [stateToken, provider],
      );
      if (stateRow.rows.length === 0) {
        throw new Error('Invalid or expired OAuth state');
      }
      const userId = stateRow.rows[0].user_id;
      await lmsOAuth.handleCanvasCallback(code, state, userId);
    }

    res.redirect(
      `${process.env.APP_URL || 'https://fluxstudio.art'}/auth/callback/${provider}?success=true`,
    );
  } catch (error) {
    log.error(`OAuth callback error (${provider})`, error);
    res.redirect(
      `${process.env.APP_URL || 'https://fluxstudio.art'}/auth/callback/${provider}?error=${encodeURIComponent(error.message)}`,
    );
  }
});

/**
 * POST /:provider/connect — initiate OAuth flow (returns real auth URL).
 */
router.post('/:provider/connect', authenticateToken, zodValidateParams(lmsProviderParamsSchema), zodValidate(lmsConnectSchema), async (req, res) => {
  const { provider } = req.params;

  try {
    const userId = req.user.id;
    let authUrl;

    if (provider === 'google_classroom') {
      authUrl = await lmsOAuth.initiateGoogleClassroomOAuth(userId);
    } else {
      const { institutionUrl } = req.body;
      if (!institutionUrl) {
        return res.status(400).json({
          success: false,
          error: 'institutionUrl is required for Canvas LMS',
          code: 'LMS_MISSING_INSTITUTION_URL',
        });
      }
      authUrl = await lmsOAuth.initiateCanvasOAuth(userId, institutionUrl);
    }

    log.info(`LMS connection initiated for ${provider}`, { userId, provider });
    res.json({ authUrl });
  } catch (error) {
    log.error(`Error initiating ${provider} OAuth`, error, { userId: req.user?.id, provider });
    res.status(500).json({ success: false, error: error.message, code: 'LMS_CONNECT_ERROR' });
  }
});

/**
 * POST /:provider/share — share a formation to an LMS course as an assignment.
 */
router.post('/:provider/share', authenticateToken, zodValidateParams(lmsProviderParamsSchema), zodValidate(lmsShareSchema), async (req, res) => {
  const { provider } = req.params;
  const { courseId, title, formationId, embedUrl } = req.body;

  try {
    const userId = req.user.id;
    const formationUrl = embedUrl ||
      `${process.env.APP_URL || 'https://fluxstudio.art'}/embed/formation/${formationId}`;

    let result;
    if (provider === 'google_classroom') {
      result = await lmsOAuth.createGoogleClassroomAssignment(userId, courseId, title, formationUrl);
    } else {
      result = await lmsOAuth.createCanvasAssignment(userId, courseId, title, formationUrl);
    }

    log.info(`Formation shared to ${provider}`, { userId, provider, courseId, formationId, assignmentId: result.assignmentId });
    res.json({ url: result.url, assignmentId: result.assignmentId });
  } catch (error) {
    log.error(`Error sharing to ${provider}`, error, { userId: req.user?.id, provider, courseId, formationId });
    const status = error.message?.includes('not connected') ? 401 : 500;
    const code = status === 401 ? 'LMS_NOT_CONNECTED' : 'LMS_SHARE_ERROR';
    res.status(status).json({ success: false, error: error.message, code });
  }
});

/**
 * DELETE /:provider/disconnect — remove OAuth connection for an LMS provider.
 */
router.delete('/:provider/disconnect', authenticateToken, zodValidateParams(lmsProviderParamsSchema), async (req, res) => {
  const { provider } = req.params;

  try {
    const userId = req.user.id;
    await lmsOAuth.deactivateToken(userId, provider);
    log.info(`LMS provider disconnected`, { userId, provider });
    res.json({ success: true, message: `${provider} disconnected` });
  } catch (error) {
    log.error(`Error disconnecting ${provider}`, error, { userId: req.user?.id, provider });
    res.status(500).json({ success: false, error: error.message, code: 'LMS_DISCONNECT_ERROR' });
  }
});

module.exports = router;
