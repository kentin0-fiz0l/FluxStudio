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
const { authenticateToken, rateLimitByUser } = require('../lib/auth/middleware');
const formationsAdapter = require('../database/formations-adapter');
const sceneObjectsAdapter = require('../database/scene-objects-adapter');
const { createLogger } = require('../lib/logger');
const log = createLogger('Formations');
const { zodValidate } = require('../middleware/zodValidate');
const {
  createFormationSchema,
  updateFormationSchema,
  saveFormationSchema,
  formationAudioSchema,
  addPerformerSchema,
  updatePerformerSchema,
  addKeyframeSchema,
  updateKeyframeSchema,
  setPositionSchema,
  createSceneObjectSchema,
  updateSceneObjectSchema,
  bulkSyncSceneObjectsSchema,
} = require('../lib/schemas');

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
    log.error('Error listing formations', error);
    res.status(500).json({ success: false, error: 'Failed to list formations', code: 'FORMATION_LIST_ERROR' });
  }
});

/**
 * POST /api/projects/:projectId/formations
 * Create a new formation
 */
router.post('/projects/:projectId/formations', authenticateToken, rateLimitByUser(10, 60000), zodValidate(createFormationSchema), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, stageWidth, stageHeight, gridSize } = req.body;

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
    log.error('Error creating formation', error);
    res.status(500).json({ success: false, error: 'Failed to create formation', code: 'FORMATION_CREATE_ERROR' });
  }
});

/**
 * GET /api/formations/:formationId
 * Get a single formation with all data (performers, keyframes, positions)
 */
router.get('/formations/:formationId', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    res.json({ success: true, formation });
  } catch (error) {
    log.error('Error getting formation', error);
    res.status(500).json({ success: false, error: 'Failed to get formation', code: 'FORMATION_GET_ERROR' });
  }
});

/**
 * PATCH /api/formations/:formationId
 * Update formation metadata
 */
router.patch('/formations/:formationId', authenticateToken, rateLimitByUser(10, 60000), zodValidate(updateFormationSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { name, description, stageWidth, stageHeight, gridSize, isArchived, audioTrack } = req.body;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
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
    log.error('Error updating formation', error);
    res.status(500).json({ success: false, error: 'Failed to update formation', code: 'FORMATION_UPDATE_ERROR' });
  }
});

/**
 * DELETE /api/formations/:formationId
 * Delete a formation
 */
router.delete('/formations/:formationId', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    await formationsAdapter.deleteFormation(formationId);

    res.json({ success: true, message: 'Formation deleted' });
  } catch (error) {
    log.error('Error deleting formation', error);
    res.status(500).json({ success: false, error: 'Failed to delete formation', code: 'FORMATION_DELETE_ERROR' });
  }
});

/**
 * PUT /api/formations/:formationId/save
 * Bulk save formation data (performers, keyframes, positions)
 */
router.put('/formations/:formationId/save', authenticateToken, rateLimitByUser(10, 60000), zodValidate(saveFormationSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const {
      name, performers, keyframes,
      drillSettings, sets, fieldConfig,
      groups, sectionShapeMap,
      metmapSongId, tempoMap, useConstantTempo
    } = req.body;

    const existingFormation = await formationsAdapter.getFormationById(formationId);
    if (!existingFormation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    const formation = await formationsAdapter.saveFormation(formationId, {
      name,
      performers: performers || [],
      keyframes: keyframes || [],
      drillSettings,
      sets,
      fieldConfig,
      groups,
      sectionShapeMap,
      metmapSongId,
      tempoMap,
      useConstantTempo,
    });

    res.json({ success: true, formation });
  } catch (error) {
    log.error('Error saving formation', error);
    res.status(500).json({ success: false, error: 'Failed to save formation', code: 'FORMATION_SAVE_ERROR' });
  }
});

// ==================== Audio Endpoints ====================

/**
 * POST /api/formations/:formationId/audio
 * Upload audio track for a formation
 */
router.post('/formations/:formationId/audio', authenticateToken, rateLimitByUser(10, 60000), zodValidate(formationAudioSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { id, url, filename, duration } = req.body;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
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
    log.error('Error uploading audio', error);
    res.status(500).json({ success: false, error: 'Failed to upload audio', code: 'FORMATION_AUDIO_UPLOAD_ERROR' });
  }
});

/**
 * DELETE /api/formations/:formationId/audio
 * Remove audio track from a formation
 */
router.delete('/formations/:formationId/audio', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    const updatedFormation = await formationsAdapter.updateFormation(formationId, { audioTrack: null });

    res.json({ success: true, formation: updatedFormation, message: 'Audio removed' });
  } catch (error) {
    log.error('Error removing audio', error);
    res.status(500).json({ success: false, error: 'Failed to remove audio', code: 'FORMATION_AUDIO_REMOVE_ERROR' });
  }
});

// ==================== Performer Endpoints ====================

/**
 * POST /api/formations/:formationId/performers
 * Add a performer to a formation
 */
router.post('/formations/:formationId/performers', authenticateToken, rateLimitByUser(10, 60000), zodValidate(addPerformerSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { name, label, color, groupName } = req.body;

    const formation = await formationsAdapter.getFormationById(formationId);
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
    const { performerId } = req.params;
    const { name, label, color, groupName } = req.body;

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
    const { performerId } = req.params;

    await formationsAdapter.deletePerformer(performerId);

    res.json({ success: true, message: 'Performer deleted' });
  } catch (error) {
    log.error('Error deleting performer', error);
    res.status(500).json({ success: false, error: 'Failed to delete performer', code: 'FORMATION_DELETE_PERFORMER_ERROR' });
  }
});

// ==================== Keyframe Endpoints ====================

/**
 * POST /api/formations/:formationId/keyframes
 * Add a keyframe to a formation
 */
router.post('/formations/:formationId/keyframes', authenticateToken, rateLimitByUser(10, 60000), zodValidate(addKeyframeSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { timestampMs, transition, duration } = req.body;

    const formation = await formationsAdapter.getFormationById(formationId);
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
    const { keyframeId } = req.params;
    const { timestampMs, transition, duration } = req.body;

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
    const { keyframeId } = req.params;

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
    const { keyframeId, performerId } = req.params;
    const { x, y, rotation } = req.body;

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

// ==================== Scene Object Endpoints ====================

/**
 * GET /api/formations/:formationId/scene-objects
 * List all scene objects for a formation
 */
router.get('/formations/:formationId/scene-objects', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const objects = await sceneObjectsAdapter.listByFormation(formationId);
    res.json({ success: true, sceneObjects: objects });
  } catch (error) {
    log.error('Error listing scene objects', error);
    res.status(500).json({ success: false, error: 'Failed to list scene objects', code: 'FORMATION_LIST_SCENE_OBJECTS_ERROR' });
  }
});

/**
 * POST /api/formations/:formationId/scene-objects
 * Create a single scene object
 */
router.post('/formations/:formationId/scene-objects', authenticateToken, rateLimitByUser(10, 60000), zodValidate(createSceneObjectSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { id, name, type, position, source, attachedToPerformerId, visible, locked, layer } = req.body;

    const object = await sceneObjectsAdapter.create({
      formationId, id, name, type, position, source,
      attachedToPerformerId, visible, locked, layer
    });

    res.status(201).json({ success: true, sceneObject: object });
  } catch (error) {
    log.error('Error creating scene object', error);
    res.status(500).json({ success: false, error: 'Failed to create scene object', code: 'FORMATION_CREATE_SCENE_OBJECT_ERROR' });
  }
});

/**
 * PATCH /api/formations/:formationId/scene-objects/:objectId
 * Update a scene object
 */
router.patch('/formations/:formationId/scene-objects/:objectId', authenticateToken, rateLimitByUser(10, 60000), zodValidate(updateSceneObjectSchema), async (req, res) => {
  try {
    const { objectId } = req.params;
    const { name, type, position, source, attachedToPerformerId, visible, locked, layer } = req.body;

    const object = await sceneObjectsAdapter.update(objectId, {
      name, type, position, source, attachedToPerformerId, visible, locked, layer
    });

    if (!object) {
      return res.status(404).json({ success: false, error: 'Scene object not found', code: 'FORMATION_SCENE_OBJECT_NOT_FOUND' });
    }

    res.json({ success: true, sceneObject: object });
  } catch (error) {
    log.error('Error updating scene object', error);
    res.status(500).json({ success: false, error: 'Failed to update scene object', code: 'FORMATION_UPDATE_SCENE_OBJECT_ERROR' });
  }
});

/**
 * DELETE /api/formations/:formationId/scene-objects/:objectId
 * Delete a scene object
 */
router.delete('/formations/:formationId/scene-objects/:objectId', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  try {
    const { objectId } = req.params;
    await sceneObjectsAdapter.remove(objectId);
    res.json({ success: true, message: 'Scene object deleted' });
  } catch (error) {
    log.error('Error deleting scene object', error);
    res.status(500).json({ success: false, error: 'Failed to delete scene object', code: 'FORMATION_DELETE_SCENE_OBJECT_ERROR' });
  }
});

/**
 * PUT /api/formations/:formationId/scene-objects
 * Bulk sync all scene objects (primary save path)
 */
router.put('/formations/:formationId/scene-objects', authenticateToken, rateLimitByUser(10, 60000), zodValidate(bulkSyncSceneObjectsSchema), async (req, res) => {
  try {
    const { formationId } = req.params;
    const { objects } = req.body;

    const result = await sceneObjectsAdapter.bulkSync(formationId, objects);
    res.json({ success: true, sceneObjects: result });
  } catch (error) {
    log.error('Error bulk syncing scene objects', error);
    res.status(500).json({ success: false, error: 'Failed to sync scene objects', code: 'FORMATION_SYNC_SCENE_OBJECTS_ERROR' });
  }
});

// ============================================================================
// PUBLIC / SHARE ENDPOINTS (no auth required for GET)
// ============================================================================

/**
 * GET /api/formations/:formationId/share
 * Fetch a formation for public sharing (no auth required)
 * Returns stripped-down formation data (no sensitive fields)
 */
router.get('/formations/:formationId/share', async (req, res) => {
  try {
    const { formationId } = req.params;
    const formation = await formationsAdapter.getFormationById(formationId);

    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    // Return public-safe fields including audio for playback
    res.json({
      success: true,
      data: {
        id: formation.id,
        name: formation.name,
        description: formation.description,
        stageWidth: formation.stageWidth || 100,
        stageHeight: formation.stageHeight || 100,
        gridSize: formation.gridSize || 5,
        performers: formation.performers || [],
        keyframes: formation.keyframes || [],
        sets: formation.sets || [],
        audioTrack: formation.audioTrack || null,
        musicTrackUrl: formation.musicTrackUrl || formation.audioTrack?.url || null,
        musicDuration: formation.musicDuration || formation.audioTrack?.duration || null,
        tempoMap: formation.tempoMap || null,
        drillSettings: formation.drillSettings || null,
        fieldConfig: formation.fieldConfig || null,
      },
    });
  } catch (error) {
    log.error('Error fetching shared formation', error);
    res.status(500).json({ success: false, error: 'Failed to fetch formation', code: 'FORMATION_FETCH_ERROR' });
  }
});

/**
 * POST /api/formations/:formationId/share
 * Generate a share link for a formation (auth required)
 */
router.post('/formations/:formationId/share', authenticateToken, rateLimitByUser(10, 60000), async (req, res) => {
  try {
    const { formationId } = req.params;
    const formation = await formationsAdapter.getFormationById(formationId);

    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found', code: 'FORMATION_NOT_FOUND' });
    }

    // Share URL is deterministic based on formation ID
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${formationId}`;

    res.json({ success: true, shareUrl });
  } catch (error) {
    log.error('Error generating share link', error);
    res.status(500).json({ success: false, error: 'Failed to generate share link', code: 'FORMATION_SHARE_ERROR' });
  }
});

// ============================================================================
// SERVER-SIDE OG TAGS FOR SHARE LINKS
// ============================================================================

/**
 * Serve index.html with dynamic OG meta tags for social media crawlers.
 * Regular browsers get the SPA which hydrates normally.
 */
async function handleShareOG(req, res) {
  const { formationId } = req.params;
  const fs = require('fs');
  const path = require('path');

  // Read the built index.html
  const indexPath = path.join(__dirname, '..', 'build', 'index.html');
  let html;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
  } catch {
    // Build not available — redirect to frontend
    return res.redirect(`https://fluxstudio.art/share/${formationId}`);
  }

  // Fetch formation data for OG tags
  try {
    const formation = await formationsAdapter.getFormationById(formationId);

    if (formation) {
      const title = `${formation.name} | Flux Studio`;
      const performerCount = (formation.performers || []).length;
      const description = formation.description
        || `${performerCount}-performer formation — view and explore in 3D`;
      const url = `https://fluxstudio.art/share/${formationId}`;

      const ogImage = `https://fluxstudio.art/api/og/${formationId}.png`;

      // Replace default OG tags with formation-specific ones
      html = html
        .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(title)}" />`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(description)}" />`)
        .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`)
        .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${ogImage}" />`)
        .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeAttr(title)}" />`)
        .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeAttr(description)}" />`)
        .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${ogImage}" />`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttr(description)}" />`)
        .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
    }
  } catch (err) {
    log.error('Error fetching formation for OG tags', { error: err.message });
    // Serve default index.html on error — still works as SPA
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

/**
 * GET /api/og/:formationId.png
 * Generate a dynamic OG image (1200x630) for a shared formation.
 * Uses Sharp to render an SVG overlay onto a branded background.
 */
router.get('/og/:formationId.png', async (req, res) => {
  try {
    const sharp = require('sharp');
    const { formationId } = req.params;

    let title = 'Flux Studio Formation';
    let subtitle = 'Design marching band formations in your browser';
    let performerCount = 0;

    try {
      const formation = await formationsAdapter.getFormationById(formationId);
      if (formation) {
        title = formation.name || title;
        performerCount = (formation.performers || []).length;
        subtitle = formation.description || `${performerCount} performers`;
      }
    } catch {
      // Use defaults
    }

    // Truncate long titles
    if (title.length > 40) title = title.slice(0, 37) + '...';
    if (subtitle.length > 60) subtitle = subtitle.slice(0, 57) + '...';

    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0a0a0a"/>
            <stop offset="100%" style="stop-color:#1a1a2e"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#8b5cf6"/>
            <stop offset="50%" style="stop-color:#6366f1"/>
            <stop offset="100%" style="stop-color:#ec4899"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <!-- Accent bar -->
        <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>
        <!-- Logo text -->
        <text x="80" y="100" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="url(#accent)">
          FLUX STUDIO
        </text>
        <!-- Formation title -->
        <text x="80" y="320" font-family="system-ui,sans-serif" font-size="56" font-weight="700" fill="#ffffff">
          ${escapeHtml(title)}
        </text>
        <!-- Subtitle -->
        <text x="80" y="380" font-family="system-ui,sans-serif" font-size="24" fill="#9ca3af">
          ${escapeHtml(subtitle)}
        </text>
        ${performerCount > 0 ? `
        <!-- Performer count badge -->
        <rect x="80" y="420" width="${String(performerCount).length * 16 + 180}" height="40" rx="20" fill="rgba(139,92,246,0.2)"/>
        <text x="100" y="446" font-family="system-ui,sans-serif" font-size="18" fill="#a78bfa">
          ${performerCount} performer${performerCount === 1 ? '' : 's'}
        </text>
        ` : ''}
        <!-- Bottom tagline -->
        <text x="80" y="580" font-family="system-ui,sans-serif" font-size="18" fill="#6b7280">
          fluxstudio.art — Design marching band formations
        </text>
      </svg>
    `;

    const png = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    res.send(png);
  } catch (err) {
    log.error('Error generating OG image', { error: err.message });
    res.status(500).send('Error generating image');
  }
});

// ============================================================================
// TEMPLATE OG IMAGE — Server-side position data for built-in templates
// ============================================================================

/**
 * Minimal server-side template data for OG image generation.
 * Positions are 0-100 normalized coordinates matching the client-side registry.
 */
const TEMPLATE_OG_DATA = {
  'line-horizontal': {
    name: 'Horizontal Line',
    description: 'Performers arranged in a straight horizontal line',
    category: 'basic',
    positions: Array.from({ length: 8 }, (_, i) => ({ x: 15 + (i * 70) / 7, y: 50 })),
  },
  'v-formation': {
    name: 'V-Formation',
    description: 'Classic V-shape pointing forward',
    category: 'basic',
    positions: [
      { x: 50, y: 25 }, { x: 40, y: 35 }, { x: 60, y: 35 },
      { x: 30, y: 45 }, { x: 70, y: 45 }, { x: 20, y: 55 },
      { x: 80, y: 55 }, { x: 10, y: 65 }, { x: 90, y: 65 },
    ],
  },
  'diamond': {
    name: 'Diamond',
    description: 'Classic diamond shape formation',
    category: 'basic',
    positions: [
      { x: 50, y: 20 }, { x: 30, y: 40 }, { x: 70, y: 40 },
      { x: 50, y: 60 }, { x: 30, y: 60 }, { x: 70, y: 60 }, { x: 50, y: 80 },
    ],
  },
  'circle': {
    name: 'Circle',
    description: 'Performers arranged in a circle facing inward',
    category: 'basic',
    positions: Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      return { x: 50 + Math.cos(angle) * 35, y: 50 + Math.sin(angle) * 35 };
    }),
  },
  'box': {
    name: 'Box',
    description: 'Square/rectangular formation',
    category: 'basic',
    positions: [
      { x: 25, y: 25 }, { x: 50, y: 25 }, { x: 75, y: 25 },
      { x: 25, y: 50 }, { x: 75, y: 50 },
      { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 },
    ],
  },
  'scatter': {
    name: 'Scatter',
    description: 'Random scattered positions across the stage',
    category: 'basic',
    positions: [
      { x: 20, y: 30 }, { x: 65, y: 25 }, { x: 35, y: 55 }, { x: 80, y: 45 },
      { x: 15, y: 70 }, { x: 55, y: 75 }, { x: 75, y: 70 }, { x: 45, y: 35 },
    ],
  },
  'spiral': {
    name: 'Spiral',
    description: 'Performers arranged in a spiral pattern',
    category: 'intermediate',
    positions: Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * 3 * Math.PI;
      const radius = 10 + (i / 12) * 35;
      return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius };
    }),
  },
  'arrow': {
    name: 'Arrow',
    description: 'Arrow pointing forward with shaft',
    category: 'intermediate',
    positions: [
      { x: 50, y: 20 }, { x: 35, y: 35 }, { x: 65, y: 35 },
      { x: 50, y: 45 }, { x: 50, y: 55 }, { x: 50, y: 65 }, { x: 50, y: 75 },
    ],
  },
  'two-lines': {
    name: 'Two Lines',
    description: 'Two parallel horizontal lines',
    category: 'basic',
    positions: Array.from({ length: 8 }, (_, i) => ({
      x: 20 + ((i % 4) * 60) / 3,
      y: i < 4 ? 35 : 65,
    })),
  },
  'diagonal': {
    name: 'Diagonal Line',
    description: 'Performers arranged in a diagonal line',
    category: 'basic',
    positions: Array.from({ length: 8 }, (_, i) => ({
      x: 15 + (i * 70) / 7,
      y: 15 + (i * 70) / 7,
    })),
  },
  'drill-company-front': {
    name: 'Company Front',
    description: 'Signature marching band formation — straight line across the field',
    category: 'drill',
    positions: Array.from({ length: 12 }, (_, i) => ({ x: 10 + (i * 80) / 11, y: 50 })),
  },
  'drill-wedge': {
    name: 'Wedge',
    description: 'Inverted V-shape with point performer at the front',
    category: 'drill',
    positions: [
      { x: 50, y: 30 }, { x: 42, y: 38 }, { x: 58, y: 38 },
      { x: 34, y: 46 }, { x: 66, y: 46 }, { x: 26, y: 54 },
      { x: 74, y: 54 }, { x: 18, y: 62 }, { x: 82, y: 62 },
    ],
  },
  'drill-stagger': {
    name: 'Stagger',
    description: 'Offset rows creating a checkerboard pattern',
    category: 'drill',
    positions: Array.from({ length: 12 }, (_, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      const offset = row % 2 === 1 ? 10 : 0;
      return { x: 20 + col * 20 + offset, y: 30 + row * 15 };
    }),
  },
  'drill-fan-spread': {
    name: 'Fan Spread',
    description: 'Semicircular fan shape spreading from a pivot point',
    category: 'drill',
    positions: Array.from({ length: 9 }, (_, i) => {
      const angle = -Math.PI / 2 + ((i / 8) * Math.PI);
      return { x: 50 + Math.cos(angle) * 30, y: 70 + Math.sin(angle) * 30 };
    }),
  },
  'drill-follow-the-leader': {
    name: 'Follow the Leader',
    description: 'Performers along a serpentine curve',
    category: 'drill',
    positions: Array.from({ length: 10 }, (_, i) => {
      const t = i / 9;
      return { x: 20 + t * 60, y: 50 + Math.sin(t * 2 * Math.PI) * 15 };
    }),
  },
  'drill-gate-turn': {
    name: 'Gate Turn',
    description: 'Two mirrored lines that pivot from a center point',
    category: 'drill',
    positions: [
      { x: 50, y: 35 }, { x: 42, y: 35 }, { x: 34, y: 35 }, { x: 26, y: 35 },
      { x: 50, y: 65 }, { x: 58, y: 65 }, { x: 66, y: 65 }, { x: 74, y: 65 },
    ],
  },
  'drill-pinwheel': {
    name: 'Pinwheel',
    description: 'Radial arms from a center point',
    category: 'drill',
    positions: (() => {
      const pts = [];
      for (let arm = 0; arm < 4; arm++) {
        const baseAngle = (arm / 4) * 2 * Math.PI - Math.PI / 2;
        for (let j = 0; j < 3; j++) {
          const radius = 10 + j * 12;
          pts.push({ x: 50 + Math.cos(baseAngle) * radius, y: 50 + Math.sin(baseAngle) * radius });
        }
      }
      return pts;
    })(),
  },
  'show-halftime-starter': {
    name: 'Halftime Show Starter',
    description: '4-set show: block, fan-out, company front, scatter',
    category: 'drill',
    positions: Array.from({ length: 24 }, (_, i) => {
      const row = Math.floor(i / 6);
      const col = i % 6;
      return { x: 20 + col * 12, y: 30 + row * 12 };
    }),
  },
  'show-parade-block': {
    name: 'Parade Block',
    description: 'Classic parade formation with transitions',
    category: 'drill',
    positions: Array.from({ length: 16 }, (_, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      return { x: 30 + col * 13, y: 25 + row * 15 };
    }),
  },
  'show-indoor-drumline': {
    name: 'Indoor Drumline',
    description: 'Indoor percussion staging with arc formation',
    category: 'drill',
    positions: Array.from({ length: 12 }, (_, i) => {
      const angle = Math.PI + (i / 11) * Math.PI;
      return { x: 50 + Math.cos(angle) * 30, y: 60 + Math.sin(angle) * 25 };
    }),
  },
  'show-color-guard-opener': {
    name: 'Color Guard Opener',
    description: 'Color guard opening sequence with staggered line',
    category: 'drill',
    positions: Array.from({ length: 8 }, (_, i) => ({
      x: 15 + (i * 70) / 7,
      y: 50 + (i % 2 === 0 ? -8 : 8),
    })),
  },
  'show-full-field': {
    name: 'Full Field Show',
    description: 'Complete 5-set field show with 32 performers',
    category: 'drill',
    positions: Array.from({ length: 32 }, (_, i) => {
      const row = Math.floor(i / 8);
      const col = i % 8;
      return { x: 10 + col * 11.5, y: 25 + row * 15 };
    }),
  },
  'show-concert-arc': {
    name: 'Concert Arc',
    description: 'Semicircular concert seating arc',
    category: 'drill',
    positions: (() => {
      const pts = [];
      for (let row = 0; row < 2; row++) {
        const rowCount = row === 0 ? 10 : 6;
        const radius = 30 + row * 12;
        const startAngle = Math.PI + Math.PI * 0.15;
        const endAngle = 2 * Math.PI - Math.PI * 0.15;
        for (let i = 0; i < rowCount; i++) {
          const angle = startAngle + (i / (rowCount - 1)) * (endAngle - startAngle);
          pts.push({ x: 50 + Math.cos(angle) * radius, y: 65 + Math.sin(angle) * radius });
        }
      }
      return pts;
    })(),
  },
  'show-diamond-to-box': {
    name: 'Diamond \u2192 Box',
    description: 'Diamond formation morphs into a box and back',
    category: 'drill',
    positions: (() => {
      const pts = [];
      const perSide = 4, cx = 50, cy = 50, r = 30;
      for (let i = 0; i < perSide; i++) { const t = i / perSide; pts.push({ x: cx + t * r, y: cy - (1 - t) * r }); }
      for (let i = 0; i < perSide; i++) { const t = i / perSide; pts.push({ x: cx + (1 - t) * r, y: cy + t * r }); }
      for (let i = 0; i < perSide; i++) { const t = i / perSide; pts.push({ x: cx - t * r, y: cy + (1 - t) * r }); }
      for (let i = 0; i < perSide; i++) { const t = i / perSide; pts.push({ x: cx - (1 - t) * r, y: cy - t * r }); }
      return pts;
    })(),
  },
  'show-diagonal-to-front': {
    name: 'Diagonal \u2192 Company Front',
    description: 'Classic drill: diagonal line to company front',
    category: 'drill',
    positions: Array.from({ length: 12 }, (_, i) => {
      const t = i / 11;
      return { x: 15 + t * 70, y: 20 + t * 60 };
    }),
  },
  'show-scatter-to-logo': {
    name: 'Scatter \u2192 Logo',
    description: 'Scattered performers converge into an "F" logo',
    category: 'drill',
    positions: (() => {
      const pts = [];
      const phi = (1 + Math.sqrt(5)) / 2;
      for (let i = 0; i < 20; i++) {
        pts.push({ x: 15 + ((i * phi * 37) % 70), y: 15 + ((i * phi * 23 + 11) % 70) });
      }
      return pts;
    })(),
  },
  'show-basic-block-band': {
    name: 'Basic Block Band',
    description: 'Full 32-performer block formation',
    category: 'drill',
    positions: Array.from({ length: 32 }, (_, i) => {
      const row = Math.floor(i / 8);
      const col = i % 8;
      return { x: 10 + (col * 80) / 7, y: 30 + (row * 40) / 3 };
    }),
  },
};

// In-memory cache for generated template OG images
const templateOgCache = new Map();

/**
 * GET /api/og/template/:templateId.png
 * Generate a dynamic OG image (1200x630) for a formation template page.
 * Renders performer positions as dots on a field visualization.
 */
router.get('/og/template/:templateId.png', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = TEMPLATE_OG_DATA[templateId];

    if (!template) {
      return res.status(404).send('Template not found');
    }

    // Return cached image if available
    if (templateOgCache.has(templateId)) {
      const cached = templateOgCache.get(templateId);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7-day cache (static)
      return res.send(cached);
    }

    const sharp = require('sharp');

    let title = template.name;
    const subtitle = template.description;
    const performerCount = template.positions.length;

    if (title.length > 35) title = title.slice(0, 32) + '...';

    // Category badge colors
    const categoryColors = {
      basic: { bg: 'rgba(34,197,94,0.15)', text: '#4ade80', label: 'Basic' },
      intermediate: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', label: 'Intermediate' },
      advanced: { bg: 'rgba(168,85,247,0.15)', text: '#c084fc', label: 'Advanced' },
      drill: { bg: 'rgba(236,72,153,0.15)', text: '#f472b6', label: 'Drill' },
      custom: { bg: 'rgba(251,146,60,0.15)', text: '#fb923c', label: 'Custom' },
    };
    const cat = categoryColors[template.category] || categoryColors.basic;

    // Dot colors for performers (cycle through)
    const dotColors = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

    // Field area: right side of the image (500x400 area)
    const fieldX = 640;
    const fieldY = 100;
    const fieldW = 480;
    const fieldH = 420;

    // Generate dots SVG
    const dotsSvg = template.positions.map((pos, i) => {
      const cx = fieldX + (pos.x / 100) * fieldW;
      const cy = fieldY + (pos.y / 100) * fieldH;
      const color = dotColors[i % dotColors.length];
      return `<circle cx="${cx}" cy="${cy}" r="8" fill="${color}" opacity="0.9"/>`;
    }).join('\n        ');

    // Generate grid lines on the field
    const gridLinesSvg = [];
    for (let gx = 0; gx <= 4; gx++) {
      const x = fieldX + (gx / 4) * fieldW;
      gridLinesSvg.push(`<line x1="${x}" y1="${fieldY}" x2="${x}" y2="${fieldY + fieldH}" stroke="#333" stroke-width="1" opacity="0.3"/>`);
    }
    for (let gy = 0; gy <= 4; gy++) {
      const y = fieldY + (gy / 4) * fieldH;
      gridLinesSvg.push(`<line x1="${fieldX}" y1="${y}" x2="${fieldX + fieldW}" y2="${y}" stroke="#333" stroke-width="1" opacity="0.3"/>`);
    }

    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0a0a0a"/>
            <stop offset="100%" style="stop-color:#1a1a2e"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#8b5cf6"/>
            <stop offset="50%" style="stop-color:#6366f1"/>
            <stop offset="100%" style="stop-color:#ec4899"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <!-- Accent bar -->
        <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>

        <!-- Logo text -->
        <text x="60" y="80" font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="url(#accent)">
          FLUX STUDIO
        </text>
        <!-- "Formation Template" label -->
        <text x="60" y="110" font-family="system-ui,sans-serif" font-size="16" fill="#6b7280">
          Formation Template
        </text>

        <!-- Template title -->
        <text x="60" y="230" font-family="system-ui,sans-serif" font-size="48" font-weight="700" fill="#ffffff">
          ${escapeHtml(title)}
        </text>
        <!-- Description -->
        <text x="60" y="280" font-family="system-ui,sans-serif" font-size="20" fill="#9ca3af">
          ${escapeHtml(subtitle.length > 50 ? subtitle.slice(0, 47) + '...' : subtitle)}
        </text>

        <!-- Category badge -->
        <rect x="60" y="310" width="${cat.label.length * 12 + 24}" height="32" rx="16" fill="${cat.bg}"/>
        <text x="72" y="332" font-family="system-ui,sans-serif" font-size="15" font-weight="600" fill="${cat.text}">
          ${cat.label}
        </text>

        <!-- Performer count -->
        <text x="60" y="380" font-family="system-ui,sans-serif" font-size="18" fill="#a78bfa">
          ${performerCount} performer${performerCount === 1 ? '' : 's'}
        </text>

        <!-- Field visualization area -->
        <rect x="${fieldX}" y="${fieldY}" width="${fieldW}" height="${fieldH}" rx="12" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        <!-- Grid lines -->
        ${gridLinesSvg.join('\n        ')}
        <!-- Performer dots -->
        ${dotsSvg}

        <!-- Bottom tagline -->
        <text x="60" y="580" font-family="system-ui,sans-serif" font-size="16" fill="#6b7280">
          fluxstudio.art/templates — Browse formation templates
        </text>
      </svg>
    `;

    const png = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();

    // Cache the result (templates are static)
    templateOgCache.set(templateId, png);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7-day cache
    res.send(png);
  } catch (err) {
    log.error('Error generating template OG image', { error: err.message });
    res.status(500).send('Error generating image');
  }
});

/**
 * GET /api/og-image.png
 * Default static OG image for the site (non-formation pages).
 */
router.get('/og-image.png', async (req, res) => {
  try {
    const sharp = require('sharp');

    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0a0a0a"/>
            <stop offset="100%" style="stop-color:#1a1a2e"/>
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#8b5cf6"/>
            <stop offset="50%" style="stop-color:#6366f1"/>
            <stop offset="100%" style="stop-color:#ec4899"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>
        <text x="600" y="260" font-family="system-ui,sans-serif" font-size="72" font-weight="700" fill="url(#accent)" text-anchor="middle">
          FLUX STUDIO
        </text>
        <text x="600" y="340" font-family="system-ui,sans-serif" font-size="28" fill="#9ca3af" text-anchor="middle">
          Creative collaboration platform for design teams
        </text>
        <text x="600" y="400" font-family="system-ui,sans-serif" font-size="22" fill="#6b7280" text-anchor="middle">
          Design formations, collaborate in real time, ship together
        </text>
      </svg>
    `;

    const png = await sharp(Buffer.from(svg)).png({ quality: 90 }).toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800'); // 7-day cache
    res.send(png);
  } catch (err) {
    log.error('Error generating default OG image', { error: err.message });
    res.status(500).send('Error generating image');
  }
});

// Full path (local dev / direct access)
router.get('/share/:formationId', handleShareOG);

// UUID-only path (DO ingress strips /share/ prefix, backend receives /:formationId)
// Use Express 5 middleware to validate UUID format (path-to-regexp v8 dropped inline regex)
router.get('/:formationId', (req, res, next) => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_RE.test(req.params.formationId)) return handleShareOG(req, res, next);
  next(); // Not a UUID — skip to next route
});

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

module.exports = router;
