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
const sceneObjectsAdapter = require('../database/scene-objects-adapter');
const { createLogger } = require('../lib/logger');
const log = createLogger('Formations');

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
    log.error('Error creating formation', error);
    res.status(500).json({ success: false, error: 'Failed to create formation' });
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
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    res.json({ success: true, formation });
  } catch (error) {
    log.error('Error getting formation', error);
    res.status(500).json({ success: false, error: 'Failed to get formation' });
  }
});

/**
 * PATCH /api/formations/:formationId
 * Update formation metadata
 */
router.patch('/formations/:formationId', authenticateToken, async (req, res) => {
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
    log.error('Error updating formation', error);
    res.status(500).json({ success: false, error: 'Failed to update formation' });
  }
});

/**
 * DELETE /api/formations/:formationId
 * Delete a formation
 */
router.delete('/formations/:formationId', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    await formationsAdapter.deleteFormation(formationId);

    res.json({ success: true, message: 'Formation deleted' });
  } catch (error) {
    log.error('Error deleting formation', error);
    res.status(500).json({ success: false, error: 'Failed to delete formation' });
  }
});

/**
 * PUT /api/formations/:formationId/save
 * Bulk save formation data (performers, keyframes, positions)
 */
router.put('/formations/:formationId/save', authenticateToken, async (req, res) => {
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
    log.error('Error saving formation', error);
    res.status(500).json({ success: false, error: 'Failed to save formation' });
  }
});

// ==================== Audio Endpoints ====================

/**
 * POST /api/formations/:formationId/audio
 * Upload audio track for a formation
 */
router.post('/formations/:formationId/audio', authenticateToken, async (req, res) => {
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
    log.error('Error uploading audio', error);
    res.status(500).json({ success: false, error: 'Failed to upload audio' });
  }
});

/**
 * DELETE /api/formations/:formationId/audio
 * Remove audio track from a formation
 */
router.delete('/formations/:formationId/audio', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;

    const formation = await formationsAdapter.getFormationById(formationId);
    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    const updatedFormation = await formationsAdapter.updateFormation(formationId, { audioTrack: null });

    res.json({ success: true, formation: updatedFormation, message: 'Audio removed' });
  } catch (error) {
    log.error('Error removing audio', error);
    res.status(500).json({ success: false, error: 'Failed to remove audio' });
  }
});

// ==================== Performer Endpoints ====================

/**
 * POST /api/formations/:formationId/performers
 * Add a performer to a formation
 */
router.post('/formations/:formationId/performers', authenticateToken, async (req, res) => {
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
    log.error('Error adding performer', error);
    res.status(500).json({ success: false, error: 'Failed to add performer' });
  }
});

/**
 * PATCH /api/formations/:formationId/performers/:performerId
 * Update a performer
 */
router.patch('/formations/:formationId/performers/:performerId', authenticateToken, async (req, res) => {
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
    log.error('Error updating performer', error);
    res.status(500).json({ success: false, error: 'Failed to update performer' });
  }
});

/**
 * DELETE /api/formations/:formationId/performers/:performerId
 * Delete a performer
 */
router.delete('/formations/:formationId/performers/:performerId', authenticateToken, async (req, res) => {
  try {
    const { performerId } = req.params;

    await formationsAdapter.deletePerformer(performerId);

    res.json({ success: true, message: 'Performer deleted' });
  } catch (error) {
    log.error('Error deleting performer', error);
    res.status(500).json({ success: false, error: 'Failed to delete performer' });
  }
});

// ==================== Keyframe Endpoints ====================

/**
 * POST /api/formations/:formationId/keyframes
 * Add a keyframe to a formation
 */
router.post('/formations/:formationId/keyframes', authenticateToken, async (req, res) => {
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
    log.error('Error adding keyframe', error);
    res.status(500).json({ success: false, error: 'Failed to add keyframe' });
  }
});

/**
 * PATCH /api/formations/:formationId/keyframes/:keyframeId
 * Update a keyframe
 */
router.patch('/formations/:formationId/keyframes/:keyframeId', authenticateToken, async (req, res) => {
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
    log.error('Error updating keyframe', error);
    res.status(500).json({ success: false, error: 'Failed to update keyframe' });
  }
});

/**
 * DELETE /api/formations/:formationId/keyframes/:keyframeId
 * Delete a keyframe
 */
router.delete('/formations/:formationId/keyframes/:keyframeId', authenticateToken, async (req, res) => {
  try {
    const { keyframeId } = req.params;

    await formationsAdapter.deleteKeyframe(keyframeId);

    res.json({ success: true, message: 'Keyframe deleted' });
  } catch (error) {
    log.error('Error deleting keyframe', error);
    res.status(500).json({ success: false, error: 'Failed to delete keyframe' });
  }
});

// ==================== Position Endpoints ====================

/**
 * PUT /api/formations/:formationId/keyframes/:keyframeId/positions/:performerId
 * Set performer position at a keyframe
 */
router.put('/formations/:formationId/keyframes/:keyframeId/positions/:performerId', authenticateToken, async (req, res) => {
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
    log.error('Error setting position', error);
    res.status(500).json({ success: false, error: 'Failed to set position' });
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
    res.status(500).json({ success: false, error: 'Failed to list scene objects' });
  }
});

/**
 * POST /api/formations/:formationId/scene-objects
 * Create a single scene object
 */
router.post('/formations/:formationId/scene-objects', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { id, name, type, position, source, attachedToPerformerId, visible, locked, layer } = req.body;

    if (!name || !type || !position || !source) {
      return res.status(400).json({ success: false, error: 'name, type, position, and source are required' });
    }

    const object = await sceneObjectsAdapter.create({
      formationId, id, name, type, position, source,
      attachedToPerformerId, visible, locked, layer
    });

    res.status(201).json({ success: true, sceneObject: object });
  } catch (error) {
    log.error('Error creating scene object', error);
    res.status(500).json({ success: false, error: 'Failed to create scene object' });
  }
});

/**
 * PATCH /api/formations/:formationId/scene-objects/:objectId
 * Update a scene object
 */
router.patch('/formations/:formationId/scene-objects/:objectId', authenticateToken, async (req, res) => {
  try {
    const { objectId } = req.params;
    const { name, type, position, source, attachedToPerformerId, visible, locked, layer } = req.body;

    const object = await sceneObjectsAdapter.update(objectId, {
      name, type, position, source, attachedToPerformerId, visible, locked, layer
    });

    if (!object) {
      return res.status(404).json({ success: false, error: 'Scene object not found' });
    }

    res.json({ success: true, sceneObject: object });
  } catch (error) {
    log.error('Error updating scene object', error);
    res.status(500).json({ success: false, error: 'Failed to update scene object' });
  }
});

/**
 * DELETE /api/formations/:formationId/scene-objects/:objectId
 * Delete a scene object
 */
router.delete('/formations/:formationId/scene-objects/:objectId', authenticateToken, async (req, res) => {
  try {
    const { objectId } = req.params;
    await sceneObjectsAdapter.remove(objectId);
    res.json({ success: true, message: 'Scene object deleted' });
  } catch (error) {
    log.error('Error deleting scene object', error);
    res.status(500).json({ success: false, error: 'Failed to delete scene object' });
  }
});

/**
 * PUT /api/formations/:formationId/scene-objects
 * Bulk sync all scene objects (primary save path)
 */
router.put('/formations/:formationId/scene-objects', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const { objects } = req.body;

    if (!Array.isArray(objects)) {
      return res.status(400).json({ success: false, error: 'objects array is required' });
    }

    const result = await sceneObjectsAdapter.bulkSync(formationId, objects);
    res.json({ success: true, sceneObjects: result });
  } catch (error) {
    log.error('Error bulk syncing scene objects', error);
    res.status(500).json({ success: false, error: 'Failed to sync scene objects' });
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
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    // Return only public-safe fields
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
      },
    });
  } catch (error) {
    log.error('Error fetching shared formation', error);
    res.status(500).json({ success: false, error: 'Failed to fetch formation' });
  }
});

/**
 * POST /api/formations/:formationId/share
 * Generate a share link for a formation (auth required)
 */
router.post('/formations/:formationId/share', authenticateToken, async (req, res) => {
  try {
    const { formationId } = req.params;
    const formation = await formationsAdapter.getFormationById(formationId);

    if (!formation) {
      return res.status(404).json({ success: false, error: 'Formation not found' });
    }

    // Share URL is deterministic based on formation ID
    const shareUrl = `${req.protocol}://${req.get('host')}/share/${formationId}`;

    res.json({ success: true, shareUrl });
  } catch (error) {
    log.error('Error generating share link', error);
    res.status(500).json({ success: false, error: 'Failed to generate share link' });
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
