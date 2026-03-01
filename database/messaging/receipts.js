/**
 * Messaging Receipts Adapter
 * Delivery receipts and read status functionality
 */

const { query } = require('../config');
const { createLogger } = require('../../lib/logger');
const log = createLogger('DB:Msg:Receipts');

function transformReceipt(dbReceipt) {
  return {
    id: dbReceipt.id,
    messageId: dbReceipt.message_id,
    userId: dbReceipt.user_id,
    userName: dbReceipt.user_name,
    userAvatar: dbReceipt.user_avatar,
    status: dbReceipt.status,
    deliveredAt: dbReceipt.delivered_at,
    readAt: dbReceipt.read_at,
    createdAt: dbReceipt.created_at
  };
}

async function createDeliveryReceipt(messageId, userId, status = 'delivered') {
  try {
    const id = `rcpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await query(
      `INSERT INTO message_receipts (id, message_id, user_id, status, delivered_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET status = $4, delivered_at = COALESCE(message_receipts.delivered_at, NOW()), updated_at = NOW()
       RETURNING *`,
      [id, messageId, userId, status]
    );
    return result.rows.length > 0 ? transformReceipt(result.rows[0]) : null;
  } catch (error) {
    log.error('Error creating delivery receipt', error);
    return null;
  }
}

async function markMessageRead(messageId, userId) {
  try {
    const id = `rcpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await query(
      `INSERT INTO message_receipts (id, message_id, user_id, status, delivered_at, read_at)
       VALUES ($1, $2, $3, 'read', NOW(), NOW())
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET status = 'read', read_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [id, messageId, userId]
    );
    return result.rows.length > 0 ? transformReceipt(result.rows[0]) : null;
  } catch (error) {
    log.error('Error marking message read', error);
    return null;
  }
}

async function getMessageReceipts(messageId) {
  try {
    const result = await query(
      `SELECT mr.*, u.name as user_name, u.avatar_url as user_avatar
       FROM message_receipts mr
       LEFT JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       ORDER BY mr.delivered_at`,
      [messageId]
    );
    return result.rows.map(transformReceipt);
  } catch (error) {
    log.error('Error getting message receipts', error);
    return [];
  }
}

async function getMessageDeliveryStatus(messageId, totalParticipants) {
  try {
    const result = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('delivered', 'read')) as delivered_count,
         COUNT(*) FILTER (WHERE status = 'read') as read_count
       FROM message_receipts
       WHERE message_id = $1`,
      [messageId]
    );
    const row = result.rows[0];
    const deliveredCount = parseInt(row.delivered_count) || 0;
    const readCount = parseInt(row.read_count) || 0;

    // Determine overall status
    let status = 'sent';
    if (readCount >= totalParticipants - 1) {
      status = 'read';
    } else if (deliveredCount >= totalParticipants - 1) {
      status = 'delivered';
    } else if (deliveredCount > 0) {
      status = 'delivered';
    }

    return { status, deliveredCount, readCount, totalParticipants };
  } catch (error) {
    log.error('Error getting message delivery status', error);
    return { status: 'sent', deliveredCount: 0, readCount: 0, totalParticipants };
  }
}

module.exports = {
  transformReceipt,
  createDeliveryReceipt,
  markMessageRead,
  getMessageReceipts,
  getMessageDeliveryStatus
};
