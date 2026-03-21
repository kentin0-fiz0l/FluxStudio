/**
 * AI Preferences Routes - User preference learning for AI personalization
 *
 * Stores and retrieves per-user AI preferences (spacing style, ensemble size,
 * preferred transition types, etc.) to enhance formation AI suggestions.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { createLogger } = require('../lib/logger');
const { asyncHandler } = require('../middleware/errorHandler');

const log = createLogger('AIPreferences');
const router = express.Router();

// In-memory cache for preferences (5-minute TTL per user)
const preferencesCache = new Map(); // userId -> { data, timestamp }
const CACHE_TTL_MS = 5 * 60 * 1000;

// Database query helper (with fallback)
let query;
try {
  query = require('../database/config').query;
} catch {
  query = null;
}

/**
 * GET /api/ai/preferences
 * Returns the current user's AI preferences.
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check cache first
  const cached = preferencesCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ success: true, data: cached.data });
  }

  if (!query) {
    return res.json({ success: true, data: [], message: 'Database not configured' });
  }

  const result = await query(
    'SELECT preference_key, preference_value, confidence, source, updated_at FROM user_ai_preferences WHERE user_id = $1 ORDER BY preference_key',
    [userId]
  );

  const preferences = result.rows.map(row => ({
    key: row.preference_key,
    value: row.preference_value,
    confidence: row.confidence,
    source: row.source,
    updatedAt: row.updated_at,
  }));

  preferencesCache.set(userId, { data: preferences, timestamp: Date.now() });
  res.json({ success: true, data: preferences });
}));

/**
 * POST /api/ai/preferences
 * Manually set a user preference.
 * Body: { key: string, value: any }
 */
router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { key, value } = req.body;

  if (!key || typeof key !== 'string' || key.length > 100) {
    return res.status(400).json({ success: false, error: 'Invalid preference key' });
  }

  if (!query) {
    return res.json({ success: true, message: 'Database not configured, preference not saved' });
  }

  await query(
    `INSERT INTO user_ai_preferences (user_id, preference_key, preference_value, confidence, source)
     VALUES ($1, $2, $3, 1.0, 'explicit')
     ON CONFLICT (user_id, preference_key)
     DO UPDATE SET preference_value = $3, confidence = 1.0, source = 'explicit', updated_at = NOW()`,
    [userId, key, JSON.stringify(value)]
  );

  // Invalidate cache
  preferencesCache.delete(userId);

  res.json({ success: true, message: 'Preference saved' });
}));

/**
 * POST /api/ai/preferences/feedback
 * Record accept/reject for a suggestion. Updates inferred preferences.
 * Body: { suggestionType: string, accepted: boolean, context?: object }
 */
router.post('/feedback', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { suggestionType, accepted, context } = req.body;

  if (!suggestionType || typeof accepted !== 'boolean') {
    return res.status(400).json({ success: false, error: 'suggestionType and accepted are required' });
  }

  if (!query) {
    return res.json({ success: true, message: 'Database not configured, feedback not saved' });
  }

  // Retrieve existing preference for this suggestion type
  const existing = await query(
    'SELECT preference_value, confidence FROM user_ai_preferences WHERE user_id = $1 AND preference_key = $2',
    [userId, `feedback_${suggestionType}`]
  );

  let newConfidence = 0.5;
  let feedbackData = { acceptCount: 0, rejectCount: 0 };

  if (existing.rows.length > 0) {
    feedbackData = existing.rows[0].preference_value || { acceptCount: 0, rejectCount: 0 };
    newConfidence = existing.rows[0].confidence;
  }

  if (accepted) {
    feedbackData.acceptCount = (feedbackData.acceptCount || 0) + 1;
    // Increase confidence toward 1.0
    newConfidence = Math.min(1.0, newConfidence + 0.05);
  } else {
    feedbackData.rejectCount = (feedbackData.rejectCount || 0) + 1;
    // Decrease confidence toward 0.0
    newConfidence = Math.max(0.0, newConfidence - 0.05);
  }

  // Add context if provided
  if (context) {
    feedbackData.lastContext = context;
  }

  await query(
    `INSERT INTO user_ai_preferences (user_id, preference_key, preference_value, confidence, source)
     VALUES ($1, $2, $3, $4, 'inferred')
     ON CONFLICT (user_id, preference_key)
     DO UPDATE SET preference_value = $3, confidence = $4, source = 'inferred', updated_at = NOW()`,
    [userId, `feedback_${suggestionType}`, JSON.stringify(feedbackData), newConfidence]
  );

  // Invalidate cache
  preferencesCache.delete(userId);

  res.json({ success: true, confidence: newConfidence });
}));

/**
 * Load user preferences and build a prompt injection string.
 * Used internally by other AI route files.
 *
 * @param {string} userId
 * @returns {Promise<string>} Formatted preferences string for system prompt injection
 */
async function loadPreferencesForPrompt(userId) {
  if (!query) return '';

  try {
    // Check cache first
    const cached = preferencesCache.get(userId);
    let preferences;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      preferences = cached.data;
    } else {
      const result = await query(
        'SELECT preference_key, preference_value, confidence FROM user_ai_preferences WHERE user_id = $1 AND confidence >= 0.3',
        [userId]
      );
      preferences = result.rows;
      preferencesCache.set(userId, {
        data: preferences.map(r => ({
          key: r.preference_key,
          value: r.preference_value,
          confidence: r.confidence,
        })),
        timestamp: Date.now(),
      });
    }

    if (!preferences || preferences.length === 0) return '';

    // Build human-readable preference summary
    const parts = preferences
      .filter(p => !p.key?.startsWith('feedback_') && (p.confidence ?? p.confidence) >= 0.5)
      .map(p => {
        const key = p.key || p.preference_key;
        const value = p.value || p.preference_value;
        return `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`;
      });

    if (parts.length === 0) return '';
    return `\n\nUser preferences: ${parts.join(', ')}`;
  } catch (err) {
    log.warn('Failed to load user preferences', { error: err.message });
    return '';
  }
}

module.exports = router;
module.exports.loadPreferencesForPrompt = loadPreferencesForPrompt;
