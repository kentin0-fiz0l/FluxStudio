/**
 * Token Service - JWT Access & Refresh Token Management
 *
 * Implements secure token rotation with:
 * - Short-lived access tokens (15 minutes)
 * - Long-lived refresh tokens (7 days, database-backed)
 * - Device fingerprinting with strict binding
 * - Sliding sessions with automatic rotation after inactivity
 * - Maximum concurrent sessions per user
 * - Replay detection (rotated/revoked tokens fail verification)
 *
 * Security Features:
 * - Refresh tokens stored in database (can be revoked)
 * - Device binding prevents token theft across devices
 * - Automatic cleanup of expired tokens
 * - Rate limiting on refresh attempts
 * - Session limiting prevents unlimited device sprawl
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db');
const securityLogger = require('./securityLogger');
const cache = require('../cache');
const { createLogger } = require('../logger');
const log = createLogger('TokenService');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const ACTIVITY_EXTENSION_THRESHOLD = 5 * 60 * 1000; // 5 minutes - extend if active within this window
const MAX_SESSIONS_PER_USER = 5; // Maximum concurrent refresh tokens per user

// Validate JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}
log.info('JWT_SECRET loaded successfully');

/**
 * Generate Access Token (Short-lived, stateless)
 *
 * @param {Object} user - User object
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.userType - User type (client/freelancer/admin)
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  if (!user || !user.id) {
    throw new Error('User object with id is required');
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      userType: user.userType,
      type: 'access',
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      algorithm: 'HS256'
    }
  );
}

/**
 * Generate Refresh Token (Long-lived, stored in database)
 *
 * Creates a new database-backed refresh token with:
 * - Cryptographically secure random value
 * - Device fingerprint binding for security
 * - Automatic session limiting (revokes oldest sessions if user exceeds MAX_SESSIONS_PER_USER)
 *
 * @param {Object} user - User object with id
 * @param {Object} deviceInfo - Device information for binding
 * @param {string} [deviceInfo.deviceName] - Device name (e.g., "Chrome on MacOS")
 * @param {string} [deviceInfo.deviceFingerprint] - Browser fingerprint for device binding
 * @param {string} [deviceInfo.ipAddress] - IP address
 * @param {string} [deviceInfo.userAgent] - User agent string
 * @returns {Promise<string>} Plain refresh token (store securely on client)
 */
async function generateRefreshToken(user, deviceInfo = {}) {
  if (!user || !user.id) {
    throw new Error('User object with id is required');
  }

  // Generate cryptographically secure random token
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  try {
    // Deduplicate rapid login attempts (e.g. double OAuth callback):
    // If a session was created for this user in the last 10 seconds, reuse it
    const recentSession = await query(
      `SELECT token FROM refresh_tokens
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
         AND created_at > NOW() - INTERVAL '10 seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [user.id]
    );

    if (recentSession.rows.length > 0) {
      log.info('Reusing recent session to prevent duplicate login', { userId: user.id });
      return recentSession.rows[0].token;
    }

    // Enforce maximum sessions per user: revoke oldest sessions if limit exceeded
    // This prevents unlimited device sprawl and limits attack surface
    const existingSessions = await query(
      `SELECT id, created_at FROM refresh_tokens
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at ASC`,
      [user.id]
    );

    if (existingSessions.rows.length >= MAX_SESSIONS_PER_USER) {
      // Revoke oldest sessions to make room for the new one
      const sessionsToRevoke = existingSessions.rows.slice(0, existingSessions.rows.length - MAX_SESSIONS_PER_USER + 1);
      for (const session of sessionsToRevoke) {
        await query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
          [session.id]
        );
        log.info('Revoked oldest session due to session limit', { sessionId: session.id, userId: user.id });
      }
    }

    // Store refresh token in database
    const result = await query(
      `INSERT INTO refresh_tokens
       (user_id, token, device_fingerprint, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        user.id,
        token,
        deviceInfo.deviceFingerprint ? JSON.stringify(deviceInfo.deviceFingerprint) : null,
        deviceInfo.ipAddress || null,
        deviceInfo.userAgent || null,
        expiresAt
      ]
    );

    const tokenId = result.rows[0].id;

    // Log token generation
    await securityLogger.logTokenGenerated(
      user.id,
      tokenId,
      {
        ip: deviceInfo.ipAddress,
        headers: { 'user-agent': deviceInfo.userAgent }
      },
      {
        deviceFingerprint: deviceInfo.deviceFingerprint,
        deviceName: deviceInfo.deviceName,
        expiresAt: expiresAt.toISOString()
      }
    );

    return token;
  } catch (error) {
    log.error('Error generating refresh token', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Generate Token Pair (Access + Refresh)
 *
 * @param {Object} user - User object
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<Object>} Token pair { accessToken, refreshToken, expiresIn }
 */
async function generateTokenPair(user, deviceInfo = {}) {
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user, deviceInfo);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
    tokenType: 'Bearer'
  };
}

/**
 * Verify Access Token
 *
 * @param {string} token - JWT access token
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    });

    // Ensure it's an access token (not refresh)
    if (decoded.type !== 'access') {
      return null;
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      log.debug('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      log.debug('Invalid access token');
    }
    return null;
  }
}

/**
 * Verify Refresh Token
 *
 * Validates a refresh token with strict security checks:
 * 1. Token exists in database (replay detection: rotated tokens will not exist)
 * 2. Token not expired (expires_at > NOW)
 * 3. Token not revoked (revoked_at IS NULL)
 * 4. Device fingerprint MUST match if provided (strict device binding)
 *
 * Replay Detection: Once a token is rotated or revoked, any attempt to reuse
 * it will fail at step 1 (token not found or revoked). This prevents replay attacks.
 *
 * @param {string} token - Refresh token to verify
 * @param {Object} options - Verification options
 * @param {string} [options.deviceFingerprint] - Device fingerprint (MUST match if provided)
 * @param {string} [options.ipAddress] - Current IP address for logging
 * @param {string} [options.userAgent] - User agent for logging
 * @returns {Promise<Object|null>} Token data row or null if invalid/rejected
 */
async function verifyRefreshToken(token, options = {}) {
  try {
    // Step 1: Look up token - this also handles replay detection
    // If a token was rotated (revoked) and reused, it will fail here
    const result = await query(
      `SELECT * FROM refresh_tokens WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      // Token not found - could be invalid or already rotated (replay attempt)
      await securityLogger.logEvent(
        securityLogger.EVENT_TYPES.TOKEN_VERIFICATION_FAILED,
        securityLogger.SEVERITY.WARNING,
        {
          reason: 'Token not found (possible replay of rotated token)',
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        }
      );
      return null;
    }

    const tokenData = result.rows[0];

    // Step 2: Check if token was revoked (replay detection)
    if (tokenData.revoked_at !== null) {
      log.warn('Attempted use of revoked refresh token', { tokenId: tokenData.id, userId: tokenData.user_id });
      await securityLogger.logEvent(
        securityLogger.EVENT_TYPES.TOKEN_VERIFICATION_FAILED,
        securityLogger.SEVERITY.WARNING,
        {
          reason: 'Token revoked (possible replay attack)',
          tokenId: tokenData.id,
          userId: tokenData.user_id,
          ipAddress: options.ipAddress
        }
      );
      return null;
    }

    // Step 3: Check if token is expired
    if (new Date(tokenData.expires_at) <= new Date()) {
      await securityLogger.logEvent(
        securityLogger.EVENT_TYPES.TOKEN_VERIFICATION_FAILED,
        securityLogger.SEVERITY.WARNING,
        {
          reason: 'Token expired',
          tokenId: tokenData.id,
          userId: tokenData.user_id,
          ipAddress: options.ipAddress
        }
      );
      return null;
    }

    // Step 4: Strict device fingerprint binding
    // If fingerprint is provided, it MUST match the stored fingerprint
    if (options.deviceFingerprint && tokenData.device_fingerprint) {
      const storedFingerprint = typeof tokenData.device_fingerprint === 'string'
        ? tokenData.device_fingerprint
        : JSON.stringify(tokenData.device_fingerprint);
      const providedFingerprint = typeof options.deviceFingerprint === 'string'
        ? options.deviceFingerprint
        : JSON.stringify(options.deviceFingerprint);

      if (providedFingerprint !== storedFingerprint) {
        log.warn('Device fingerprint mismatch for refresh token', { tokenId: tokenData.id, userId: tokenData.user_id });
        await securityLogger.logDeviceMismatch(
          tokenData.user_id,
          tokenData.id,
          {
            ip: options.ipAddress,
            headers: { 'user-agent': options.userAgent }
          },
          {
            expectedFingerprint: storedFingerprint,
            actualFingerprint: providedFingerprint
          }
        );
        // REJECT the token - do not allow cross-device usage
        return null;
      }
    }

    // Token is valid - update last_used_at timestamp
    await query(
      'UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = $1',
      [tokenData.id]
    );

    return tokenData;
  } catch (error) {
    log.error('Error verifying refresh token', error);
    return null;
  }
}

/**
 * Refresh Access Token (Sliding Session with Rotation)
 *
 * Implements sliding sessions with automatic token rotation:
 *
 * 1. ACTIVE USER (timeSinceLastUse < ACTIVITY_EXTENSION_THRESHOLD):
 *    - Extends the SAME refresh token's expiry (sliding window)
 *    - No rotation, same token continues to be used
 *    - Minimizes token churn for actively engaged users
 *
 * 2. INACTIVE USER (timeSinceLastUse >= ACTIVITY_EXTENSION_THRESHOLD):
 *    - Revokes the old refresh token (marks revoked_at)
 *    - Generates a NEW refresh token
 *    - Old token can no longer be used (replay protection)
 *
 * Replay Protection: If an attacker tries to reuse a rotated token,
 * verifyRefreshToken will reject it because it's been revoked.
 *
 * @param {string} refreshToken - Current refresh token
 * @param {Object} deviceInfo - Device information for binding
 * @param {string} [deviceInfo.deviceFingerprint] - Browser fingerprint
 * @param {string} [deviceInfo.ipAddress] - Client IP address
 * @param {string} [deviceInfo.userAgent] - User agent string
 * @returns {Promise<Object|null>} Token pair or null if verification failed
 */
async function refreshAccessToken(refreshToken, deviceInfo = {}) {
  // Step 1: Verify the refresh token (handles replay detection, device binding, expiry)
  // If verification fails, we do NOT log or attempt rotation
  const tokenData = await verifyRefreshToken(refreshToken, deviceInfo);

  if (!tokenData) {
    // Token invalid, expired, revoked, or device mismatch - no logging here
    // (verifyRefreshToken already logged the specific failure reason)
    return null;
  }

  // Step 2: Load the user - token may be valid but user deleted
  const userResult = await query(
    'SELECT id, email, user_type as "userType" FROM users WHERE id = $1',
    [tokenData.user_id]
  );

  if (userResult.rows.length === 0) {
    // User no longer exists - revoke all their tokens for cleanup
    await revokeRefreshToken(refreshToken, 'user_deleted');
    return null;
  }

  const user = userResult.rows[0];

  // Step 3: Compute activity window for sliding session decision
  const lastUsed = new Date(tokenData.last_used_at);
  const now = new Date();
  const timeSinceLastUse = now - lastUsed;
  const isActiveUser = timeSinceLastUse < ACTIVITY_EXTENSION_THRESHOLD;

  let newRefreshToken;
  let newTokenId = tokenData.id;

  if (isActiveUser) {
    // ACTIVE: User is engaged - extend the same token (sliding window)
    // This avoids unnecessary token rotation for rapid API calls
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

    await query(
      'UPDATE refresh_tokens SET expires_at = $1, last_used_at = NOW() WHERE token = $2',
      [newExpiresAt, refreshToken]
    );

    newRefreshToken = refreshToken; // Reuse existing token
  } else {
    // INACTIVE: User was idle - rotate to a new token
    // Old token is revoked; if attacker tries to reuse it, they'll be rejected
    await revokeRefreshToken(refreshToken, 'rotation_after_inactivity');
    newRefreshToken = await generateRefreshToken(user, deviceInfo);

    // Look up the new token's ID for logging
    const newTokenResult = await query(
      'SELECT id FROM refresh_tokens WHERE token = $1',
      [newRefreshToken]
    );
    newTokenId = newTokenResult.rows[0]?.id || newTokenId;
  }

  // Step 4: Log the successful refresh (always log for successful refreshes)
  await securityLogger.logTokenRefreshed(
    user.id,
    tokenData.id,        // previousTokenId
    newTokenId,          // newTokenId (same if extended, different if rotated)
    {
      ip: deviceInfo.ipAddress,
      headers: { 'user-agent': deviceInfo.userAgent }
    },
    {
      activityExtended: isActiveUser,
      timeSinceLastUse: Math.floor(timeSinceLastUse / 1000) // seconds
    }
  );

  // Step 5: Always generate a fresh access token
  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60, // 15 minutes
    tokenType: 'Bearer',
    activityExtended: isActiveUser
  };
}

/**
 * Revoke Refresh Token
 *
 * @param {string} token - Refresh token to revoke
 * @returns {Promise<boolean>} True if revoked successfully
 */
async function revokeRefreshToken(token, reason = 'manual_revocation') {
  try {
    // Get token info before revoking
    const tokenResult = await query(
      'SELECT id, user_id FROM refresh_tokens WHERE token = $1',
      [token]
    );

    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1',
      [token]
    );

    // Log revocation if token existed
    if (tokenResult.rows.length > 0) {
      const tokenData = tokenResult.rows[0];
      await securityLogger.logTokenRevoked(
        tokenData.user_id,
        tokenData.id,
        reason,
        {
          timestamp: new Date().toISOString()
        }
      );
    }

    return true;
  } catch (error) {
    log.error('Error revoking refresh token', error);
    return false;
  }
}

/**
 * Revoke All User Tokens (Logout from all devices)
 *
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
async function revokeAllUserTokens(userId, reason = 'logout_all') {
  try {
    const result = await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );

    // Log mass revocation
    await securityLogger.logEvent(
      securityLogger.EVENT_TYPES.MASS_TOKEN_REVOCATION,
      securityLogger.SEVERITY.INFO,
      {
        userId,
        tokensRevoked: result.rowCount,
        reason,
        timestamp: new Date().toISOString()
      }
    );

    return result.rowCount;
  } catch (error) {
    log.error('Error revoking all user tokens', error);
    return 0;
  }
}

/**
 * Get User Active Sessions
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of active sessions
 */
async function getUserActiveSessions(userId) {
  try {
    const result = await query(
      `SELECT
        id,
        device_name,
        device_fingerprint,
        ip_address,
        created_at,
        last_used_at,
        expires_at
       FROM refresh_tokens
       WHERE user_id = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL
       ORDER BY last_used_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    log.error('Error getting user active sessions', error);
    return [];
  }
}

/**
 * Revoke Session by ID
 *
 * @param {string} sessionId - Session ID (refresh token ID)
 * @param {string} userId - User ID (for authorization)
 * @returns {Promise<boolean>} True if revoked successfully
 */
async function revokeSession(sessionId, userId) {
  try {
    const result = await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );
    return result.rowCount > 0;
  } catch (error) {
    log.error('Error revoking session', error);
    return false;
  }
}

/**
 * Cleanup Expired Tokens (Maintenance task)
 *
 * @returns {Promise<number>} Number of tokens cleaned up
 */
async function cleanupExpiredTokens() {
  try {
    const result = await query(
      "DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '7 days'"
    );
    log.info('Cleaned up expired refresh tokens', { count: result.rowCount });
    return result.rowCount;
  } catch (error) {
    log.error('Error cleaning up expired tokens', error);
    return 0;
  }
}


/**
 * Revoke an Access Token by JTI (Redis blacklist)
 *
 * Stores the jti in Redis with a TTL matching the remaining token lifetime
 * (max 15 minutes). Revoked tokens are rejected by authenticateToken middleware.
 *
 * @param {string} jti - The JWT ID to revoke
 * @returns {Promise<boolean>} True if stored successfully
 */
async function revokeToken(jti) {
  if (!jti) return false;
  try {
    // TTL matches access token expiry (15 minutes) to auto-clean
    const ttl = 15 * 60;
    return await cache.set(`revoked_token:${jti}`, '1', ttl);
  } catch (error) {
    log.error('Error revoking access token', error);
    return false;
  }
}

/**
 * Check if an Access Token JTI has been revoked
 *
 * @param {string} jti - The JWT ID to check
 * @returns {Promise<boolean>} True if the token is revoked
 */
async function isTokenRevoked(jti) {
  if (!jti) return false;
  try {
    const result = await cache.get(`revoked_token:${jti}`);
    return result !== null;
  } catch (error) {
    log.error('Error checking token revocation', error);
    // Fail open - if Redis is down, don't block all requests
    return false;
  }
}

// Export all functions
module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getUserActiveSessions,
  revokeSession,
  cleanupExpiredTokens,
  revokeToken,
  isTokenRevoked,

  // Constants for external use
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
  ACTIVITY_EXTENSION_THRESHOLD,
  MAX_SESSIONS_PER_USER
};
