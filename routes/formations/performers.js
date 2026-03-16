/**
 * Formations - Performer Routes
 *
 * Handles performer CRUD within formations.
 */

const express = require('express');
const { authenticateToken, rateLimitByUser } = require('../../lib/auth/middleware');
const formationsAdapter = require('../../database/formations-adapter');
const { createLogger } = require('../../lib/logger');
const log = createLogger('Formations');
const { zodValidate } = require('../../middleware/zodValidate');
const { canUserAccessProject } = require('../../middleware/requireProjectAccess');
const {
  addPerformerSchema,
  updatePerformerSchema,
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
 * POST /api/formations/:formationId/performers
 * Add a performer to a formation
 */
router.post('/formations/:formationId/performers', authenticateToken, rateLimitByUser(10, 60000), zodValidate(addPerformerSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { name, label, color, groupName } = req.body;

    const formation = await verifyFormationAccess(formationId, req.user.id, res);
    if (formation === undefined) return;
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    const performer = await formationsAdapter.addPerformer({
      formationId,
      name,
      label,
      color,
      groupName
    });

    res.status(201).json({ success: true, performer });
  } catch (error) {
    log.error('Error adding performer', error);
    res.status(500).json({ success: false, error: 'Failed to add performer', code: 'FORMATION_ADD_PERFORMER_ERROR' });
  }
});

/**
 * PATCH /api/formations/:formationId/performers/:performerId
 * Update a performer
 */
router.patch('/formations/:formationId/performers/:performerId', authenticateToken, rateLimitByUser(10, 60000), zodValidate(updatePerformerSchema), async (req, res) => {
  try {
    const { formationId, performerId } = req.params;
    const { name, label, color, groupName } = req.body;

    const formation = await verifyFormationAccess(formationId, req.user.id, res);
    if (formation === undefined) return;
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    const performer = await formationsAdapter.updatePerformer(performerId, {
      name,
      label,
      color,
      groupName
    });

    if (!performer) {
      return res.status(404).json({ success: false, error: 'Performer not found', code: 'FORMATION_PERFORMER_NOT_FOUND' });
    }

    res.json({ success: true, performer });
  } catch (error) {
    log.error('Error updating performer', error);
    res.status(500).json({ success: false, error: 'Failed to update performer', code: 'FORMATION_UPDATE_PERFORMER_ERROR' });
  }
});

/**
 * DELETE /api/formations/:formationId/performers/:performerId
 * Delete a performer
 */
router.delete('/formations/:formationId/performers/:performerId', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  try {
    const { formationId, performerId } = req.params;

    const formation = await verifyFormationAccess(formationId, req.user.id, res);
    if (formation === undefined) return;
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    await formationsAdapter.deletePerformer(performerId);

    res.json({ success: true, message: 'Performer deleted' });
  } catch (error) {
    log.error('Error deleting performer', error);
    res.status(500).json({ success: false, error: 'Failed to delete performer', code: 'FORMATION_DELETE_PERFORMER_ERROR' });
  }
});

module.exports = router;
