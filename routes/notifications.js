/**
 * Notifications Routes - User Notification Management API
 *
 * Provides endpoints for:
 * - Listing notifications (global and project-scoped)
 * - Marking notifications as read
 * - Notification preferences management
 * - Unread counts
 *
 * All endpoints require authentication.
 */

const express = require('express');
const { authenticateToken } = require('../lib/auth/middleware');
const { validateInput } = require('../middleware/security');
const messagingConversationsAdapter = require('../database/messaging-conversations-adapter');
const notificationService = require('../services/notification-service');
const { query } = require('../database/config');

const router = express.Router();

/**
 * GET /api/notifications
 * List notifications for current user
 * Supports optional projectId query param for project-scoped filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const onlyUnread = req.query.onlyUnread === 'true' || req.query.onlyUnread === '1';
    const projectId = req.query.projectId || null;

    const notifications = await messagingConversationsAdapter.listNotifications({
      userId,
      limit,
      offset,
      onlyUnread,
      projectId
    });

    res.json({
      success: true,
      notifications,
      pagination: { limit, offset },
      filter: { projectId, onlyUnread }
    });
  } catch (error) {
    console.error('Error listing notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to list notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await messagingConversationsAdapter.markNotificationRead({
      notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read (POST version for easier frontend integration)
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await messagingConversationsAdapter.markNotificationRead({
      notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await messagingConversationsAdapter.markAllNotificationsRead({ userId });

    res.json({ success: true, updatedCount: count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark all notifications as read' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await messagingConversationsAdapter.getUnreadNotificationCount({ userId });

    res.json({ success: true, count });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({ success: false, error: 'Failed to get unread count' });
  }
});

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await notificationService.getUserPreferences(userId);
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to get preferences' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences', authenticateToken, validateInput.sanitizeInput, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const preferences = await notificationService.updateUserPreferences(userId, updates);
    res.json({ success: true, preferences });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/projects/:projectId/notifications/read-all
 * Mark all project notifications as read
 */
router.post('/projects/:projectId/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;

    // Mark all notifications for this project as read
    const result = await query(`
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE user_id = $1 AND is_read = FALSE
        AND (project_id = $2 OR metadata_json->>'projectId' = $2)
      RETURNING id
    `, [userId, projectId]);

    res.json({
      success: true,
      updatedCount: result.rowCount,
      projectId
    });
  } catch (error) {
    console.error('Error marking project notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

/**
 * GET /api/projects/:projectId/notifications
 * Get notifications for a specific project
 */
router.get('/projects/:projectId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const onlyUnread = req.query.onlyUnread === 'true';
    const category = req.query.category || null;

    // Build query conditions
    let conditions = ['n.user_id = $1', "(n.project_id = $2 OR n.metadata_json->>'projectId' = $2)"];
    let params = [userId, projectId];
    let paramIndex = 3;

    if (onlyUnread) {
      conditions.push('n.is_read = FALSE');
    }

    if (category && category !== 'all') {
      conditions.push(`(n.category = $${paramIndex} OR n.metadata_json->>'category' = $${paramIndex})`);
      params.push(category);
      paramIndex++;
    }

    // Get notifications
    const result = await query(`
      SELECT
        n.id,
        n.type,
        n.title,
        n.message,
        n.is_read as "isRead",
        n.read_at as "readAt",
        n.created_at as "createdAt",
        n.action_url as "actionUrl",
        n.priority,
        n.category,
        n.metadata_json as metadata,
        u.name as "senderName",
        u.avatar_url as "senderAvatar"
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE ${conditions.join(' AND ')}
    `, params);

    res.json({
      success: true,
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      pagination: { limit, offset },
      filter: { projectId, onlyUnread, category }
    });
  } catch (error) {
    console.error('Error getting project notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to get project notifications' });
  }
});

module.exports = router;
