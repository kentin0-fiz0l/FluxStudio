/**
 * Template Routes - Smart Project Templates API
 *
 * Provides endpoints for:
 * - Browse/search built-in and custom templates
 * - Create custom templates from projects
 * - Template-based project creation
 *
 * Sprint 37: Phase 4.2 Smart Templates
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { zodValidate } = require('../middleware/zodValidate');
const { createCustomTemplateSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('Templates');

const router = express.Router();

// ============================================================================
// Built-in Template Catalog
// ============================================================================

const BUILT_IN_TEMPLATES = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Modern landing page with hero, features, and CTA sections',
    category: 'design',
    complexity: 'basic',
    tags: ['design', 'web', 'landing'],
    is_official: true,
    is_featured: true,
    downloads: 8420,
    rating: 4.7,
    structure: {
      projectType: 'design',
      defaultSettings: {},
      folders: [
        { path: '/designs', name: 'Designs', description: 'Design mockups and wireframes' },
        { path: '/assets', name: 'Assets', description: 'Images, icons, and media' },
        { path: '/assets/images', name: 'Images' },
        { path: '/exports', name: 'Exports', description: 'Final exported assets' },
        { path: '/docs', name: 'Documentation' },
      ],
      files: [
        { path: '/README.md', name: 'README', type: 'markdown', templateContent: '# {{projectName}}\n\n{{description}}\n\n## Sections\n- Hero\n- Features\n- Testimonials\n- CTA\n- Footer' },
        { path: '/docs/brand-guidelines.md', name: 'Brand Guidelines', type: 'markdown', templateContent: '# {{projectName}} Brand Guidelines\n\n## Colors\nPrimary: {{primaryColor}}\n\n## Typography\nHeadings: Inter\nBody: Inter' },
      ],
      entities: [
        { type: 'board', name: 'Hero Section', data: {} },
        { type: 'board', name: 'Features Grid', data: {} },
        { type: 'document', name: 'Copy Brief', data: {} },
        { type: 'task', name: 'Design hero section', data: { week: 1 } },
        { type: 'task', name: 'Create feature icons', data: { week: 1 } },
        { type: 'task', name: 'Write CTA copy', data: { week: 2 } },
        { type: 'task', name: 'Responsive testing', data: { week: 3 } },
      ],
    },
    variables: [
      { id: 'projectName', name: 'Project Name', type: 'text', defaultValue: 'My Landing Page', required: true },
      { id: 'description', name: 'Description', type: 'text', defaultValue: '', required: false },
      { id: 'primaryColor', name: 'Primary Color', type: 'color', defaultValue: '#6366f1', required: false },
    ],
    presets: [
      { id: 'minimal', name: 'Minimal', description: 'Clean, single-page', values: { complexity: 'starter' } },
      { id: 'full', name: 'Full Featured', description: 'All sections included', values: { complexity: 'advanced' } },
    ],
  },
  {
    id: 'dashboard-ui',
    name: 'Dashboard UI',
    description: 'Admin dashboard with charts, data tables, and analytics',
    category: 'design',
    complexity: 'advanced',
    tags: ['design', 'dashboard', 'admin'],
    is_official: true,
    is_featured: true,
    downloads: 6230,
    rating: 4.6,
    structure: {
      projectType: 'design',
      defaultSettings: {},
      folders: [
        { path: '/designs', name: 'Designs' },
        { path: '/designs/components', name: 'Components' },
        { path: '/assets', name: 'Assets' },
        { path: '/exports', name: 'Exports' },
        { path: '/docs', name: 'Documentation' },
      ],
      files: [
        { path: '/README.md', name: 'README', type: 'markdown', templateContent: '# {{projectName}}\n\n{{description}}' },
      ],
      entities: [
        { type: 'board', name: 'Dashboard Overview', data: {} },
        { type: 'board', name: 'Component Library', data: {} },
        { type: 'document', name: 'Design System', data: {} },
        { type: 'task', name: 'Define data models', data: { week: 1 } },
        { type: 'task', name: 'Design chart components', data: { week: 2 } },
        { type: 'task', name: 'Build table layouts', data: { week: 2 } },
        { type: 'task', name: 'Add filtering and search', data: { week: 3 } },
      ],
    },
    variables: [
      { id: 'projectName', name: 'Project Name', type: 'text', defaultValue: 'Dashboard', required: true },
      { id: 'description', name: 'Description', type: 'text', defaultValue: '', required: false },
    ],
    presets: [],
  },
  {
    id: 'music-project',
    name: 'Music Production',
    description: 'Audio project with tracks, timeline, and collaboration',
    category: 'music',
    complexity: 'basic',
    tags: ['music', 'audio', 'production'],
    is_official: true,
    is_featured: true,
    downloads: 4150,
    rating: 4.8,
    structure: {
      projectType: 'music',
      defaultSettings: {},
      folders: [
        { path: '/tracks', name: 'Tracks', description: 'Audio track files' },
        { path: '/samples', name: 'Samples', description: 'Sound samples and loops' },
        { path: '/mixes', name: 'Mixes', description: 'Mixed versions' },
        { path: '/exports', name: 'Exports', description: 'Final exports' },
        { path: '/docs', name: 'Notes' },
      ],
      files: [
        { path: '/README.md', name: 'README', type: 'markdown', templateContent: '# {{projectName}}\n\n{{description}}\n\nBPM: {{bpm}}\nKey: {{musicalKey}}' },
      ],
      entities: [
        { type: 'timeline', name: 'Main Timeline', data: {} },
        { type: 'document', name: 'Session Notes', data: {} },
        { type: 'task', name: 'Record scratch tracks', data: { week: 1 } },
        { type: 'task', name: 'Arrange sections', data: { week: 2 } },
        { type: 'task', name: 'Mix and master', data: { week: 3 } },
      ],
    },
    variables: [
      { id: 'projectName', name: 'Project Name', type: 'text', defaultValue: 'New Track', required: true },
      { id: 'description', name: 'Description', type: 'text', defaultValue: '', required: false },
      { id: 'bpm', name: 'BPM', type: 'number', defaultValue: 120, required: false },
      { id: 'musicalKey', name: 'Key', type: 'select', defaultValue: 'C major', required: false, options: [
        { value: 'C major', label: 'C Major' },
        { value: 'A minor', label: 'A Minor' },
        { value: 'G major', label: 'G Major' },
        { value: 'E minor', label: 'E Minor' },
        { value: 'D major', label: 'D Major' },
        { value: 'F major', label: 'F Major' },
      ]},
    ],
    presets: [
      { id: 'single', name: 'Single Track', description: 'One song', values: {} },
      { id: 'ep', name: 'EP (4-6 tracks)', description: 'Short release', values: { complexity: 'advanced' } },
    ],
  },
  {
    id: 'brand-identity',
    name: 'Brand Identity Kit',
    description: 'Logo, color palette, typography, and brand guidelines',
    category: 'branding',
    complexity: 'basic',
    tags: ['branding', 'logo', 'identity'],
    is_official: true,
    is_featured: false,
    downloads: 5670,
    rating: 4.5,
    structure: {
      projectType: 'branding',
      defaultSettings: {},
      folders: [
        { path: '/logos', name: 'Logos' },
        { path: '/colors', name: 'Color Palette' },
        { path: '/typography', name: 'Typography' },
        { path: '/guidelines', name: 'Guidelines' },
        { path: '/exports', name: 'Exports' },
      ],
      files: [
        { path: '/README.md', name: 'README', type: 'markdown', templateContent: '# {{projectName}} Brand Kit\n\n{{description}}' },
      ],
      entities: [
        { type: 'board', name: 'Logo Concepts', data: {} },
        { type: 'document', name: 'Brand Guidelines', data: {} },
        { type: 'task', name: 'Research and mood boards', data: { week: 1 } },
        { type: 'task', name: 'Logo concepts', data: { week: 2 } },
        { type: 'task', name: 'Color and typography', data: { week: 3 } },
        { type: 'task', name: 'Guidelines document', data: { week: 4 } },
      ],
    },
    variables: [
      { id: 'projectName', name: 'Brand Name', type: 'text', defaultValue: 'My Brand', required: true },
      { id: 'description', name: 'Description', type: 'text', defaultValue: '', required: false },
    ],
    presets: [],
  },
  {
    id: 'social-media-pack',
    name: 'Social Media Pack',
    description: 'Templates for Instagram, Twitter, LinkedIn, and more',
    category: 'social-media',
    complexity: 'starter',
    tags: ['social', 'instagram', 'marketing'],
    is_official: true,
    is_featured: false,
    downloads: 7340,
    rating: 4.4,
    structure: {
      projectType: 'social-media',
      defaultSettings: {},
      folders: [
        { path: '/instagram', name: 'Instagram' },
        { path: '/twitter', name: 'Twitter/X' },
        { path: '/linkedin', name: 'LinkedIn' },
        { path: '/assets', name: 'Shared Assets' },
        { path: '/exports', name: 'Exports' },
      ],
      files: [
        { path: '/README.md', name: 'README', type: 'markdown', templateContent: '# {{projectName}}\n\nSocial media content pack' },
      ],
      entities: [
        { type: 'board', name: 'Content Calendar', data: {} },
        { type: 'task', name: 'Create post templates', data: { week: 1 } },
        { type: 'task', name: 'Design story templates', data: { week: 1 } },
        { type: 'task', name: 'Schedule first batch', data: { week: 2 } },
      ],
    },
    variables: [
      { id: 'projectName', name: 'Campaign Name', type: 'text', defaultValue: 'Social Campaign', required: true },
      { id: 'description', name: 'Description', type: 'text', defaultValue: '', required: false },
    ],
    presets: [],
  },
  {
    id: 'video-project',
    name: 'Video Production',
    description: 'Video editing project with footage, graphics, and timeline',
    category: 'video',
    complexity: 'basic',
    tags: ['video', 'editing', 'production'],
    is_official: true,
    is_featured: false,
    downloads: 3280,
    rating: 4.3,
    structure: {
      projectType: 'video',
      defaultSettings: {},
      folders: [
        { path: '/footage', name: 'Footage' },
        { path: '/graphics', name: 'Graphics' },
        { path: '/audio', name: 'Audio' },
        { path: '/edits', name: 'Edits' },
        { path: '/exports', name: 'Exports' },
      ],
      files: [
        { path: '/README.md', name: 'README', type: 'markdown', templateContent: '# {{projectName}}\n\n{{description}}' },
      ],
      entities: [
        { type: 'timeline', name: 'Main Edit', data: {} },
        { type: 'document', name: 'Shot List', data: {} },
        { type: 'task', name: 'Import and organize footage', data: { week: 1 } },
        { type: 'task', name: 'Rough cut', data: { week: 2 } },
        { type: 'task', name: 'Color grading and audio', data: { week: 3 } },
        { type: 'task', name: 'Final export', data: { week: 4 } },
      ],
    },
    variables: [
      { id: 'projectName', name: 'Project Name', type: 'text', defaultValue: 'Video Project', required: true },
      { id: 'description', name: 'Description', type: 'text', defaultValue: '', required: false },
    ],
    presets: [],
  },
];

// ============================================================================
// Template Routes
// ============================================================================

/**
 * GET /api/templates
 * List all templates (built-in + user custom)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, complexity, featured, search, sortBy } = req.query;
    const userId = req.user.id;

    let results = BUILT_IN_TEMPLATES.map(t => ({
      ...t,
      author: { id: 'fluxstudio', name: t.author_name || 'FluxStudio Team' },
      version: '1.0.0',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      featured: t.is_featured,
      official: t.is_official,
      premium: t.is_premium || false,
    }));

    // Fetch user custom templates from DB
    try {
      const dbResult = await query(
        'SELECT * FROM user_custom_templates WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      const customTemplates = dbResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        complexity: row.complexity || 'basic',
        tags: ['custom'],
        author: { id: userId, name: 'You' },
        version: '1.0.0',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        featured: false,
        official: false,
        premium: false,
        is_custom: true,
        structure: row.structure || {},
        variables: row.variables || [],
        presets: [],
        downloads: 0,
        rating: 0,
      }));
      results = [...results, ...customTemplates];
    } catch {
      // DB not available, continue with built-in only
    }

    // Apply filters
    if (category) {
      results = results.filter(t => t.category === category);
    }
    if (complexity) {
      results = results.filter(t => t.complexity === complexity);
    }
    if (featured === 'true') {
      results = results.filter(t => t.featured);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
      );
    }

    // Sort
    switch (sortBy) {
      case 'downloads':
        results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
      case 'rating':
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        results.sort((a, b) => {
          if (a.featured !== b.featured) return b.featured ? 1 : -1;
          return (b.downloads || 0) - (a.downloads || 0);
        });
    }

    res.json({ success: true, templates: results, total: results.length });
  } catch (error) {
    log.error('List templates error', error);
    res.status(500).json({ success: false, error: 'Failed to list templates', code: 'TEMPLATE_LIST_FAILED' });
  }
});

/**
 * GET /api/templates/:id
 * Get a single template by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check built-in first
    const builtIn = BUILT_IN_TEMPLATES.find(t => t.id === id);
    if (builtIn) {
      return res.json({
        success: true,
        template: {
          ...builtIn,
          author: { id: 'fluxstudio', name: 'FluxStudio Team' },
          version: '1.0.0',
          featured: builtIn.is_featured,
          official: builtIn.is_official,
        },
      });
    }

    // Check custom templates
    const result = await query(
      'SELECT * FROM user_custom_templates WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Template not found', code: 'TEMPLATE_NOT_FOUND' });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      template: {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        complexity: row.complexity,
        structure: row.structure,
        variables: row.variables,
        is_custom: true,
      },
    });
  } catch (error) {
    log.error('Get template error', error);
    res.status(500).json({ success: false, error: 'Failed to get template', code: 'TEMPLATE_FETCH_FAILED' });
  }
});

/**
 * POST /api/templates/custom
 * Save a custom template
 */
router.post('/custom', authenticateToken, zodValidate(createCustomTemplateSchema), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, category, structure, variables, sourceProjectId } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Template name must be at least 2 characters', code: 'INVALID_TEMPLATE_NAME' });
    }

    const id = uuidv4();
    const result = await query(
      `INSERT INTO user_custom_templates
       (id, user_id, name, description, category, structure, variables, source_project_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
       RETURNING *`,
      [
        id, userId,
        name.trim(),
        description || '',
        category || 'custom',
        JSON.stringify(structure || {}),
        JSON.stringify(variables || []),
        sourceProjectId || null,
      ]
    );

    res.status(201).json({ success: true, template: result.rows[0] });
  } catch (error) {
    log.error('Create custom template error', error);
    res.status(500).json({ success: false, error: 'Failed to create custom template', code: 'TEMPLATE_CREATE_FAILED' });
  }
});

/**
 * DELETE /api/templates/custom/:id
 * Delete a custom template
 */
router.delete('/custom/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM user_custom_templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Custom template not found', code: 'TEMPLATE_NOT_FOUND' });
    }

    res.json({ success: true });
  } catch (error) {
    log.error('Delete custom template error', error);
    res.status(500).json({ success: false, error: 'Failed to delete custom template', code: 'TEMPLATE_DELETE_FAILED' });
  }
});

module.exports = router;
