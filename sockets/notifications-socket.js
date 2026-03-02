/**
 * Notifications Socket.IO Namespace
 *
 * Sprint 44: Phase 6.3 — Real-time notification delivery.
 *
 * Clients connect to /notifications with a JWT, join a user-specific room,
 * and receive `notification:new` events when a notification is created.
 *
 * The module also exports `emitNotification(userId, notification)` so the
 * notification service can push events without coupling to Socket.IO directly.
 */

const jwt = require('jsonwebtoken');
const { createLogger } = require('../lib/logger');
const log = createLogger('NotificationsSocket');

let _io = null;
let _namespace = null;

/**
 * Initialise the /notifications namespace.
 *
 * @param {import('socket.io').Namespace} namespace - Socket.IO namespace
 * @param {string} jwtSecret - JWT signing secret
 */
function initNotificationsSocket(namespace, jwtSecret) {
  _namespace = namespace;

  // JWT authentication middleware
  namespace.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      socket.userId = decoded.userId || decoded.id;
      if (!socket.userId) {
        return next(new Error('Invalid token payload'));
      }
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  namespace.on('connection', (socket) => {
    const userId = socket.userId;

    // Join user-specific room
    socket.join(`user:${userId}`);
    log.info('User connected', { userId });

    // Client can request current unread count
    socket.on('notifications:request_count', async () => {
      try {
        const { query } = require('../database/config');
        const result = await query(
          `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
          [userId]
        );
        socket.emit('notifications:count', {
          count: parseInt(result.rows[0]?.count || '0', 10),
        });
      } catch (err) {
        log.error('Count error', { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      log.info('User disconnected', { userId });
    });
  });
}

/**
 * Push a notification to a connected user in real time.
 *
 * Safe to call even if the user is offline — the event simply won't be
 * delivered (the DB record already exists as the source of truth).
 *
 * @param {string} userId - Recipient user ID
 * @param {Object} notification - Notification payload
 */
function emitNotification(userId, notification) {
  if (!_namespace) return;
  _namespace.to(`user:${userId}`).emit('notification:new', notification);
}

module.exports = initNotificationsSocket;
module.exports.emitNotification = emitNotification;
