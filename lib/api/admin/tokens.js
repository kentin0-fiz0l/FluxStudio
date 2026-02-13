/**
 * Token Statistics API
 * Sprint 13, Day 5: Security Dashboard & Admin Endpoints
 *
 * Features:
 * - Token overview statistics
 * - Token search and filtering
 * - Manual token revocation
 * - Token lifecycle tracking
 * - Top users by token count
 *
 * Date: 2025-10-17
 */

const express = require('express');
const router = express.Router();
const adminAuth = require('../../../middleware/adminAuth');
const securityLogger = require('../../auth/securityLogger');
const fs = require('fs').promises;
const path = require('path');

const TOKENS_FILE = path.join(__dirname, '../../../refresh_tokens.json');
const SESSIONS_FILE = path.join(__dirname, '../../../user_sessions.json');

/**
 * Load tokens from file
 */
async function loadTokens() {
  try {
    const data = await fs.readFile(TOKENS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading tokens:', error);
    return [];
  }
}

/**
 * Save tokens to file
 */
async function saveTokens(tokens) {
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

/**
 * Load sessions from file
 */
async function loadSessions() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
}

/**
 * Get token overview statistics
 * GET /api/admin/tokens/stats
 */
router.get('/tokens/stats', adminAuth, async (req, res) => {
  try {
    const tokens = await loadTokens();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Calculate overview statistics
    const overview = {
      total: tokens.length,
      active: 0,
      expired: 0,
      revoked: 0
    };

    tokens.forEach(token => {
      const expiresAt = new Date(token.expiresAt).getTime();

      if (token.revoked) {
        overview.revoked++;
      } else if (expiresAt <= now) {
        overview.expired++;
      } else {
        overview.active++;
      }
    });

    // Calculate recent activity
    const recentActivity = {
      last24Hours: {
        created: 0,
        revoked: 0,
        expired: 0
      },
      last7Days: {
        created: 0,
        revoked: 0,
        expired: 0
      }
    };

    tokens.forEach(token => {
      const createdAt = new Date(token.createdAt).getTime();
      const expiresAt = new Date(token.expiresAt).getTime();

      // Last 24 hours
      if (createdAt > oneDayAgo) {
        recentActivity.last24Hours.created++;
      }
      if (token.revoked && new Date(token.revokedAt).getTime() > oneDayAgo) {
        recentActivity.last24Hours.revoked++;
      }
      if (!token.revoked && expiresAt <= now && expiresAt > oneDayAgo) {
        recentActivity.last24Hours.expired++;
      }

      // Last 7 days
      if (createdAt > sevenDaysAgo) {
        recentActivity.last7Days.created++;
      }
      if (token.revoked && new Date(token.revokedAt).getTime() > sevenDaysAgo) {
        recentActivity.last7Days.revoked++;
      }
      if (!token.revoked && expiresAt <= now && expiresAt > sevenDaysAgo) {
        recentActivity.last7Days.expired++;
      }
    });

    // Get top users
    const topUsers = getTopUsers(tokens);

    res.json({
      success: true,
      overview,
      recentActivity,
      topUsers
    });
  } catch (error) {
    console.error('Error getting token stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Helper: Get top users by token count
 */
function getTopUsers(tokens) {
  const userTokens = {};
  const now = Date.now();

  tokens.forEach(token => {
    const userId = token.userId;
    if (!userTokens[userId]) {
      userTokens[userId] = {
        userId,
        email: token.email || 'unknown',
        activeTokens: 0,
        totalTokens: 0,
        lastActivity: null
      };
    }

    userTokens[userId].totalTokens++;

    const isActive = new Date(token.expiresAt).getTime() > now && !token.revoked;
    if (isActive) {
      userTokens[userId].activeTokens++;
    }

    // Track last activity
    const tokenDate = new Date(token.createdAt).getTime();
    if (!userTokens[userId].lastActivity || tokenDate > new Date(userTokens[userId].lastActivity).getTime()) {
      userTokens[userId].lastActivity = token.createdAt;
    }
  });

  return Object.values(userTokens)
    .sort((a, b) => b.activeTokens - a.activeTokens)
    .slice(0, 10);
}

/**
 * Search tokens
 * GET /api/admin/tokens/search
 *
 * Query params:
 * - userId: Filter by user ID
 * - email: Filter by email (partial match)
 * - status: Filter by status (active, expired, revoked)
 * - ipAddress: Filter by IP address
 * - fromDate: Filter by creation date (ISO string)
 * - toDate: Filter by creation date (ISO string)
 * - page: Page number
 * - perPage: Items per page
 */
router.get('/tokens/search', adminAuth, async (req, res) => {
  try {
    const {
      userId,
      email,
      status,
      ipAddress,
      fromDate,
      toDate,
      page = 1,
      perPage = 50
    } = req.query;

    const tokens = await loadTokens();
    const now = Date.now();

    // Filter tokens
    let filteredTokens = tokens.filter(token => {
      // User ID filter
      if (userId && token.userId !== userId) return false;

      // Email filter (partial match)
      if (email && token.email && !token.email.toLowerCase().includes(email.toLowerCase())) {
        return false;
      }

      // Status filter
      if (status) {
        const expiresAt = new Date(token.expiresAt).getTime();
        const isActive = expiresAt > now && !token.revoked;
        const isExpired = expiresAt <= now && !token.revoked;
        const isRevoked = token.revoked;

        if (status === 'active' && !isActive) return false;
        if (status === 'expired' && !isExpired) return false;
        if (status === 'revoked' && !isRevoked) return false;
      }

      // IP address filter
      if (ipAddress && token.ipAddress !== ipAddress) return false;

      // Date range filter
      const createdAt = new Date(token.createdAt).getTime();
      if (fromDate && createdAt < new Date(fromDate).getTime()) return false;
      if (toDate && createdAt > new Date(toDate).getTime()) return false;

      return true;
    });

    // Sort by creation date (newest first)
    filteredTokens.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Paginate
    const pageNum = Math.max(1, parseInt(page));
    const perPageNum = Math.min(100, Math.max(1, parseInt(perPage)));
    const total = filteredTokens.length;
    const totalPages = Math.ceil(total / perPageNum);
    const start = (pageNum - 1) * perPageNum;
    const paginatedTokens = filteredTokens.slice(start, start + perPageNum);

    // Format tokens (hide sensitive data)
    const formattedTokens = paginatedTokens.map(token => ({
      id: token.id || token.token.substring(0, 16) + '...',
      userId: token.userId,
      email: token.email,
      sessionId: token.sessionId,
      ipAddress: token.ipAddress,
      userAgent: token.userAgent ? token.userAgent.substring(0, 100) : null,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      revoked: token.revoked || false,
      revokedAt: token.revokedAt,
      revokedBy: token.revokedBy,
      revocationReason: token.revocationReason
    }));

    res.json({
      success: true,
      tokens: formattedTokens,
      pagination: {
        page: pageNum,
        perPage: perPageNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error searching tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get token lifecycle details
 * GET /api/admin/tokens/:tokenId
 */
router.get('/tokens/:tokenId', adminAuth, async (req, res) => {
  try {
    const { tokenId } = req.params;
    const tokens = await loadTokens();

    // Find token
    const token = tokens.find(t =>
      t.id === tokenId ||
      t.token === tokenId ||
      t.token.startsWith(tokenId)
    );

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    const now = Date.now();
    const expiresAt = new Date(token.expiresAt).getTime();
    const isActive = expiresAt > now && !token.revoked;

    // Get associated session
    const sessions = await loadSessions();
    const session = sessions.find(s => s.id === token.sessionId);

    // Format response
    const details = {
      token: {
        id: token.id || token.token.substring(0, 16) + '...',
        userId: token.userId,
        email: token.email,
        sessionId: token.sessionId,
        ipAddress: token.ipAddress,
        userAgent: token.userAgent,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
        status: isActive ? 'active' : (token.revoked ? 'revoked' : 'expired')
      },
      revocation: token.revoked ? {
        revokedAt: token.revokedAt,
        revokedBy: token.revokedBy,
        reason: token.revocationReason
      } : null,
      session: session ? {
        id: session.id,
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt
      } : null,
      lifecycle: {
        age: Math.floor((now - new Date(token.createdAt).getTime()) / 1000),
        timeToExpiry: isActive ? Math.floor((expiresAt - now) / 1000) : 0,
        usageCount: token.usageCount || 0
      }
    };

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Error getting token details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Revoke token manually
 * POST /api/admin/tokens/:tokenId/revoke
 *
 * Body:
 * - reason: Reason for revocation (required)
 * - revokeAll: Revoke all user tokens (optional)
 */
router.post('/tokens/:tokenId/revoke', adminAuth, async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { reason, revokeAll } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Revocation reason is required'
      });
    }

    const tokens = await loadTokens();

    // Find token
    const tokenIndex = tokens.findIndex(t =>
      t.id === tokenId ||
      t.token === tokenId ||
      t.token.startsWith(tokenId)
    );

    if (tokenIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    const token = tokens[tokenIndex];

    // Check if already revoked
    if (token.revoked) {
      return res.status(400).json({
        success: false,
        message: 'Token already revoked'
      });
    }

    let revokedCount = 0;

    if (revokeAll) {
      // Revoke all tokens for this user
      tokens.forEach((t, index) => {
        if (t.userId === token.userId && !t.revoked) {
          tokens[index].revoked = true;
          tokens[index].revokedAt = new Date().toISOString();
          tokens[index].revokedBy = req.user.id;
          tokens[index].revocationReason = `${reason} (batch revocation)`;
          revokedCount++;
        }
      });
    } else {
      // Revoke single token
      tokens[tokenIndex].revoked = true;
      tokens[tokenIndex].revokedAt = new Date().toISOString();
      tokens[tokenIndex].revokedBy = req.user.id;
      tokens[tokenIndex].revocationReason = reason;
      revokedCount = 1;
    }

    await saveTokens(tokens);

    // Log admin action
    await securityLogger.logEvent('token_revoked_manually', 'MEDIUM', {
      tokenId: token.id || tokenId,
      userId: token.userId,
      email: token.email,
      adminId: req.user.id,
      adminEmail: req.user.email,
      adminRole: req.user.role,
      reason,
      revokeAll: revokeAll || false,
      revokedCount
    });

    res.json({
      success: true,
      message: 'Token(s) revoked successfully',
      revokedCount
    });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get token statistics by time period
 * GET /api/admin/tokens/analytics
 *
 * Query params:
 * - period: Time period (24h, 7d, 30d, 90d)
 * - groupBy: Group by (hour, day, week)
 */
router.get('/tokens/analytics', adminAuth, async (req, res) => {
  try {
    const { period = '7d', groupBy = 'day' } = req.query;

    const tokens = await loadTokens();
    const now = Date.now();

    // Determine time range
    const periodMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }[period] || 7 * 24 * 60 * 60 * 1000;

    const startTime = now - periodMs;

    // Group tokens by time period
    const groupMs = {
      'hour': 60 * 60 * 1000,
      'day': 24 * 60 * 60 * 1000,
      'week': 7 * 24 * 60 * 60 * 1000
    }[groupBy] || 24 * 60 * 60 * 1000;

    const analytics = {};

    tokens.forEach(token => {
      const createdAt = new Date(token.createdAt).getTime();
      if (createdAt < startTime) return;

      // Calculate bucket
      const bucket = Math.floor((createdAt - startTime) / groupMs);
      const bucketStart = startTime + (bucket * groupMs);
      const bucketKey = new Date(bucketStart).toISOString();

      if (!analytics[bucketKey]) {
        analytics[bucketKey] = {
          timestamp: bucketKey,
          created: 0,
          revoked: 0,
          expired: 0,
          active: 0
        };
      }

      analytics[bucketKey].created++;

      // Check current status
      const expiresAt = new Date(token.expiresAt).getTime();
      if (token.revoked) {
        analytics[bucketKey].revoked++;
      } else if (expiresAt <= now) {
        analytics[bucketKey].expired++;
      } else {
        analytics[bucketKey].active++;
      }
    });

    // Convert to array and sort
    const analyticsArray = Object.values(analytics).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    res.json({
      success: true,
      period,
      groupBy,
      analytics: analyticsArray
    });
  } catch (error) {
    console.error('Error getting token analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
