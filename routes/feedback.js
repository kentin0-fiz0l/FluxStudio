/**
 * Feedback Routes - In-app feedback widget API
 *
 * Sprint 56: User feedback collection for beta users
 *
 * Endpoints:
 * - POST /api/feedback        - Submit feedback (authenticated)
 * - GET  /api/admin/feedback   - List feedback (admin only)
 */

const express = require('express');
const { authenticateToken, requireAdmin } = require('../lib/auth/middleware');
const { zodValidate } = require('../middleware/zodValidate');
const { submitFeedbackSchema } = require('../lib/schemas');
const { createLogger } = require('../lib/logger');
const log = createLogger('Feedback');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Try to load database query
let dbQuery = null;
try {
  const { query } = require('../database/config');
  dbQuery = query;
} catch (e) {
  log.warn('Database not available for feedback routes');
}

const VALID_TYPES = ['bug', 'feature', 'general'];

/**
 * POST /api/feedback
 * Submit feedback from the in-app widget
 */
router.post('/', authenticateToken, zodValidate(submitFeedbackSchema), asyncHandler(async (req, res) => {
  const { type, message } = req.body;

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Invalid feedback type. Must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  if (!message || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Feedback message is required.',
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({
      success: false,
      error: 'Feedback message must be under 5000 characters.',
    });
  }

  if (!dbQuery) {
    return res.status(503).json({
      success: false,
      error: 'Feedback service temporarily unavailable.',
    });
  }

  const result = await dbQuery(
    `INSERT INTO user_feedback (user_id, type, message, page_url, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, type, created_at`,
    [
      req.user.id,
      type,
      message.trim(),
      req.body.pageUrl || null,
      req.get('user-agent') || null,
    ]
  );

  // Forward to Slack webhook (non-blocking)
  if (process.env.SLACK_FEEDBACK_WEBHOOK_URL) {
    const emoji = type === 'bug' ? ':bug:' : type === 'feature' ? ':bulb:' : ':speech_balloon:';
    fetch(process.env.SLACK_FEEDBACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `${emoji} *New ${type} feedback* from ${req.user.email || 'user'}:\n>${message.trim().slice(0, 500)}${message.length > 500 ? '...' : ''}\n_Page: ${req.body.pageUrl || 'unknown'}_`,
      }),
    }).catch(err => log.warn('Slack feedback webhook failed', err.message));
  }

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: 'Thank you for your feedback!',
  });
}));

/**
 * GET /api/admin/feedback
 * List all feedback (admin only)
 */
router.get('/admin', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  if (!dbQuery) {
    return res.status(503).json({ success: false, error: 'Database unavailable.' });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const offset = (page - 1) * limit;

  const [feedbackResult, countResult] = await Promise.all([
    dbQuery(
      `SELECT f.id, f.type, f.message, f.page_url, f.user_agent, f.created_at,
              u.email, u.name as user_name
       FROM user_feedback f
       LEFT JOIN users u ON u.id = f.user_id
       ORDER BY f.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    dbQuery('SELECT COUNT(*) FROM user_feedback'),
  ]);

  res.json({
    success: true,
    data: feedbackResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    },
  });
}));

module.exports = router;
