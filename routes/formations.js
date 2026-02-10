/**
 * Formations Routes - Drill Writer API
 *
 * Provides endpoints for:
 * - Formation CRUD operations
 * - Performer management
 * - Keyframe management
 * - Bulk save operations
 *
 * All endpoints require authentication.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const formationsAdapter = require('../database/formations-adapter');

const router = express.Router();

/**
 * GET /api/projects/:projectId/formations
 * List formations for a project
 */
router.get('/projects/:projectId/formations', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { includeArchived } = req.query;

    const formations = await formationsAdapter.listFormationsForProject({
      projectId,
      includeArchived: includeArchived === 'true'
    });

    res.json({ success: true, formations });
  } catch (error) {
    console.error('Error listing formations:', error);
    res.status(500).json({ success: false, error: 'Failed to list formations' });
  }
});

/**
 * POST /api/projects/:projectId/formations
 * Create a new formation
 */
router.post('/projects/:projectId/formations', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, stageWidth, stageHeight, gridSize } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Formation name is required' });
    }

    const formation = await formationsAdapter.createFormation({
      projectId,
      name: name.trim(),
      description,
      stageWidth,
      stageHeight,
      gridSize,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, formation });
  } catch (error) {
    console.error('Error creating formation:', error);
    res.status(500).json({ success: false, error: 'Failed to create formation' });
  }
});

/**
 * GET /api/formations/:formationId
 * Get a single formation with all data (performers, keyframes, positions)
 */
router.get('/:formationId', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    res.json({ success: true, formation });
  } catch (error) {
    console.error('Error getting formation:', error);
    res.status(500).json({ success: false, error: 'Failed to get formation' });
  }
});

/**
 * PATCH /api/formations/:formationId
 * Update formation metadata
 */
router.patch('/:formationId', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { name, description, stageWidth, stageHeight, gridSize, isArchived, audioTrack } = req.body;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    const updatedFormation = await formationsAdapter.updateFormation(formationId, {
      name,
      description,
      stageWidth,
      stageHeight,
      gridSize,
      isArchived,
      audioTrack
    });

    res.json({ success: true, formation: updatedFormation });
  } catch (error) {
    console.error('Error updating formation:', error);
    res.status(500).json({ success: false, error: 'Failed to update formation' });
  }
});

/**
 * DELETE /api/formations/:formationId
 * Delete a formation
 */
router.delete('/:formationId', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    await formationsAdapter.deleteFormation(formationId);

    res.json({ success: true, message: 'Formation deleted' });
  } catch (error) {
    console.error('Error deleting formation:', error);
    res.status(500).json({ success: false, error: 'Failed to delete formation' });
  }
});

/**
 * PUT /api/formations/:formationId/save
 * Bulk save formation data (performers, keyframes, positions)
 */
router.put('/:formationId/save', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { name, performers, keyframes } = req.body;

    const existingFormation = await formationsAdapter.getFormationById(formationId);
    if (!existingFormation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    const formation = await formationsAdapter.saveFormation(formationId, {
      name,
      performers: performers || [],
      keyframes: keyframes || []
    });

    res.json({ success: true, formation });
  } catch (error) {
    console.error('Error saving formation:', error);
    res.status(500).json({ success: false, error: 'Failed to save formation' });
  }
});

// ==================== Audio Endpoints ====================

/**
 * POST /api/formations/:formationId/audio
 * Upload audio track for a formation
 */
router.post('/:formationId/audio', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { id, url, filename, duration } = req.body;

    if (!url || !filename) {
      return res.status(400).json({ success: false, error: 'Audio URL and filename are required' });
    }

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    const audioTrack = {
      id: id || `audio-${Date.now()}`,
      url,
      filename,
      duration: duration || 0
    };

    const updatedFormation = await formationsAdapter.updateFormation(formationId, { audioTrack });

    res.json({ success: true, formation: updatedFormation, audioTrack });
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ success: false, error: 'Failed to upload audio' });
  }
});

/**
 * DELETE /api/formations/:formationId/audio
 * Remove audio track from a formation
 */
router.delete('/:formationId/audio', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    const updatedFormation = await formationsAdapter.updateFormation(formationId, { audioTrack: null });

    res.json({ success: true, formation: updatedFormation, message: 'Audio removed' });
  } catch (error) {
    console.error('Error removing audio:', error);
    res.status(500).json({ success: false, error: 'Failed to remove audio' });
  }
});

// ==================== Performer Endpoints ====================

/**
 * POST /api/formations/:formationId/performers
 * Add a performer to a formation
 */
router.post('/:formationId/performers', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { name, label, color, groupName } = req.body;

    if (!name || !label) {
      return res.status(400).json({ success: false, error: 'Performer name and label are required' });
    }

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
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
    console.error('Error adding performer:', error);
    res.status(500).json({ success: false, error: 'Failed to add performer' });
  }
});

/**
 * PATCH /api/formations/:formationId/performers/:performerId
 * Update a performer
 */
router.patch('/:formationId/performers/:performerId', authenticateToken, async (req, res) => {
  try {
    const { performerId } = req.params;
    const { name, label, color, groupName } = req.body;

    const performer = await formationsAdapter.updatePerformer(performerId, {
      name,
      label,
      color,
      groupName
    });

    if (!performer) {
      return res.status(404).json({ success: false, error: 'Performer not found' });
    }

    res.json({ success: true, performer });
  } catch (error) {
    console.error('Error updating performer:', error);
    res.status(500).json({ success: false, error: 'Failed to update performer' });
  }
});

/**
 * DELETE /api/formations/:formationId/performers/:performerId
 * Delete a performer
 */
router.delete('/:formationId/performers/:performerId', authenticateToken, async (req, res) => {
  try {
    const { performerId } = req.params;

    await formationsAdapter.deletePerformer(performerId);

    res.json({ success: true, message: 'Performer deleted' });
  } catch (error) {
    console.error('Error deleting performer:', error);
    res.status(500).json({ success: false, error: 'Failed to delete performer' });
  }
});

// ==================== Keyframe Endpoints ====================

/**
 * POST /api/formations/:formationId/keyframes
 * Add a keyframe to a formation
 */
router.post('/:formationId/keyframes', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { timestampMs, transition, duration } = req.body;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    const keyframe = await formationsAdapter.addKeyframe({
      formationId,
      timestampMs: timestampMs || 0,
      transition,
      duration
    });

    res.status(201).json({ success: true, keyframe });
  } catch (error) {
    console.error('Error adding keyframe:', error);
    res.status(500).json({ success: false, error: 'Failed to add keyframe' });
  }
});

/**
 * PATCH /api/formations/:formationId/keyframes/:keyframeId
 * Update a keyframe
 */
router.patch('/:formationId/keyframes/:keyframeId', authenticateToken, async (req, res) => {
  try {
    const { keyframeId } = req.params;
    const { timestampMs, transition, duration } = req.body;

    const keyframe = await formationsAdapter.updateKeyframe(keyframeId, {
      timestampMs,
      transition,
      duration
    });

    if (!keyframe) {
      return res.status(404).json({ success: false, error: 'Keyframe not found' });
    }

    res.json({ success: true, keyframe });
  } catch (error) {
    console.error('Error updating keyframe:', error);
    res.status(500).json({ success: false, error: 'Failed to update keyframe' });
  }
});

/**
 * DELETE /api/formations/:formationId/keyframes/:keyframeId
 * Delete a keyframe
 */
router.delete('/:formationId/keyframes/:keyframeId', authenticateToken, async (req, res) => {
  try {
    const { keyframeId } = req.params;

    await formationsAdapter.deleteKeyframe(keyframeId);

    res.json({ success: true, message: 'Keyframe deleted' });
  } catch (error) {
    console.error('Error deleting keyframe:', error);
    res.status(500).json({ success: false, error: 'Failed to delete keyframe' });
  }
});

// ==================== Position Endpoints ====================

/**
 * PUT /api/formations/:formationId/keyframes/:keyframeId/positions/:performerId
 * Set performer position at a keyframe
 */
router.put('/:formationId/keyframes/:keyframeId/positions/:performerId', authenticateToken, async (req, res) => {
  try {
    const { keyframeId, performerId } = req.params;
    const { x, y, rotation } = req.body;

    if (x === undefined || y === undefined) {
      return res.status(400).json({ success: false, error: 'Position x and y are required' });
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
    console.error('Error setting position:', error);
    res.status(500).json({ success: false, error: 'Failed to set position' });
  }
});

module.exports = router;
