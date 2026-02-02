/**
 * Push Notification Routes
 *
 * Provides API endpoints for:
 * - Push subscription management
 * - Notification preferences
 * - Subscription status
 *
 * Extracted from server-unified.js for Phase 4.5 Technical Debt Resolution
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../lib/auth/middleware');
const { query } = require('../database/config');
const { validateInput } = require('../middleware/security');

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    // Check if subscription already exists
    const existing = await query(
      'SELECT id FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );

    if (existing.rows.length > 0) {
      // Update existing subscription
      await query(`
        UPDATE push_subscriptions
        SET user_id = $1, p256dh_key = $2, auth_key = $3, last_used_at = NOW()
        WHERE endpoint = $4
      `, [req.user.id, keys.p256dh, keys.auth, endpoint]);
    } else {
      // Create new subscription
      const id = uuidv4();
      await query(`
        INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh_key, auth_key, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [id, req.user.id, endpoint, keys.p256dh, keys.auth, req.headers['user-agent'] || null]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint is required' });
    }

    await query(
      'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
      [endpoint, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

/**
 * GET /api/push/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM user_notification_preferences WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return res.json({
        pushEnabled: true,
        pushMessages: true,
        pushProjectUpdates: true,
        pushMentions: true,
        pushComments: true,
        quietHoursStart: null,
        quietHoursEnd: null
      });
    }

    const prefs = result.rows[0];
    res.json({
      pushEnabled: prefs.push_enabled,
      pushMessages: prefs.push_messages,
      pushProjectUpdates: prefs.push_project_updates,
      pushMentions: prefs.push_mentions,
      pushComments: prefs.push_comments,
      quietHoursStart: prefs.quiet_hours_start,
      quietHoursEnd: prefs.quiet_hours_end
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

/**
 * PUT /api/push/preferences
 * Update user's notification preferences
 */
router.put('/preferences', authenticateToken, validateInput.sanitizeInput, async (req, res) => {
  try {
    const {
      pushEnabled,
      pushMessages,
      pushProjectUpdates,
      pushMentions,
      pushComments,
      quietHoursStart,
      quietHoursEnd
    } = req.body;

    await query(`
      INSERT INTO user_notification_preferences (
        user_id, push_enabled, push_messages, push_project_updates,
        push_mentions, push_comments, quiet_hours_start, quiet_hours_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        push_enabled = EXCLUDED.push_enabled,
        push_messages = EXCLUDED.push_messages,
        push_project_updates = EXCLUDED.push_project_updates,
        push_mentions = EXCLUDED.push_mentions,
        push_comments = EXCLUDED.push_comments,
        quiet_hours_start = EXCLUDED.quiet_hours_start,
        quiet_hours_end = EXCLUDED.quiet_hours_end,
        updated_at = NOW()
    `, [
      req.user.id,
      pushEnabled !== false,
      pushMessages !== false,
      pushProjectUpdates !== false,
      pushMentions !== false,
      pushComments !== false,
      quietHoursStart || null,
      quietHoursEnd || null
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

/**
 * GET /api/push/status
 * Get subscription status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      subscriptionCount: parseInt(result.rows[0].count, 10),
      isSubscribed: parseInt(result.rows[0].count, 10) > 0
    });
  } catch (error) {
    console.error('Error getting push status:', error);
    res.status(500).json({ error: 'Failed to get push status' });
  }
});

module.exports = router;
