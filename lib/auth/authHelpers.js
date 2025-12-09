/**
 * Authentication Helpers
 *
 * Helper functions to integrate Week 1 Security Sprint token system
 * with existing auth endpoints.
 *
 * Part of: Week 2 Security Sprint
 * Date: 2025-10-15
 */

const tokenService = require('./tokenService');
const { extractDeviceInfo } = require('./deviceFingerprint');

/**
 * Generate authentication response with token pair
 *
 * This replaces the old generateToken() function with the new
 * tokenService that generates both access and refresh tokens.
 *
 * @param {Object} user - User object
 * @param {Object} req - Express request object (for device info)
 * @returns {Promise<Object>} Auth response with tokens
 */
async function generateAuthResponse(user, req) {
  // Extract device information from request
  const deviceInfo = extractDeviceInfo(req);

  // Generate token pair (access + refresh)
  const tokens = await tokenService.generateTokenPair(user, deviceInfo);

  // Return user data without sensitive fields (FluxStudio and MetMap compatible)
  const { password, passwordHash, googleId, ...userWithoutPassword } = user;

  return {
    // Legacy field for backward compatibility (access token)
    token: tokens.accessToken,

    // New Week 1 fields
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn, // 900 seconds (15 minutes)
    tokenType: tokens.tokenType, // "Bearer"

    // User data
    user: userWithoutPassword
  };
}

/**
 * Verify token and get user data
 *
 * This can verify both old-style tokens and new access tokens.
 *
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded token or null if invalid
 */
function verifyToken(token) {
  return tokenService.verifyAccessToken(token);
}

module.exports = {
  generateAuthResponse,
  verifyToken
};
