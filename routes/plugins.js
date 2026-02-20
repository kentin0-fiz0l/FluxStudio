/**
 * Plugin API routes — CRUD for user plugin installations + marketplace proxy.
 *
 * Sprint 36: Phase 4.1 Plugin System.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { logAction } = require('../lib/auditLog');

// All routes require authentication
router.use(authenticateToken);

// ==================== Installed Plugins ====================

/**
 * GET /api/plugins — List installed plugins for current user
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, plugin_id, manifest, state, settings, installed_at, updated_at
       FROM user_plugins
       WHERE user_id = $1
       ORDER BY installed_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      plugins: result.rows.map(row => ({
        id: row.id,
        pluginId: row.plugin_id,
        manifest: row.manifest,
        state: row.state,
        settings: row.settings,
        installedAt: row.installed_at,
        updatedAt: row.updated_at,
      })),
    });
  } catch (error) {
    console.error('Error listing plugins:', error);
    res.status(500).json({ success: false, error: 'Failed to list plugins' });
  }
});

/**
 * POST /api/plugins/install — Install a plugin
 */
router.post('/install', async (req, res) => {
  try {
    const { manifest } = req.body;

    if (!manifest?.id || !manifest?.name || !manifest?.version || !manifest?.main) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plugin manifest. Required: id, name, version, main',
      });
    }

    // Check if already installed
    const existing = await query(
      'SELECT id FROM user_plugins WHERE user_id = $1 AND plugin_id = $2',
      [req.user.id, manifest.id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Plugin already installed',
      });
    }

    const result = await query(
      `INSERT INTO user_plugins (user_id, plugin_id, manifest, state, settings)
       VALUES ($1, $2, $3, 'inactive', $4)
       RETURNING *`,
      [
        req.user.id,
        manifest.id,
        JSON.stringify(manifest),
        JSON.stringify({}),
      ]
    );

    const row = result.rows[0];
    logAction(req.user.id, 'install', 'plugin', row.plugin_id, { name: manifest.name }, req);
    res.status(201).json({
      success: true,
      plugin: {
        id: row.id,
        pluginId: row.plugin_id,
        manifest: row.manifest,
        state: row.state,
        settings: row.settings,
        installedAt: row.installed_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Error installing plugin:', error);
    res.status(500).json({ success: false, error: 'Failed to install plugin' });
  }
});

/**
 * POST /api/plugins/:pluginId/activate — Mark plugin as active
 */
router.post('/:pluginId/activate', async (req, res) => {
  try {
    const result = await query(
      `UPDATE user_plugins
       SET state = 'active', updated_at = NOW()
       WHERE user_id = $1 AND plugin_id = $2
       RETURNING *`,
      [req.user.id, req.params.pluginId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plugin not found' });
    }

    res.json({ success: true, state: 'active' });
  } catch (error) {
    console.error('Error activating plugin:', error);
    res.status(500).json({ success: false, error: 'Failed to activate plugin' });
  }
});

/**
 * POST /api/plugins/:pluginId/deactivate — Mark plugin as inactive
 */
router.post('/:pluginId/deactivate', async (req, res) => {
  try {
    const result = await query(
      `UPDATE user_plugins
       SET state = 'inactive', updated_at = NOW()
       WHERE user_id = $1 AND plugin_id = $2
       RETURNING *`,
      [req.user.id, req.params.pluginId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plugin not found' });
    }

    res.json({ success: true, state: 'inactive' });
  } catch (error) {
    console.error('Error deactivating plugin:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate plugin' });
  }
});

/**
 * DELETE /api/plugins/:pluginId — Uninstall a plugin
 */
router.delete('/:pluginId', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM user_plugins WHERE user_id = $1 AND plugin_id = $2 RETURNING id',
      [req.user.id, req.params.pluginId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plugin not found' });
    }

    logAction(req.user.id, 'uninstall', 'plugin', req.params.pluginId, {}, req);
    res.json({ success: true });
  } catch (error) {
    console.error('Error uninstalling plugin:', error);
    res.status(500).json({ success: false, error: 'Failed to uninstall plugin' });
  }
});

/**
 * GET /api/plugins/:pluginId/settings — Get plugin settings
 */
router.get('/:pluginId/settings', async (req, res) => {
  try {
    const result = await query(
      'SELECT settings FROM user_plugins WHERE user_id = $1 AND plugin_id = $2',
      [req.user.id, req.params.pluginId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plugin not found' });
    }

    res.json({ success: true, settings: result.rows[0].settings });
  } catch (error) {
    console.error('Error getting plugin settings:', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/plugins/:pluginId/settings — Update plugin settings
 */
router.put('/:pluginId/settings', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Settings object required' });
    }

    const result = await query(
      `UPDATE user_plugins
       SET settings = settings || $3::jsonb, updated_at = NOW()
       WHERE user_id = $1 AND plugin_id = $2
       RETURNING settings`,
      [req.user.id, req.params.pluginId, JSON.stringify(settings)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Plugin not found' });
    }

    res.json({ success: true, settings: result.rows[0].settings });
  } catch (error) {
    console.error('Error updating plugin settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

/**
 * GET /api/plugins/marketplace — Search marketplace
 * Query params: query, category, sortBy, page, limit, featured, verified
 */
router.get('/marketplace', async (req, res) => {
  // For now, return the built-in plugin catalog.
  // In production this would proxy to a marketplace API.
  const catalog = [
    createCatalogEntry('dark-theme-pro', 'Dark Theme Pro', 'themes', true, true, ['storage', 'ui']),
    createCatalogEntry('figma-import', 'Figma Import', 'integrations', true, true, ['storage', 'ui', 'network', 'files']),
    createCatalogEntry('ai-copilot-plus', 'AI Copilot Plus', 'ai', true, true, ['storage', 'ui', 'ai']),
    createCatalogEntry('color-palette-gen', 'Color Palette Generator', 'design', false, true, ['storage', 'ui']),
    createCatalogEntry('analytics-dashboard', 'Analytics Dashboard', 'analytics', false, true, ['storage', 'ui', 'projects']),
    createCatalogEntry('git-integration', 'Git Integration', 'productivity', false, true, ['storage', 'ui', 'network']),
    createCatalogEntry('spell-checker', 'Spell Checker', 'utilities', false, false, ['storage', 'ui']),
    createCatalogEntry('markdown-preview', 'Markdown Preview', 'utilities', false, true, ['storage', 'ui']),
  ];

  let filtered = catalog;
  const { query: q, category, featured, verified, sortBy } = req.query;

  if (q) {
    const lower = String(q).toLowerCase();
    filtered = filtered.filter(p =>
      p.manifest.name.toLowerCase().includes(lower) ||
      p.manifest.description.toLowerCase().includes(lower)
    );
  }
  if (category) filtered = filtered.filter(p => p.categories.includes(String(category)));
  if (featured === 'true') filtered = filtered.filter(p => p.featured);
  if (verified === 'true') filtered = filtered.filter(p => p.verified);

  if (sortBy === 'downloads') filtered.sort((a, b) => b.downloads - a.downloads);
  else if (sortBy === 'rating') filtered.sort((a, b) => b.rating - a.rating);
  else if (sortBy === 'name') filtered.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;

  res.json({
    success: true,
    plugins: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
    hasMore: start + limit < filtered.length,
  });
});

function createCatalogEntry(id, name, category, featured, verified, permissions) {
  return {
    id,
    manifest: {
      id,
      name,
      version: '1.0.0',
      description: `${name} for FluxStudio — enhance your workflow`,
      author: { name: 'FluxStudio Community' },
      main: `plugins/${id}/index.js`,
      permissions,
      fluxStudioVersion: '^1.0.0',
    },
    downloads: Math.floor(Math.random() * 50000) + 1000,
    rating: +(3.5 + Math.random() * 1.5).toFixed(1),
    ratingCount: Math.floor(Math.random() * 500) + 10,
    featured,
    verified,
    categories: [category],
    screenshots: [],
    publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = router;
