/**
 * LMS Integration Routes - FluxStudio
 *
 * Stub Express router for LMS (Google Classroom, Canvas) integration.
 * Returns placeholder data for development and frontend wiring.
 *
 * Endpoints:
 * - GET  /providers         — available LMS providers
 * - GET  /:provider/courses — placeholder courses
 * - POST /:provider/connect — placeholder OAuth auth URL
 * - POST /:provider/share   — placeholder share result
 */

const express = require('express');
const { createLogger } = require('../lib/logger');
const log = createLogger('LMS');
const { authenticateToken } = require('../lib/data-helpers');

const router = express.Router();

// ========================================
// Placeholder Data
// ========================================

const PROVIDERS = [
  {
    id: 'google_classroom',
    name: 'Google Classroom',
    icon: 'google-classroom',
    connected: false,
  },
  {
    id: 'canvas_lms',
    name: 'Canvas LMS',
    icon: 'canvas',
    connected: false,
  },
];

const PLACEHOLDER_COURSES = {
  google_classroom: [
    { id: 'gc-101', name: 'Marching Band 101', section: 'Section A', enrollmentCode: 'abc123' },
    { id: 'gc-202', name: 'Color Guard Techniques', section: 'Fall 2025' },
    { id: 'gc-303', name: 'Drill Design Workshop', section: 'Advanced' },
  ],
  canvas_lms: [
    { id: 'cv-101', name: 'Introduction to Drill', section: 'Period 1' },
    { id: 'cv-202', name: 'Music Performance Ensemble', section: 'Period 3' },
  ],
};

// ========================================
// Routes
// ========================================

/**
 * GET /providers — list available LMS providers and connection status.
 */
router.get('/providers', authenticateToken, (_req, res) => {
  log.info('Listing LMS providers');
  res.json({ providers: PROVIDERS });
});

/**
 * GET /:provider/courses — list courses for a connected provider.
 */
router.get('/:provider/courses', authenticateToken, (req, res) => {
  const { provider } = req.params;
  const courses = PLACEHOLDER_COURSES[provider] || [];
  log.info(`Listing courses for ${provider}`, { count: courses.length });
  res.json({ courses });
});

/**
 * POST /:provider/connect — initiate OAuth flow (returns placeholder auth URL).
 */
router.post('/:provider/connect', authenticateToken, (req, res) => {
  const { provider } = req.params;
  log.info(`Connect request for ${provider}`);
  const authUrl = provider === 'google_classroom'
    ? 'https://accounts.google.com/o/oauth2/v2/auth?scope=classroom&redirect_uri=placeholder'
    : 'https://canvas.instructure.com/login/oauth2/auth?redirect_uri=placeholder';
  res.json({ authUrl });
});

/**
 * POST /:provider/share — share a formation to an LMS course as an assignment.
 */
router.post('/:provider/share', authenticateToken, (req, res) => {
  const { provider } = req.params;
  const { courseId, title, formationId } = req.body;

  if (!courseId || !title || !formationId) {
    return res.status(400).json({
      success: false,
      error: 'courseId, title, and formationId are required',
    });
  }

  log.info(`Share to ${provider}`, { courseId, title, formationId });

  const assignmentId = `${provider}-${Date.now()}`;
  const url = provider === 'google_classroom'
    ? `https://classroom.google.com/c/${courseId}/a/${assignmentId}`
    : `https://canvas.instructure.com/courses/${courseId}/assignments/${assignmentId}`;

  res.json({ url, assignmentId });
});

module.exports = router;
