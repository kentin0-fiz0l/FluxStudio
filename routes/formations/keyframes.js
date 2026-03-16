/**
 * Formations - Keyframe Routes
 *
 * Handles keyframe CRUD and position management within formations.
 */

const express = require('express');
const { authenticateToken, rateLimitByUser } = require('../../lib/auth/middleware');
const formationsAdapter = require('../../database/formations-adapter');
const { createLogger } = require('../../lib/logger');
const log = createLogger('Formations');
const { zodValidate } = require('../../middleware/zodValidate');
const { canUserAccessProject } = require('../../middleware/requireProjectAccess');
const {
  addKeyframeSchema,
  updateKeyframeSchema,
  setPositionSchema,
} = require('../../lib/schemas');

const router = express.Router();

/**
 * Verify user has access to a formation via its parent project.
 * Returns the formation if authorized, or null if not found.
 * Sends a 403 response and returns undefined if unauthorized.
 */
async function verifyFormationAccess(formationId, userId, res) {
  const formation = await formationsAdapter.getFormationById(formationId);
  if (!formation) {
    return null;
  }

  const hasAccess = await canUserAccessProject(userId, formation.projectId);
  if (!hasAccess) {
    res.status(403).json({
      success: false,
      error: 'You do not have permission to access this formation',
      code: 'ACCESS_DENIED'
    });
    return undefined;
  }

  return formation;
}

/**
 * POST /api/formations/:formationId/keyframes
 * Add a keyframe to a formation
 */
router.post('/formations/:formationId/keyframes', authenticateToken, rateLimitByUser(10, 60000), zodValidate(addKeyframeSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { timestampMs, transition, duration } = req.body;

    const formation = await verifyFormationAccess(formationId, req.user.id, res);
    if (formation === undefined) return;
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    const keyframe = await formationsAdapter.addKeyframe({
      formationId,
      timestampMs: timestampMs || 0,
      transition,
      duration
    });

    res.status(201).json({ success: true, keyframe });
  } catch (error) {
    log.error('Error adding keyframe', error);
    res.status(500).json({ success: false, error: 'Failed to add keyframe', code: 'FORMATION_ADD_KEYFRAME_ERROR' });
  }
});

/**
 * PATCH /api/formations/:formationId/keyframes/:keyframeId
 * Update a keyframe
 */
router.patch('/formations/:formationId/keyframes/:keyframeId', authenticateToken, rateLimitByUser(10, 60000), zodValidate(updateKeyframeSchema), async (req, res) => {
  try {
    const { formationId, keyframeId } = req.params;
    const { timestampMs, transition, duration } = req.body;

    const formation = await verifyFormationAccess(formationId, req.user.id, res);
    if (formation === undefined) return;
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    const keyframe = await formationsAdapter.updateKeyframe(keyframeId, {
      timestampMs,
      transition,
      duration
    });

    if (!keyframe) {
      return res.status(404).json({ success: false, error: 'Keyframe not found', code: 'FORMATION_KEYFRAME_NOT_FOUND' });
    }

    res.json({ success: true, keyframe });
  } catch (error) {
    log.error('Error updating keyframe', error);
    res.status(500).json({ success: false, error: 'Failed to update keyframe', code: 'FORMATION_UPDATE_KEYFRAME_ERROR' });
  }
});

/**
 * DELETE /api/formations/:formationId/keyframes/:keyframeId
 * Delete a keyframe
 */
router.delete('/formations/:formationId/keyframes/:keyframeId', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  try {
    const { formationId, keyframeId } = req.params;

    const formation = await verifyFormationAccess(formationId, req.user.id, res);
    if (formation === undefined) return;
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    await formationsAdapter.deleteKeyframe(keyframeId);

    res.json({ success: true, message: 'Keyframe deleted' });
  } catch (error) {
    log.error('Error deleting keyframe', error);
    res.status(500).json({ success: false, error: 'Failed to delete keyframe', code: 'FORMATION_DELETE_KEYFRAME_ERROR' });
  }
});

// ==================== Position Endpoints ====================

/**
 * PUT /api/formations/:formationId/keyframes/:keyframeId/positions/:performerId
 * Set performer position at a keyframe
 */
router.put('/formations/:formationId/keyframes/:keyframeId/positions/:performerId', authenticateToken, rateLimitByUser(10, 60000), zodValidate(setPositionSchema), async (req, res) => {
  try {
    const { formationId, keyframeId, performerId } = req.params;
    const { x, y, rotation } = req.body;

    const formation = await verifyFormationAccess(formationId, req.user.id, res);
    if (formation === undefined) return;
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    const position = await formationsAdapter.setPosition({
      keyframeId,
      performerId,
      x,
      y,
      rotation: rotation || 0
    });

    res.json({ success: true, position });
  } catch (error) {
    log.error('Error setting position', error);
    res.status(500).json({ success: false, error: 'Failed to set position', code: 'FORMATION_SET_POSITION_ERROR' });
  }
});

module.exports = router;
