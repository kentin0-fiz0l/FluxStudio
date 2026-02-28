/**
 * Browser Routes - Browser Automation Job API
 *
 * Provides endpoints for:
 * - Link preview generation
 * - Web asset capture
 * - PDF export
 * - Project thumbnail generation
 * - Design QA diffing
 * - Job status polling
 *
 * All endpoints require authentication.
 * Jobs are queued in browser_jobs and processed by the browser-worker service.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { createLogger } = require('../lib/logger');
const log = createLogger('Browser');

const router = express.Router();

/**
 * POST /api/browser/link-preview
 * Queue a link preview generation job
 */
router.post('/link-preview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'url is required' });
    }

    const result = await query(
      'INSERT INTO browser_jobs (type, input, created_by) VALUES ($1, $2::jsonb, $3) RETURNING id',
      ['link_preview', JSON.stringify({ url }), userId]
    );

    res.status(201).json({ success: true, jobId: result.rows[0].id });
  } catch (error) {
    log.error('Error creating link-preview job', error);
    res.status(500).json({ success: false, error: 'Failed to create job' });
  }
});

/**
 * POST /api/browser/web-capture
 * Queue a web asset capture job
 */
router.post('/web-capture', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, projectId, boardId } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    const result = await query(
      'INSERT INTO browser_jobs (type, input, created_by) VALUES ($1, $2::jsonb, $3) RETURNING id',
      ['web_capture', JSON.stringify({ url, projectId, boardId: boardId || null }), userId]
    );

    res.status(201).json({ success: true, jobId: result.rows[0].id });
  } catch (error) {
    log.error('Error creating web-capture job', error);
    res.status(500).json({ success: false, error: 'Failed to create job' });
  }
});

/**
 * POST /api/browser/pdf-export
 * Queue a PDF export job
 */
router.post('/pdf-export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { html, css, projectId, format, pageSize } = req.body;

    if (!html || typeof html !== 'string') {
      return res.status(400).json({ success: false, error: 'html is required' });
    }
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    const result = await query(
      'INSERT INTO browser_jobs (type, input, created_by) VALUES ($1, $2::jsonb, $3) RETURNING id',
      ['pdf_export', JSON.stringify({ html, css: css || null, projectId, format: format || null, pageSize: pageSize || null }), userId]
    );

    res.status(201).json({ success: true, jobId: result.rows[0].id });
  } catch (error) {
    log.error('Error creating pdf-export job', error);
    res.status(500).json({ success: false, error: 'Failed to create job' });
  }
});

/**
 * POST /api/browser/thumbnail
 * Queue a project thumbnail generation job
 */
router.post('/thumbnail', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: 'projectId is required' });
    }

    const result = await query(
      'INSERT INTO browser_jobs (type, input, created_by) VALUES ($1, $2::jsonb, $3) RETURNING id',
      ['thumbnail', JSON.stringify({ projectId }), userId]
    );

    res.status(201).json({ success: true, jobId: result.rows[0].id });
  } catch (error) {
    log.error('Error creating thumbnail job', error);
    res.status(500).json({ success: false, error: 'Failed to create job' });
  }
});

/**
 * POST /api/browser/design-qa
 * Queue a design QA diffing job
 */
router.post('/design-qa', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, baselineAssetId, viewport, threshold } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    if (!baselineAssetId || typeof baselineAssetId !== 'string') {
      return res.status(400).json({ success: false, error: 'baselineAssetId is required' });
    }

    const result = await query(
      'INSERT INTO browser_jobs (type, input, created_by) VALUES ($1, $2::jsonb, $3) RETURNING id',
      ['design_qa', JSON.stringify({ url, baselineAssetId, viewport: viewport || null, threshold: threshold || null }), userId]
    );

    res.status(201).json({ success: true, jobId: result.rows[0].id });
  } catch (error) {
    log.error('Error creating design-qa job', error);
    res.status(500).json({ success: false, error: 'Failed to create job' });
  }
});

/**
 * GET /api/browser/jobs/:id
 * Poll job status
 */
router.get('/jobs/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const jobId = req.params.id;

    const result = await query(
      'SELECT id, type, status, output, error, created_at, started_at, completed_at FROM browser_jobs WHERE id = $1 AND created_by = $2',
      [jobId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, job: result.rows[0] });
  } catch (error) {
    log.error('Error fetching job status', error);
    res.status(500).json({ success: false, error: 'Failed to fetch job status' });
  }
});

module.exports = router;
