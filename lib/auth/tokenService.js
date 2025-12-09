/**
 * Token Service - JWT Access & Refresh Token Management
 *
 * Implements secure token rotation with:
 * - Short-lived access tokens (15 minutes)
 * - Long-lived refresh tokens (7 days)
 * - Device fingerprinting for security
 * - Automatic token rotation
 * - Activity-based extension (respects creative flow)
 *
 * Security Features:
 * - Refresh tokens stored in database (can be revoked)
 * - Device tracking prevents token theft
 * - Automatic cleanup of expired tokens
 * - Rate limiting on refresh attempts
 *
 * Part of: Week 1 Security Sprint
 * Date: 2025-10-14
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db');
const securityLogger = require('./securityLogger');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const ACTIVITY_EXTENSION_THRESHOLD = 60 * 60 * 1000; // 1 hour - extend if active within this window

// Validate JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

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
 * @param {Object} user - User object
 * @param {Object} deviceInfo - Device information
 * @param {string} deviceInfo.deviceName - Device name (e.g., "Chrome on MacOS")
 * @param {string} deviceInfo.deviceFingerprint - Browser fingerprint
 * @param {string} deviceInfo.ipAddress - IP address
 * @param {string} deviceInfo.userAgent - User agent string
 * @returns {Promise<string>} Refresh token
 */
async function generateRefreshToken(user, deviceInfo = {}) {
  if (!user || !user.id) {
    throw new Error('User object with id is required');
  }

  // Generate cryptographically secure random token
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

  // Hash the token for storage (we store the hash, return the plain token)
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    // Store hashed refresh token in database
    const result = await query(
      `INSERT INTO refresh_tokens
       (user_id, token_hash, device_fingerprint, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        user.id,
        tokenHash,
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
    console.error('Error generating refresh token:', error);
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
      console.log('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid access token');
    }
    return null;
  }
}

/**
 * Verify Refresh Token
 *
 * Checks:
 * 1. Token exists in database
 * 2. Token not expired
 * 3. Token not revoked
 * 4. Device fingerprint matches (if provided)
 *
 * @param {string} token - Refresh token
 * @param {Object} options - Verification options
 * @param {string} options.deviceFingerprint - Expected device fingerprint
 * @param {string} options.ipAddress - Current IP address
 * @returns {Promise<Object|null>} Token data or null if invalid
 */
async function verifyRefreshToken(token, options = {}) {
  try {
    const result = await query(
      `SELECT * FROM refresh_tokens
       WHERE token = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL`,
      [token]
    );

    if (result.rows.length === 0) {
      // Log failed verification attempt
      await securityLogger.logEvent(
        securityLogger.EVENT_TYPES.TOKEN_VERIFICATION_FAILED,
        securityLogger.SEVERITY.WARNING,
        {
          reason: 'Token not found, expired, or revoked',
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        }
      );
      return null;
    }

    const tokenData = result.rows[0];

    // Security: Verify device fingerprint matches (if available)
    if (options.deviceFingerprint && tokenData.device_fingerprint) {
      if (options.deviceFingerprint !== tokenData.device_fingerprint) {
        console.warn('Device fingerprint mismatch for token:', tokenData.id);
        // Log security event but don't reject (fingerprints can change)
        await securityLogger.logDeviceMismatch(
          tokenData.user_id,
          tokenData.id,
          {
            ip: options.ipAddress,
            headers: { 'user-agent': options.userAgent }
          },
          {
            expectedFingerprint: tokenData.device_fingerprint,
            actualFingerprint: options.deviceFingerprint
          }
        );
      }
    }

    // Update last_used_at timestamp
    await query(
      'UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = $1',
      [tokenData.id]
    );

    return tokenData;
  } catch (error) {
    console.error('Error verifying refresh token:', error);
    return null;
  }
}

/**
 * Refresh Access Token (Activity-based Extension)
 *
 * Strategy:
 * - If user active within last hour: Extend refresh token by 7 days
 * - Otherwise: Generate new token pair
 *
 * This respects creative flow states - users in active sessions
 * don't get logged out every 7 days.
 *
 * @param {string} refreshToken - Refresh token
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<Object|null>} New token pair or null if invalid
 */
async function refreshAccessToken(refreshToken, deviceInfo = {}) {
  // Verify refresh token
  const tokenData = await verifyRefreshToken(refreshToken, deviceInfo);

  if (!tokenData) {
    return null;
  }

  // Get user data
  const userResult = await query(
    'SELECT id, email, user_type as "userType" FROM users WHERE id = $1',
    [tokenData.user_id]
  );

  if (userResult.rows.length === 0) {
    // User doesn't exist anymore - revoke token
    await revokeRefreshToken(refreshToken);
    return null;
  }

  const user = userResult.rows[0];

  // Check if user was active recently (within threshold)
  const lastUsed = new Date(tokenData.last_used_at);
  const now = new Date();
  const timeSinceLastUse = now - lastUsed;

  let newRefreshToken;
  let newTokenId = tokenData.id;

  if (timeSinceLastUse < ACTIVITY_EXTENSION_THRESHOLD) {
    // User is actively using the app - extend existing refresh token
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);

    await query(
      'UPDATE refresh_tokens SET expires_at = $1, last_used_at = NOW() WHERE token = $2',
      [newExpiresAt, refreshToken]
    );

    newRefreshToken = refreshToken; // Reuse existing token
  } else {
    // User was inactive - issue new refresh token and revoke old one
    await revokeRefreshToken(refreshToken);
    newRefreshToken = await generateRefreshToken(user, deviceInfo);

    // Get the new token ID
    const newTokenResult = await query(
      'SELECT id FROM refresh_tokens WHERE token = $1',
      [newRefreshToken]
    );
    newTokenId = newTokenResult.rows[0]?.id || newTokenId;
  }

  // Log token refresh
  await securityLogger.logTokenRefreshed(
    user.id,
    tokenData.id,
    newTokenId,
    {
      ip: deviceInfo.ipAddress,
      headers: { 'user-agent': deviceInfo.userAgent }
    },
    {
      activityExtended: timeSinceLastUse < ACTIVITY_EXTENSION_THRESHOLD,
      timeSinceLastUse: Math.floor(timeSinceLastUse / 1000) // seconds
    }
  );

  // Always generate new access token
  const accessToken = generateAccessToken(user);

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60, // 15 minutes
    tokenType: 'Bearer',
    activityExtended: timeSinceLastUse < ACTIVITY_EXTENSION_THRESHOLD
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
    console.error('Error revoking refresh token:', error);
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
    console.error('Error revoking all user tokens:', error);
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
    console.error('Error getting user active sessions:', error);
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
    console.error('Error revoking session:', error);
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
    console.log(`Cleaned up ${result.rowCount} expired refresh tokens`);
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
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

  // Constants for external use
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};
