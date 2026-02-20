/**
 * Session Manager
 *
 * Sprint 41: Phase 5.4 Enterprise & Compliance
 *
 * Tracks active sessions, enforces concurrent session limits,
 * and provides session revocation.
 */

const { query } = require('../../database/config');

/**
 * Register a new session when tokens are issued.
 */
async function createSession(userId, tokenId, req) {
  const ip = req?.ip || req?.connection?.remoteAddress || null;
  const userAgent = req?.headers?.['user-agent'] || '';

  const deviceInfo = {
    userAgent,
    browser: parseBrowser(userAgent),
    os: parseOS(userAgent),
  };

  try {
    await query(
      `INSERT INTO active_sessions (user_id, token_id, device_info, ip_address)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token_id) DO UPDATE SET last_active_at = NOW()`,
      [userId, tokenId, JSON.stringify(deviceInfo), ip]
    );
  } catch (error) {
    console.error('[SessionManager] Failed to create session:', error.message);
  }
}

/**
 * Update last_active_at for a session (call from auth middleware).
 */
async function touchSession(tokenId) {
  try {
    await query(
      `UPDATE active_sessions SET last_active_at = NOW() WHERE token_id = $1`,
      [tokenId]
    );
  } catch {
    // Non-critical — don't fail the request
  }
}

/**
 * Remove a session (logout or revocation).
 */
async function removeSession(tokenId) {
  try {
    await query(`DELETE FROM active_sessions WHERE token_id = $1`, [tokenId]);
  } catch (error) {
    console.error('[SessionManager] Failed to remove session:', error.message);
  }
}

/**
 * Remove all sessions for a user except the current one.
 */
async function revokeAllSessions(userId, exceptTokenId = null) {
  try {
    if (exceptTokenId) {
      await query(
        `DELETE FROM active_sessions WHERE user_id = $1 AND token_id != $2`,
        [userId, exceptTokenId]
      );
    } else {
      await query(`DELETE FROM active_sessions WHERE user_id = $1`, [userId]);
    }
  } catch (error) {
    console.error('[SessionManager] Failed to revoke sessions:', error.message);
  }
}

/**
 * List active sessions for a user.
 */
async function listSessions(userId) {
  try {
    const result = await query(
      `SELECT id, token_id, device_info, ip_address, last_active_at, created_at
       FROM active_sessions
       WHERE user_id = $1
       ORDER BY last_active_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('[SessionManager] Failed to list sessions:', error.message);
    return [];
  }
}

/**
 * Enforce max concurrent sessions — revoke oldest if limit exceeded.
 */
async function enforceSessionLimit(userId, maxSessions = 5) {
  try {
    const result = await query(
      `SELECT id, token_id FROM active_sessions
       WHERE user_id = $1
       ORDER BY last_active_at DESC`,
      [userId]
    );

    if (result.rows.length > maxSessions) {
      const toRevoke = result.rows.slice(maxSessions);
      const ids = toRevoke.map(r => r.id);
      await query(
        `DELETE FROM active_sessions WHERE id = ANY($1::uuid[])`,
        [ids]
      );
    }
  } catch (error) {
    console.error('[SessionManager] Failed to enforce limit:', error.message);
  }
}

/**
 * Clean up expired sessions (call periodically).
 */
async function cleanupExpiredSessions(maxAgeMinutes = 480) {
  try {
    const result = await query(
      `DELETE FROM active_sessions
       WHERE last_active_at < NOW() - ($1 || ' minutes')::INTERVAL
       RETURNING id`,
      [String(maxAgeMinutes)]
    );
    return result.rows.length;
  } catch (error) {
    console.error('[SessionManager] Cleanup failed:', error.message);
    return 0;
  }
}

// Periodic cleanup every 30 minutes
setInterval(() => cleanupExpiredSessions(), 30 * 60 * 1000);

// Simple UA parsers
function parseBrowser(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Other';
}

function parseOS(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

module.exports = {
  createSession,
  touchSession,
  removeSession,
  revokeAllSessions,
  listSessions,
  enforceSessionLimit,
  cleanupExpiredSessions,
};
