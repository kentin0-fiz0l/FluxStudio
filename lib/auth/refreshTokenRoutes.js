/**
 * Refresh Token API Routes
 *
 * Endpoints:
 * - POST /api/auth/refresh - Refresh access token
 * - POST /api/auth/logout - Revoke refresh token (single device)
 * - POST /api/auth/logout-all - Revoke all tokens (all devices)
 * - GET /api/auth/sessions - Get active sessions
 * - DELETE /api/auth/sessions/:sessionId - Revoke specific session
 *
 * Part of: Week 1 Security Sprint - JWT Refresh Tokens
 * Date: 2025-10-14
 */

const express = require('express');
const router = express.Router();
const tokenService = require('./tokenService');
const { extractDeviceInfo } = require('./deviceFingerprint');
const { authenticateToken } = require('./middleware');

/**
 * POST /api/auth/refresh
 * Refresh Access Token
 *
 * Request Body:
 * {
 *   "refreshToken": "string"
 * }
 *
 * Response:
 * {
 *   "accessToken": "string",
 *   "refreshToken": "string",
 *   "expiresIn": 900,
 *   "tokenType": "Bearer"
 * }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'refreshToken is required'
      });
    }

    // Extract device information
    const deviceInfo = extractDeviceInfo(req);

    // Refresh the access token
    const tokens = await tokenService.refreshAccessToken(refreshToken, deviceInfo);

    if (!tokens) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is invalid, expired, or revoked'
      });
    }

    // Return new token pair
    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType,
      activityExtended: tokens.activityExtended
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout from Current Device
 *
 * Revokes the refresh token used in the request.
 *
 * Request Body:
 * {
 *   "refreshToken": "string"
 * }
 *
 * Response:
 * {
 *   "message": "Logged out successfully"
 * }
 */
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'refreshToken is required'
      });
    }

    // Revoke the refresh token
    const revoked = await tokenService.revokeRefreshToken(refreshToken);

    if (!revoked) {
      return res.status(400).json({
        error: 'Invalid refresh token',
        message: 'Token not found or already revoked'
      });
    }

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from All Devices
 *
 * Revokes all refresh tokens for the authenticated user.
 * Requires valid access token.
 *
 * Headers:
 * Authorization: Bearer <accessToken>
 *
 * Response:
 * {
 *   "message": "Logged out from all devices",
 *   "tokensRevoked": 5
 * }
 */
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Revoke all tokens for this user
    const tokensRevoked = await tokenService.revokeAllUserTokens(userId);

    res.json({
      message: 'Logged out from all devices',
      tokensRevoked
    });
  } catch (error) {
    console.error('Error logging out from all devices:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout from all devices'
    });
  }
});

/**
 * GET /api/auth/sessions
 * Get Active Sessions
 *
 * Returns list of active sessions for the authenticated user.
 * Requires valid access token.
 *
 * Headers:
 * Authorization: Bearer <accessToken>
 *
 * Response:
 * {
 *   "sessions": [
 *     {
 *       "id": "uuid",
 *       "deviceName": "Chrome 120 on macOS",
 *       "ipAddress": "192.168.1.0/24",
 *       "createdAt": "2025-10-14T...",
 *       "lastUsedAt": "2025-10-14T...",
 *       "expiresAt": "2025-10-21T...",
 *       "isCurrent": true
 *     }
 *   ]
 * }
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all active sessions
    const sessions = await tokenService.getUserActiveSessions(userId);

    // Determine which session is current (based on device fingerprint)
    const deviceInfo = extractDeviceInfo(req);
    const currentFingerprint = deviceInfo.deviceFingerprint;

    const sessionsWithStatus = sessions.map(session => ({
      id: session.id,
      deviceName: session.device_name,
      ipAddress: session.ip_address,
      createdAt: session.created_at,
      lastUsedAt: session.last_used_at,
      expiresAt: session.expires_at,
      isCurrent: session.device_fingerprint === currentFingerprint
    }));

    res.json({
      sessions: sessionsWithStatus
    });
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get sessions'
    });
  }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Revoke Specific Session
 *
 * Revokes a specific session by ID.
 * Requires valid access token.
 *
 * Headers:
 * Authorization: Bearer <accessToken>
 *
 * Response:
 * {
 *   "message": "Session revoked successfully"
 * }
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.sessionId;

    // Revoke the session
    const revoked = await tokenService.revokeSession(sessionId, userId);

    if (!revoked) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'Session not found or already revoked'
      });
    }

    res.json({
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to revoke session'
    });
  }
});

/**
 * GET /api/auth/token-info
 * Get Token Information (Debug endpoint)
 *
 * Returns information about the current access token.
 * Useful for debugging and testing.
 *
 * Headers:
 * Authorization: Bearer <accessToken>
 *
 * Response:
 * {
 *   "userId": "uuid",
 *   "email": "user@example.com",
 *   "userType": "client",
 *   "issuedAt": "2025-10-14T...",
 *   "expiresAt": "2025-10-14T...",
 *   "timeToExpiry": 840
 * }
 */
router.get('/token-info', authenticateToken, (req, res) => {
  try {
    const token = req.user;

    res.json({
      userId: token.id,
      email: token.email,
      userType: token.userType,
      issuedAt: new Date(token.iat * 1000).toISOString(),
      expiresAt: new Date(token.exp * 1000).toISOString(),
      timeToExpiry: token.exp - Math.floor(Date.now() / 1000)
    });
  } catch (error) {
    console.error('Error getting token info:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get token info'
    });
  }
});

module.exports = router;
